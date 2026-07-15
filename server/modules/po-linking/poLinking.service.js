import {
  hasAnyPermission,
  hasPermission,
  PERMISSION_CODES,
} from "../../../shared/permissions/permissionCodes.js";
import {
  buildPackageItemOverallAveragePriceIntelligence,
  buildPriceIntelligence,
} from "../../helpers/priceIntelligence.helper.js";
import { withTransaction } from "../../database/transaction.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import { ApiError } from "../../utils/apiError.js";
import { createWorkflowHistoryRepo } from "../category-packages/categoryPackages.repository.js";
import {
  PO_LINK_PERMISSIONS,
  PO_LINK_STATUS,
  PO_LINK_WORKFLOW_ACTIONS,
} from "./poLinking.constants.js";
import {
  approvePOLinkRepo,
  createManualPOCatalogMappingRepo,
  createPOLinkRepo,
  findPendingPOLinkRepo,
  findPOCatalogMappingByIdRepo,
  findPOCatalogMappingBySubItemAndCodeRepo,
  getAvailablePurchaseInvoiceLinesRepo,
  getMyPOLinksRepo,
  getPackageSubItemBalanceRepo,
  getPackageSubItemContextRepo,
  getPackageSubItemPOLinksRepo,
  getPackageSubItemPriceIntelligenceDetailsRepo,
  getPOAllocationHistoryRepo,
  getPOAllocationSummaryRepo,
  getPOCatalogMappingsRepo,
  getPOLinkDetailsRepo,
  getPOLinksForApprovalRepo,
  getPurchaseInvoiceLineByIdRepo,
  getSuggestedPurchaseInvoiceLinesRepo,
  learnPOCatalogMappingFromApprovedLinkRepo,
  listPackageSubItemsForPoLinkingRepo,
  rejectPOLinkRepo,
  searchCatalogSubItemsForMappingRepo,
  searchPOItemsForMappingRepo,
  setPOCatalogMappingStatusRepo,
} from "./poLinking.repository.js";
import {
  mapPackageSubItem,
  mapPoLink,
  mapPoMapping,
  mapPurchaseInvoiceLine,
} from "./poLinking.mapper.js";

function getActorRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getCategoryId(budgetAccess) {
  return (
    budgetAccess?.budgetCategory?.id ??
    budgetAccess?.category?.id ??
    budgetAccess?.budgetCategoryId ??
    budgetAccess?.categoryId ??
    budgetAccess?.budget_category_id ??
    budgetAccess?.selectedWorkspace?.budgetCategory?.id ??
    budgetAccess?.selectedWorkspace?.category?.id ??
    budgetAccess?.selectedWorkspace?.budgetCategoryId ??
    budgetAccess?.selectedWorkspace?.categoryId ??
    null
  );
}

function assertPermission(budgetAccess, permission, message) {
  if (!hasPermission(budgetAccess, permission)) {
    throw new ApiError(403, message, "PO_LINK_PERMISSION_DENIED");
  }
}

function assertAnyPermission(budgetAccess, permissions, message) {
  if (!hasAnyPermission(budgetAccess, permissions)) {
    throw new ApiError(403, message, "PO_LINK_PERMISSION_DENIED");
  }
}

function parseMappedItemCodes(value) {
  if (!value) return [];

  return String(value)
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

function assertCategoryScope(budgetAccess) {
  const categoryId = getCategoryId(budgetAccess);
  if (!categoryId) {
    throw new ApiError(
      403,
      "Category workspace is required for PO linking",
      "PO_LINK_CATEGORY_SCOPE_REQUIRED",
    );
  }
  return Number(categoryId);
}

function assertPreClosing(context) {
  if (context.financial_year_status !== "PRE_CLOSING") {
    throw new ApiError(
      400,
      "PO linking is allowed only after the financial year reaches PRE_CLOSING",
      "PO_LINK_YEAR_NOT_PRE_CLOSING",
    );
  }
}

function assertPackageReady(context) {
  if (context.package_status !== "CFO_REVIEW_COMPLETED") {
    throw new ApiError(
      400,
      "PO linking is allowed only for CFO-completed category packages",
      "PO_LINK_PACKAGE_NOT_COMPLETED",
    );
  }
}

function assertRequesterScope(context, categoryId) {
  if (Number(context.budget_category_id) !== Number(categoryId)) {
    throw new ApiError(
      403,
      "You cannot link PO records for another category package",
      "PO_LINK_CATEGORY_SCOPE_DENIED",
    );
  }
}

function assertPoEligible(po) {
  const status = String(po?.po_status_name || "").toUpperCase();
  if (
    status.includes("DRAFT") ||
    status.includes("PENDING") ||
    status.includes("CANCEL") ||
    status.includes("REJECT")
  ) {
    throw new ApiError(
      400,
      "This PO line is not eligible for linking",
      "PO_LINE_NOT_ELIGIBLE",
    );
  }
}

function getAvailableWithCurrent(summary, currentQty = 0) {
  return Number(summary?.available_qty || 0) + Number(currentQty || 0);
}

function getRequestUserRoleId(budgetAccess) {
  const userRoleId = getActorRoleId(budgetAccess);
  if (!userRoleId) {
    throw new ApiError(
      403,
      "Active budget workspace is required",
      "PO_LINK_WORKSPACE_REQUIRED",
    );
  }
  return Number(userRoleId);
}

async function getVisiblePoLink(id, user, budgetAccess) {
  const link = await getPOLinkDetailsRepo(id);
  if (!link) {
    throw new ApiError(404, "PO link request not found");
  }

  if (Number(link.requested_by) === Number(user.userId)) return link;

  if (hasPermission(budgetAccess, PO_LINK_PERMISSIONS.VIEW_ALL)) return link;

  if (
    hasPermission(budgetAccess, PO_LINK_PERMISSIONS.APPROVE) ||
    hasPermission(budgetAccess, PO_LINK_PERMISSIONS.VIEW_ASSIGNED)
  ) {
    const categoryId = getCategoryId(budgetAccess);
    if (categoryId && Number(link.budget_category_id) === Number(categoryId)) {
      return link;
    }
  }

  throw new ApiError(403, "You are not allowed to view this PO link");
}

export async function getAvailablePOsService(filters = {}) {
  const rows = await getAvailablePurchaseInvoiceLinesRepo(filters);
  return rows.map(mapPurchaseInvoiceLine);
}

export async function getPOBudgetItemsService({ budgetAccess }) {
  assertPermission(
    budgetAccess,
    PO_LINK_PERMISSIONS.REQUEST,
    "You do not have permission to request category PO links",
  );

  const categoryId = assertCategoryScope(budgetAccess);
  const rows = await listPackageSubItemsForPoLinkingRepo({
    budgetCategoryId: categoryId,
  });
  return rows.map(mapPackageSubItem);
}

export async function getPOSuggestionsService({
  packageSubItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PO_LINK_PERMISSIONS.REQUEST,
    "You do not have permission to request category PO links",
  );

  const categoryId = assertCategoryScope(budgetAccess);
  const context = await getPackageSubItemContextRepo(packageSubItemId);
  if (!context) {
    throw new ApiError(404, "Package sub-item not found");
  }
  assertRequesterScope(context, categoryId);

  const rows = await getSuggestedPurchaseInvoiceLinesRepo({ packageSubItemId });
  return rows.map(mapPurchaseInvoiceLine);
}

export async function getMyPOLinksService(userId) {
  const rows = await getMyPOLinksRepo(userId);
  return rows.map(mapPoLink);
}

export async function getPOLinksForApprovalService({
  status = "PENDING",
  financialYearId = null,
  budgetAccess,
} = {}) {
  assertAnyPermission(
    budgetAccess,
    [PO_LINK_PERMISSIONS.APPROVE, PO_LINK_PERMISSIONS.VIEW_ALL],
    "You do not have permission to view PO link approval requests",
  );

  const rows = await getPOLinksForApprovalRepo({
    status,
    financialYearId,
  });
  return rows.map(mapPoLink);
}

export async function getPODashboardService(userId, budgetAccess) {
  const isApprover = hasAnyPermission(budgetAccess, [
    PO_LINK_PERMISSIONS.APPROVE,
    PO_LINK_PERMISSIONS.VIEW_ALL,
  ]);

  const rows = isApprover
    ? await getPOLinksForApprovalRepo({ status: PO_LINK_STATUS.PENDING })
    : await getMyPOLinksRepo(userId);

  return {
    mode: isApprover ? "APPROVER_PENDING" : "REQUESTER_HISTORY",
    requests: rows.map(mapPoLink),
  };
}

export async function createPOLinkService(payload, user, budgetAccess) {
  assertPermission(
    budgetAccess,
    PO_LINK_PERMISSIONS.REQUEST,
    "You do not have permission to request category PO links",
  );

  const categoryId = assertCategoryScope(budgetAccess);
  const userRoleId = getRequestUserRoleId(budgetAccess);

  const createdId = await withTransaction(async (transaction) => {
    const po = await getPurchaseInvoiceLineByIdRepo(
      payload.purchase_invoice_line_id,
      transaction,
    );
    if (!po) throw new ApiError(404, "PO record not found");
    assertPoEligible(po);

    const context = await getPackageSubItemContextRepo(
      payload.category_budget_package_sub_item_id,
      transaction,
    );
    if (!context) throw new ApiError(404, "Package sub-item not found");

    assertRequesterScope(context, categoryId);
    assertPreClosing(context);
    assertPackageReady(context);

    const existingPending = await findPendingPOLinkRepo({
      purchaseInvoiceLineId: payload.purchase_invoice_line_id,
      packageSubItemId: payload.category_budget_package_sub_item_id,
      transaction,
    });
    if (existingPending) {
      throw new ApiError(
        409,
        "A pending PO link already exists for this PO and package sub-item",
        "PO_LINK_PENDING_DUPLICATE",
      );
    }

    const poSummary = await getPOAllocationSummaryRepo(
      payload.purchase_invoice_line_id,
      transaction,
    );
    if (Number(payload.requested_qty) > Number(poSummary?.available_qty || 0)) {
      throw new ApiError(
        400,
        `Requested quantity exceeds available PO quantity. Available quantity is ${poSummary?.available_qty ?? 0}`,
        "PO_LINK_PO_QUANTITY_EXCEEDED",
      );
    }

    const subItemSummary = await getPackageSubItemBalanceRepo(
      payload.category_budget_package_sub_item_id,
      transaction,
    );
    if (Number(payload.requested_qty) > Number(subItemSummary?.remaining_qty || 0)) {
      throw new ApiError(
        400,
        `Requested quantity exceeds available package sub-item quantity. Available quantity is ${subItemSummary?.remaining_qty ?? 0}`,
        "PO_LINK_PACKAGE_QUANTITY_EXCEEDED",
      );
    }

    const poLinkId = await createPOLinkRepo(
      {
        purchase_invoice_line_id: payload.purchase_invoice_line_id,
        category_budget_package_sub_item_id:
          payload.category_budget_package_sub_item_id,
        requested_qty: payload.requested_qty,
        unit_cost_snapshot: Number(po.unit_cost || 0),
        requested_by: user.userId,
        requested_user_role_id: userRoleId,
      },
      transaction,
    );

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: context.financial_year_id,
      entity_type: "CATEGORY_PO_LINK",
      entity_id: poLinkId,
      action: PO_LINK_WORKFLOW_ACTIONS.CREATED,
      old_status: null,
      new_status: PO_LINK_STATUS.PENDING,
      note: `PO link requested for ${context.catalog_item_name} / ${context.sub_item_name}`,
      new_values_json: JSON.stringify({
        purchase_invoice_line_id: payload.purchase_invoice_line_id,
        category_budget_package_sub_item_id:
          payload.category_budget_package_sub_item_id,
        requested_qty: payload.requested_qty,
      }),
      user_role_id: userRoleId,
      acting_workspace: "CATEGORY",
      created_by: user.userId,
    });

    return poLinkId;
  });

  const created = mapPoLink(await getPOLinkDetailsRepo(createdId));

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.PO_LINK_SUBMITTED,
    entityType: "CATEGORY_PO_LINK",
    entityId: created.id,
    payload: {
      poLinkId: created.id,
      categoryId: created.budget_category_id,
      category: created.category_name,
      itemDescription: created.item_description,
      packageSubItem: created.budget_type_name,
      requestedQuantity: created.requested_qty,
      requestedBy: user.userName,
    },
  });

  return created;
}

export async function approvePOLinkService(poLinkId, user, budgetAccess) {
  assertPermission(
    budgetAccess,
    PO_LINK_PERMISSIONS.APPROVE,
    "You do not have permission to approve category PO links",
  );

  const userRoleId = getRequestUserRoleId(budgetAccess);

  const approvedId = await withTransaction(async (transaction) => {
    const link = await getPOLinkDetailsRepo(poLinkId, transaction);
    if (!link) throw new ApiError(404, "PO link request not found");
    if (link.status !== PO_LINK_STATUS.PENDING) {
      throw new ApiError(400, "Only pending PO links can be approved");
    }
    // if (Number(link.requested_by) === Number(user.userId)) {
    //   throw new ApiError(
    //     403,
    //     "Requester cannot approve their own PO link request",
    //     "PO_LINK_SELF_APPROVAL_BLOCKED",
    //   );
    // }

    const po = await getPurchaseInvoiceLineByIdRepo(
      link.purchase_invoice_line_id,
      transaction,
    );
    if (!po) throw new ApiError(404, "PO record not found");
    assertPoEligible(po);

    const context = await getPackageSubItemContextRepo(
      link.category_budget_package_sub_item_id,
      transaction,
    );
    if (!context) throw new ApiError(404, "Package sub-item not found");
    assertPreClosing(context);
    assertPackageReady(context);

    const requestedQty = Number(link.requested_qty || 0);
    const poSummary = await getPOAllocationSummaryRepo(
      link.purchase_invoice_line_id,
      transaction,
    );
    if (requestedQty > getAvailableWithCurrent(poSummary, requestedQty)) {
      throw new ApiError(
        400,
        "PO quantity is no longer available",
        "PO_LINK_PO_QUANTITY_EXCEEDED",
      );
    }

    const subItemSummary = await getPackageSubItemBalanceRepo(
      link.category_budget_package_sub_item_id,
      transaction,
    );
    if (requestedQty > getAvailableWithCurrent(subItemSummary, requestedQty)) {
      throw new ApiError(
        400,
        "Package sub-item quantity is no longer available",
        "PO_LINK_PACKAGE_QUANTITY_EXCEEDED",
      );
    }

    const updatedId = await approvePOLinkRepo({
      poLinkId,
      userId: user.userId,
      userRoleId,
      transaction,
    });
    if (!updatedId) {
      throw new ApiError(409, "PO link request is no longer pending");
    }

    await learnPOCatalogMappingFromApprovedLinkRepo({
      poLinkId: updatedId,
      userId: user.userId,
      transaction,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: context.financial_year_id,
      entity_type: "CATEGORY_PO_LINK",
      entity_id: updatedId,
      action: PO_LINK_WORKFLOW_ACTIONS.APPROVED,
      old_status: PO_LINK_STATUS.PENDING,
      new_status: PO_LINK_STATUS.APPROVED,
      note: "PO link approved",
      user_role_id: userRoleId,
      acting_workspace: "GLOBAL",
      created_by: user.userId,
    });

    return updatedId;
  });

  const approved = mapPoLink(await getPOLinkDetailsRepo(approvedId));

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.PO_LINK_APPROVED,
    entityType: "CATEGORY_PO_LINK",
    entityId: approved.id,
    payload: {
      poLinkId: approved.id,
      actorUserId: user.userId,
      requestedBy: approved.requested_by,
      categoryId: approved.budget_category_id,
      packageSubItem: approved.budget_type_name,
    },
  });

  return approved;
}

export async function rejectPOLinkService(poLinkId, reason, user, budgetAccess) {
  assertPermission(
    budgetAccess,
    PO_LINK_PERMISSIONS.APPROVE,
    "You do not have permission to reject category PO links",
  );

  const userRoleId = getRequestUserRoleId(budgetAccess);

  const rejectedId = await withTransaction(async (transaction) => {
    const link = await getPOLinkDetailsRepo(poLinkId, transaction);
    if (!link) throw new ApiError(404, "PO link request not found");
    if (link.status !== PO_LINK_STATUS.PENDING) {
      throw new ApiError(400, "Only pending PO links can be rejected");
    }
    if (Number(link.requested_by) === Number(user.userId)) {
      throw new ApiError(
        403,
        "Requester cannot reject their own PO link request",
        "PO_LINK_SELF_REJECTION_BLOCKED",
      );
    }

    const updatedId = await rejectPOLinkRepo({
      poLinkId,
      userId: user.userId,
      userRoleId,
      reason,
      transaction,
    });
    if (!updatedId) {
      throw new ApiError(409, "PO link request is no longer pending");
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: link.financial_year_id,
      entity_type: "CATEGORY_PO_LINK",
      entity_id: updatedId,
      action: PO_LINK_WORKFLOW_ACTIONS.REJECTED,
      old_status: PO_LINK_STATUS.PENDING,
      new_status: PO_LINK_STATUS.REJECTED,
      note: reason,
      user_role_id: userRoleId,
      acting_workspace: "GLOBAL",
      created_by: user.userId,
    });

    return updatedId;
  });

  const rejected = mapPoLink(await getPOLinkDetailsRepo(rejectedId));

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.PO_LINK_REJECTED,
    entityType: "CATEGORY_PO_LINK",
    entityId: rejected.id,
    payload: {
      poLinkId: rejected.id,
      reason,
      actorUserId: user.userId,
      requestedBy: rejected.requested_by,
      categoryId: rejected.budget_category_id,
      packageSubItem: rejected.budget_type_name,
    },
  });

  return rejected;
}

export async function getPOLinkByIdService(id, user, budgetAccess) {
  return mapPoLink(await getVisiblePoLink(id, user, budgetAccess));
}

export async function getPOTransparencyService(
  purchaseInvoiceLineId,
  user,
  budgetAccess,
) {
  const summary = await getPOAllocationSummaryRepo(purchaseInvoiceLineId);
  if (!summary) throw new ApiError(404, "PO record not found");

  const allocations = await getPOAllocationHistoryRepo(purchaseInvoiceLineId);
  const visible = [];

  for (const allocation of allocations) {
    try {
      await getVisiblePoLink(allocation.id, user, budgetAccess);
      visible.push(mapPoLink(allocation));
    } catch (error) {
      if (error.statusCode !== 403 && error.status !== 403) throw error;
    }
  }

  if (allocations.length > 0 && visible.length === 0) {
    throw new ApiError(403, "You are not allowed to view this PO transparency");
  }

  return {
    ...summary,
    allocations: visible,
  };
}

export async function getPackageSubItemPOLinksService({
  packageSubItemId,
  budgetAccess,
}) {
  assertAnyPermission(
    budgetAccess,
    [
      PO_LINK_PERMISSIONS.REQUEST,
      PO_LINK_PERMISSIONS.VIEW_ASSIGNED,
      PO_LINK_PERMISSIONS.VIEW_ALL,
      PO_LINK_PERMISSIONS.APPROVE,
    ],
    "You do not have permission to view package sub-item PO links",
  );

  const context = await getPackageSubItemContextRepo(packageSubItemId);
  if (!context) {
    throw new ApiError(404, "Package sub-item not found");
  }

  if (!hasPermission(budgetAccess, PO_LINK_PERMISSIONS.VIEW_ALL)) {
    const categoryId = assertCategoryScope(budgetAccess);
    assertRequesterScope(context, categoryId);
  }

  const rows = await getPackageSubItemPOLinksRepo(packageSubItemId);
  const links = rows.map(mapPoLink);
  const approvedLinks = links.filter((link) => link.status === PO_LINK_STATUS.APPROVED);
  const pendingLinks = links.filter((link) => link.status === PO_LINK_STATUS.PENDING);

  return {
    packageSubItem: {
      id: context.id,
      package_sub_item_id: context.id,
      category_budget_package_id: context.category_budget_package_id,
      package_item_id: context.package_item_id,
      financial_year_id: context.financial_year_id,
      financial_year: context.financial_year,
      financial_year_status: context.financial_year_status,
      budget_category_id: context.budget_category_id,
      category_name: context.category_name,
      catalog_item_name: context.catalog_item_name,
      sub_item_name: context.sub_item_name,
      name: `${context.catalog_item_name} / ${context.sub_item_name}`,
      base_quantity: Number(context.quantity || 0),
      unit_price: Number(context.unit_price || 0),
      base_amount: Number(context.quantity || 0) * Number(context.unit_price || 0),
    },
    summary: {
      approvedLinkCount: approvedLinks.length,
      pendingLinkCount: pendingLinks.length,
      totalPOUsed: approvedLinks.reduce(
        (sum, link) => sum + Number(link.linked_amount || 0),
        0,
      ),
      totalPendingPOAmount: pendingLinks.reduce(
        (sum, link) => sum + Number(link.linked_amount || 0),
        0,
      ),
      totalLinkedQuantity: approvedLinks.reduce(
        (sum, link) => sum + Number(link.requested_qty || 0),
        0,
      ),
      totalPendingQuantity: pendingLinks.reduce(
        (sum, link) => sum + Number(link.requested_qty || 0),
        0,
      ),
    },
    links,
  };
}

export async function getPackageItemOverallAveragePriceIntelligenceService({
  packageSubItemId,
  budgetAccess,
}) {
  assertAnyPermission(
    budgetAccess,
    [
      PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
      PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_SUB_ITEMS,
      PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
      PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
      PO_LINK_PERMISSIONS.REQUEST,
      PO_LINK_PERMISSIONS.VIEW_ASSIGNED,
      PO_LINK_PERMISSIONS.VIEW_ALL,
      PO_LINK_PERMISSIONS.APPROVE,
    ],
    "You do not have permission to view price intelligence",
  );

  const {
    packageSubItems,
    benchmarks,
    aggregateEvidence,
    recentPurchases,
  } = await getPackageSubItemPriceIntelligenceDetailsRepo({
    packageSubItemId,
    includeSiblingModels: true,
  });

  if (!packageSubItems.length) {
    throw new ApiError(404, "Package item not found");
  }

  const anchorSubItem = packageSubItems[0];

  if (
    !hasAnyPermission(budgetAccess, [
      PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
      PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
      PO_LINK_PERMISSIONS.VIEW_ALL,
      PO_LINK_PERMISSIONS.APPROVE,
    ])
  ) {
    const categoryId = assertCategoryScope(budgetAccess);
    assertRequesterScope(anchorSubItem, categoryId);
  }

  const benchmarkBySubItemId = new Map(
    benchmarks.map((benchmark) => [
      Number(benchmark.package_sub_item_id),
      {
        ...benchmark,
        mapped_item_codes: parseMappedItemCodes(
          benchmark.mapped_item_codes,
        ),
      },
    ]),
  );

  const models = packageSubItems.map((packageSubItem) => ({
    packageSubItem,
    priceIntelligence: buildPriceIntelligence(
      packageSubItem,
      benchmarkBySubItemId.get(
        Number(packageSubItem.package_sub_item_id),
      ),
    ),
  }));

  const packageItem = {
    id: anchorSubItem.package_item_id,
    package_item_id: anchorSubItem.package_item_id,
    catalog_item_id: anchorSubItem.catalog_item_id,
    catalog_item_name: anchorSubItem.catalog_item_name,
    catalog_item_code: anchorSubItem.catalog_item_code,
    category_budget_package_id:
      anchorSubItem.category_budget_package_id,
    financial_year_id: anchorSubItem.financial_year_id,
    financial_year: anchorSubItem.financial_year,
    financial_year_status: anchorSubItem.financial_year_status,
    package_status: anchorSubItem.package_status,
    budget_category_id: anchorSubItem.budget_category_id,
    category_name: anchorSubItem.category_name,
    category_code: anchorSubItem.category_code,
    model_count: packageSubItems.length,
    total_quantity: packageSubItems.reduce(
      (sum, model) => sum + Number(model.quantity || 0),
      0,
    ),
    total_amount: packageSubItems.reduce(
      (sum, model) => sum + Number(model.total_amount || 0),
      0,
    ),
  };

  const normalizedEvidence = {
    ...aggregateEvidence,
    mapped_item_codes: parseMappedItemCodes(
      aggregateEvidence?.mapped_item_codes,
    ),
  };

  return {
    packageItem,
    overallAveragePriceIntelligence:
      buildPackageItemOverallAveragePriceIntelligence(
        packageItem,
        models,
        normalizedEvidence,
      ),
    models,
    historicalPurchases: recentPurchases,
  };
}

export async function getPackageSubItemPriceIntelligenceService({
  packageSubItemId,
  budgetAccess,
}) {
  assertAnyPermission(
    budgetAccess,
    [
      PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
      PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_SUB_ITEMS,
      PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
      PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
      PO_LINK_PERMISSIONS.REQUEST,
      PO_LINK_PERMISSIONS.VIEW_ASSIGNED,
      PO_LINK_PERMISSIONS.VIEW_ALL,
      PO_LINK_PERMISSIONS.APPROVE,
    ],
    "You do not have permission to view price intelligence",
  );

  const { packageSubItem, benchmark, recentPurchases } =
    await getPackageSubItemPriceIntelligenceDetailsRepo({ packageSubItemId });

  if (!packageSubItem) {
    throw new ApiError(404, "Package sub-item not found");
  }

  if (
    !hasAnyPermission(budgetAccess, [
      PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
      PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
      PO_LINK_PERMISSIONS.VIEW_ALL,
      PO_LINK_PERMISSIONS.APPROVE,
    ])
  ) {
    const categoryId = assertCategoryScope(budgetAccess);
    assertRequesterScope(packageSubItem, categoryId);
  }

  const mappedCodes = parseMappedItemCodes(
    benchmark?.mapped_item_codes,
  );

  return {
    packageSubItem,
    priceIntelligence: buildPriceIntelligence(packageSubItem, {
      ...benchmark,
      mapped_item_codes: mappedCodes,
    }),
    historicalPurchases: recentPurchases,
  };
}

export async function getPOItemMappingsService(filters = {}) {
  const rows = await getPOCatalogMappingsRepo(filters);
  return rows.map(mapPoMapping);
}

export async function createManualPOItemMappingService(payload, user) {
  const existing = await findPOCatalogMappingBySubItemAndCodeRepo({
    catalogSubItemId: payload.catalog_sub_item_id,
    poItemCode: payload.po_item_code,
  });

  if (existing?.is_active) {
    throw new ApiError(
      409,
      "This PO catalog mapping already exists",
      "PO_CATALOG_MAPPING_EXISTS",
    );
  }

  if (existing) {
    throw new ApiError(
      409,
      "This PO catalog mapping already exists but is inactive. Re-enable it instead of creating a duplicate.",
      "PO_CATALOG_MAPPING_INACTIVE",
    );
  }

  const id = await createManualPOCatalogMappingRepo({
    ...payload,
    created_by: user.userId,
  });
  return mapPoMapping(await findPOCatalogMappingByIdRepo(id));
}

export async function setPOItemMappingStatusService(id, payload, user) {
  const mapping = await findPOCatalogMappingByIdRepo(id);
  if (!mapping) throw new ApiError(404, "PO catalog mapping not found");

  if (payload.is_active === false && !payload.disabled_reason) {
    throw new ApiError(400, "Disable reason is required", "VALIDATION_ERROR");
  }

  if (Boolean(mapping.is_active) === payload.is_active) {
    return mapPoMapping(mapping);
  }

  const updatedId = await setPOCatalogMappingStatusRepo({
    id,
    isActive: payload.is_active,
    userId: user.userId,
    reason: payload.disabled_reason,
  });
  return mapPoMapping(await findPOCatalogMappingByIdRepo(updatedId));
}

export async function searchBudgetTypesForMappingService(filters = {}) {
  return searchCatalogSubItemsForMappingRepo(filters);
}

export async function searchPOItemsForMappingService(filters = {}) {
  return searchPOItemsForMappingRepo(filters);
}
