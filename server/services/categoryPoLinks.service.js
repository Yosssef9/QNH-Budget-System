import { ApiError } from "../utils/apiError.js";
import { withTransaction } from "../database/transaction.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
import { queueNotification } from "./notification.service.js";
import { findCategoryByCodeOrNameRepo } from "../repositories/categoryReviews.repository.js";
import { getPreClosingFinancialYearRepo } from "../repositories/categoryTransfers.repository.js";
import {
  approveCategoryPoLinkRepo,
  createCategoryPoLinkRepo,
  findPendingCategoryPoLinkRepo,
  getAvailableCategoryPurchaseInvoiceLinesRepo,
  getCategoryPoLinkDetailsRepo,
  getCategoryPoLinksRepo,
  getCategoryReviewSubItemAllocationSummaryRepo,
  getCategoryReviewSubItemLineByIdRepo,
  getEligibleCategoryPoSubItemsRepo,
  getPurchaseInvoiceAllocationSummaryRepo,
  getPurchaseInvoiceLineByIdRepo,
  getSuggestedCategoryPurchaseInvoiceLinesRepo,
  learnPOSubItemMappingFromApprovedLinkRepo,
  rejectCategoryPoLinkRepo,
} from "../repositories/categoryPoLinks.repository.js";

function normalizeCategoryCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "BIOMEDICAL") return "BIOMEDICAL";
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "IT") return "IT";

  return normalized;
}

async function resolveCategoryPoScope(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type !== "CATEGORY_BUDGET_MANAGEMENT") {
    throw new ApiError(
      403,
      "Switch to a Category Budget Management Workspace to manage PO links",
      "INVALID_WORKSPACE",
    );
  }

  const categoryName = activeWorkspace?.category;

  if (!categoryName) {
    throw new ApiError(
      403,
      "No category scope found for the active workspace",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  const category = await findCategoryByCodeOrNameRepo(
    normalizeCategoryCode(categoryName),
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category scope was not found in budget categories",
      "CATEGORY_SCOPE_NOT_FOUND",
    );
  }

  return category;
}

function assertPoApprovalAccess(budgetAccess) {
  const hasApprovalPermission =
    budgetAccess?.activeWorkspace?.permissions?.can_approve_po_links ||
    budgetAccess?.permissions?.can_approve_po_links;

  if (!hasApprovalPermission) {
    throw new ApiError(
      403,
      "PO Link Approval permission is required",
      "PO_LINK_APPROVAL_PERMISSION_REQUIRED",
    );
  }
}

function assertApprovedSubItemLine(line) {
  if (!line) {
    throw new ApiError(
      404,
      "Approved sub-item line not found",
      "SUB_ITEM_LINE_NOT_FOUND",
    );
  }

  if (!line.is_active) {
    throw new ApiError(
      409,
      "Inactive sub-item lines cannot be linked to PO records",
      "SUB_ITEM_LINE_INACTIVE",
    );
  }

  if (line.financial_year_status !== "PRE_CLOSING") {
    throw new ApiError(
      409,
      "PO Linking is only allowed during PRE-CLOSING",
      "FINANCIAL_YEAR_NOT_PRE_CLOSING",
    );
  }

  if (
    line.package_status !== "APPROVED" ||
    line.category_review_status !== "APPROVED" ||
    line.cfo_review_status !== "APPROVED"
  ) {
    throw new ApiError(
      409,
      "Only fully approved sub-item lines can be linked to PO records",
      "SUB_ITEM_LINE_NOT_APPROVED",
    );
  }
}

export async function getAvailableCategoryPOsService(filters = {}) {
  return getAvailableCategoryPurchaseInvoiceLinesRepo(filters);
}

export async function getEligibleCategoryPoSubItemsService({ budgetAccess }) {
  const category = await resolveCategoryPoScope(budgetAccess);
  const financialYear = await getPreClosingFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      404,
      "No PRE-CLOSING financial year found",
      "PRE_CLOSING_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  const items = await getEligibleCategoryPoSubItemsRepo({
    financialYearId: financialYear.id,
    categoryId: category.id,
  });

  return {
    financialYear,
    category,
    items,
  };
}

export async function getCategoryPOSuggestionsService({
  lineId,
  budgetAccess,
}) {
  const category = await resolveCategoryPoScope(budgetAccess);
  const line = await getCategoryReviewSubItemLineByIdRepo(lineId);

  assertApprovedSubItemLine(line);

  if (Number(line.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot view PO suggestions for another category",
      "FORBIDDEN",
    );
  }

  return getSuggestedCategoryPurchaseInvoiceLinesRepo({ lineId });
}

export async function createCategoryPoLinkService({
  payload,
  user,
  budgetAccess,
}) {
  const data = await withTransaction(async (transaction) => {
    const category = await resolveCategoryPoScope(budgetAccess);
    const [po, line] = await Promise.all([
      getPurchaseInvoiceLineByIdRepo(payload.purchaseInvoiceLineId, transaction),
      getCategoryReviewSubItemLineByIdRepo(
        payload.categoryTypeReviewSubItemId,
        transaction,
      ),
    ]);

    if (!po) {
      throw new ApiError(404, "PO record not found", "PO_RECORD_NOT_FOUND");
    }

    assertApprovedSubItemLine(line);

    if (Number(line.category_id) !== Number(category.id)) {
      throw new ApiError(
        403,
        "PO links must stay within your active category workspace",
        "CATEGORY_SCOPE_MISMATCH",
      );
    }

    const existingPending = await findPendingCategoryPoLinkRepo({
      purchaseInvoiceLineId: payload.purchaseInvoiceLineId,
      categoryTypeReviewSubItemId: payload.categoryTypeReviewSubItemId,
      transaction,
    });

    if (existingPending) {
      throw new ApiError(
        409,
        "A pending PO link already exists for this PO and sub-item line",
        "PENDING_PO_LINK_EXISTS",
      );
    }

    const poAllocation = await getPurchaseInvoiceAllocationSummaryRepo(
      payload.purchaseInvoiceLineId,
      transaction,
    );

    if (Number(payload.requestedQty) > Number(poAllocation?.available_qty || 0)) {
      throw new ApiError(
        400,
        `Requested quantity exceeds available PO quantity. Available quantity is ${poAllocation?.available_qty || 0}`,
        "PO_QUANTITY_EXCEEDED",
      );
    }

    const subItemAllocation =
      await getCategoryReviewSubItemAllocationSummaryRepo(
        payload.categoryTypeReviewSubItemId,
        transaction,
      );

    if (
      Number(payload.requestedQty) >
      Number(subItemAllocation?.remaining_qty || 0)
    ) {
      throw new ApiError(
        400,
        `Requested quantity exceeds remaining sub-item quantity. Remaining quantity is ${subItemAllocation?.remaining_qty || 0}`,
        "SUB_ITEM_QUANTITY_EXCEEDED",
      );
    }

    const linkedAmount = Number(payload.requestedQty) * Number(po.unit_cost || 0);

    const poLink = await createCategoryPoLinkRepo({
      purchaseInvoiceLineId: payload.purchaseInvoiceLineId,
      categoryTypeReviewSubItemId: payload.categoryTypeReviewSubItemId,
      requestedQty: payload.requestedQty,
      unitCost: po.unit_cost || 0,
      linkedAmount,
      requestedBy: user.userId,
      transaction,
    });

    return {
      poLink,
      po,
      line,
      category,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_PO_LINK_SUBMITTED,
    entityType: "CATEGORY_PO_LINK",
    entityId: data.poLink.id,
    payload: {
      poLinkId: data.poLink.id,
      categoryName: data.category.name,
      budgetTypeName: data.line.budget_type_name,
      subItemName: data.line.sub_item_name_snapshot,
      itemDescription: data.po.item_description,
      requestedQuantity: data.poLink.requested_qty,
      requestedBy: user.userName,
    },
  });

  return data.poLink;
}

export async function getMyCategoryPoLinksService({ status, user, budgetAccess }) {
  const category = await resolveCategoryPoScope(budgetAccess);

  return getCategoryPoLinksRepo({
    status,
    requestedBy: user.userId,
    categoryId: category.id,
  });
}

export async function getCategoryPoLinksForApprovalService({
  status,
  budgetAccess,
}) {
  assertPoApprovalAccess(budgetAccess);

  return getCategoryPoLinksRepo({
    status,
  });
}

export async function getCategoryPoLinkByIdService({ poLinkId, budgetAccess }) {
  const poLink = await getCategoryPoLinkDetailsRepo(poLinkId);

  if (!poLink) {
    throw new ApiError(404, "PO Link request not found", "PO_LINK_NOT_FOUND");
  }

  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type === "CATEGORY_BUDGET_MANAGEMENT") {
    const category = await resolveCategoryPoScope(budgetAccess);

    if (Number(poLink.category_id) !== Number(category.id)) {
      throw new ApiError(
        403,
        "You cannot view PO links for another category",
        "FORBIDDEN",
      );
    }
  } else if (
    !budgetAccess?.permissions?.can_view_po_links &&
    !budgetAccess?.permissions?.can_approve_po_links
  ) {
    throw new ApiError(
      403,
      "PO Link view or approval permission is required",
      "PO_LINK_VIEW_PERMISSION_REQUIRED",
    );
  }

  return poLink;
}

export async function approveCategoryPoLinkService({
  poLinkId,
  user,
  budgetAccess,
}) {
  assertPoApprovalAccess(budgetAccess);

  const data = await withTransaction(async (transaction) => {
    const poLink = await getCategoryPoLinkDetailsRepo(poLinkId, transaction);

    if (!poLink) {
      throw new ApiError(404, "PO Link request not found", "PO_LINK_NOT_FOUND");
    }

    if (poLink.status !== "PENDING") {
      throw new ApiError(
        409,
        "Only pending PO Link requests can be approved",
        "PO_LINK_NOT_PENDING",
      );
    }

    const line = await getCategoryReviewSubItemLineByIdRepo(
      poLink.category_type_review_sub_item_id,
      transaction,
    );

    assertApprovedSubItemLine(line);

    const requestedQty = Number(poLink.requested_qty || 0);
    const poAllocation = await getPurchaseInvoiceAllocationSummaryRepo(
      poLink.purchase_invoice_line_id,
      transaction,
    );
    const availablePOQty = Number(poAllocation?.available_qty || 0) + requestedQty;

    if (requestedQty > availablePOQty) {
      throw new ApiError(
        400,
        `PO quantity is no longer available. Available quantity is ${availablePOQty}`,
        "PO_QUANTITY_EXCEEDED",
      );
    }

    const subItemAllocation =
      await getCategoryReviewSubItemAllocationSummaryRepo(
        poLink.category_type_review_sub_item_id,
        transaction,
      );
    const remainingSubItemQty =
      Number(subItemAllocation?.remaining_qty || 0) + requestedQty;

    if (requestedQty > remainingSubItemQty) {
      throw new ApiError(
        400,
        `Sub-item quantity is no longer available. Remaining quantity is ${remainingSubItemQty}`,
        "SUB_ITEM_QUANTITY_EXCEEDED",
      );
    }

    const approved = await approveCategoryPoLinkRepo({
      poLinkId,
      approvedBy: user.userId,
      transaction,
    });

    if (!approved) {
      throw new ApiError(
        409,
        "PO Link request is no longer pending",
        "PO_LINK_APPROVAL_FAILED",
      );
    }

    await learnPOSubItemMappingFromApprovedLinkRepo({
      poLinkId,
      userId: user.userId,
      transaction,
    });

    return {
      approved,
      original: poLink,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_PO_LINK_APPROVED,
    entityType: "CATEGORY_PO_LINK",
    entityId: poLinkId,
    payload: {
      poLinkId,
      categoryPoLinkId: poLinkId,
      subItemName: data.original.sub_item_name_snapshot,
      approvedBy: user.userName,
    },
  });

  return data.approved;
}

export async function rejectCategoryPoLinkService({
  poLinkId,
  payload,
  user,
  budgetAccess,
}) {
  assertPoApprovalAccess(budgetAccess);

  const data = await withTransaction(async (transaction) => {
    const poLink = await getCategoryPoLinkDetailsRepo(poLinkId, transaction);

    if (!poLink) {
      throw new ApiError(404, "PO Link request not found", "PO_LINK_NOT_FOUND");
    }

    if (poLink.status !== "PENDING") {
      throw new ApiError(
        409,
        "Only pending PO Link requests can be rejected",
        "PO_LINK_NOT_PENDING",
      );
    }

    const rejected = await rejectCategoryPoLinkRepo({
      poLinkId,
      rejectedBy: user.userId,
      reason: payload.reason,
      transaction,
    });

    if (!rejected) {
      throw new ApiError(
        409,
        "PO Link request is no longer pending",
        "PO_LINK_REJECTION_FAILED",
      );
    }

    return {
      rejected,
      original: poLink,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_PO_LINK_REJECTED,
    entityType: "CATEGORY_PO_LINK",
    entityId: poLinkId,
    payload: {
      poLinkId,
      categoryPoLinkId: poLinkId,
      subItemName: data.original.sub_item_name_snapshot,
      reason: payload.reason,
      rejectedBy: user.userName,
    },
  });

  return data.rejected;
}
