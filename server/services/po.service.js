import { ApiError } from "../utils/apiError.js";
import {
  approvePOLinkRepo,
  createPOLinkRepo,
  findPendingPOLinkRepo,
  getAvailablePurchaseInvoiceLinesRepo,
  getBudgetItemAllocationSummaryRepo,
  getMyPOLinksRepo,
  getPODashboardRepo,
  getPOBudgetItemsRepo,
  getPOAllocationHistoryRepo,
  getPOAllocationSummaryRepo,
  getPOLinkDetailsRepo,
  getPOLinksForApprovalRepo,
  getPurchaseInvoiceLineByIdRepo,
  rejectPOLinkRepo,
} from "../repositories/po.repository.js";
import { getBudgetItemDetails } from "../repositories/budgetItem.repository.js";
import { findFinancialYearById as getFinancialYearByIdRepo } from "../repositories/financialYears.repository.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
import { queueNotification } from "./notification.service.js";

function canViewPOLink(poLink, user, budgetAccess) {
  if (!poLink || !user || !budgetAccess) return false;

  if (budgetAccess.isGlobalAdmin) return true;

  if (budgetAccess.permissions?.can_view_all_po_link_requests) return true;

  if (Number(poLink.requested_by) === Number(user.userId)) return true;

  const userDepartmentId = budgetAccess.department?.id;

  return (
    userDepartmentId &&
    Number(poLink.department_id) === Number(userDepartmentId) &&
    (budgetAccess.permissions?.can_view_po_links ||
      budgetAccess.permissions?.can_approve_po_links)
  );
}

function getApprovalDepartmentScope(budgetAccess) {
  if (
    budgetAccess?.isGlobalAdmin ||
    budgetAccess?.permissions?.can_view_all_po_link_requests
  ) {
    return null;
  }

  return budgetAccess?.department?.id || null;
}

async function validatePOLinkBusinessWindow(budgetItem) {
  if (budgetItem.status !== "APPROVED") {
    throw new ApiError(
      400,
      "Only approved budget items can be linked to PO records",
    );
  }

  const financialYear = await getFinancialYearByIdRepo(
    budgetItem.financial_year_id,
  );

  if (!financialYear) {
    throw new ApiError(404, "Financial year not found");
  }

  if (financialYear.status !== "PRE_CLOSING") {
    throw new ApiError(
      400,
      `PO linking is only allowed during PRE_CLOSING. Current status is ${financialYear.status}`,
    );
  }
}

export async function getAvailablePOsService(filters = {}) {
  return getAvailablePurchaseInvoiceLinesRepo(filters);
}

export async function getMyPOLinksService(userId) {
  return getMyPOLinksRepo(userId);
}

export async function getPODashboardService(userId, budgetAccess) {
  const isApprover = budgetAccess?.permissions?.can_approve_po_links === true;
  const requests = await getPODashboardRepo(
    userId,
    isApprover
      ? getApprovalDepartmentScope(budgetAccess)
      : budgetAccess?.department?.id,
    isApprover,
  );

  return {
    mode: isApprover ? "APPROVER_PENDING" : "REQUESTER_HISTORY",
    requests,
  };
}

export async function getPOBudgetItemsService({ budgetAccess }) {
  const departmentId = budgetAccess?.department?.id;

  if (!departmentId) {
    throw new ApiError(403, "You are not assigned to any department budget");
  }

  return getPOBudgetItemsRepo({ departmentId });
}

export async function getPOLinksForApprovalService({
  status = "PENDING",
  financialYearId = null,
  budgetAccess,
} = {}) {
  return getPOLinksForApprovalRepo({
    status,
    financialYearId,
    departmentId: getApprovalDepartmentScope(budgetAccess),
  });
}

export async function createPOLinkService(
  { purchase_invoice_line_id, budget_item_id, requested_qty },
  user,
) {
  const po = await getPurchaseInvoiceLineByIdRepo(purchase_invoice_line_id);

  if (!po) {
    throw new ApiError(404, "PO record not found");
  }

  const budgetItem = await getBudgetItemDetails(budget_item_id);

  if (!budgetItem) {
    throw new ApiError(404, "Budget item not found");
  }

  const existingPendingLink = await findPendingPOLinkRepo(
    purchase_invoice_line_id,
    budget_item_id,
  );

  if (existingPendingLink) {
    throw new ApiError(
      400,
      "A pending PO link already exists for this PO and budget item",
    );
  }

  if (Number(requested_qty) <= 0 || Number.isNaN(Number(requested_qty))) {
    throw new ApiError(400, "Requested quantity must be greater than zero");
  }

  await validatePOLinkBusinessWindow(budgetItem);

  const poAllocation = await getPOAllocationSummaryRepo(
    purchase_invoice_line_id,
  );

  if (Number(requested_qty) > Number(poAllocation.available_qty)) {
    throw new ApiError(
      400,
      `Requested quantity exceeds available PO quantity. Available quantity is ${poAllocation.available_qty}`,
    );
  }

  const budgetAllocation =
    await getBudgetItemAllocationSummaryRepo(budget_item_id);

  if (Number(requested_qty) > Number(budgetAllocation.remaining_qty)) {
    throw new ApiError(
      400,
      `Requested quantity exceeds remaining budget quantity. Remaining quantity is ${budgetAllocation.remaining_qty}`,
    );
  }

  const linkedAmount = Number(requested_qty) * Number(po.unit_cost || 0);

  const poLink = await createPOLinkRepo({
    purchase_invoice_line_id,
    budget_id: budgetItem.budget_id,
    budget_item_id,
    parent_item_name: po.parent_item_name,
    requested_qty,
    unit_cost: po.unit_cost,
    linked_amount: linkedAmount,
    requested_by: user.userId,
  });

  if (!poLink) {
    throw new ApiError(500, "Failed to create PO link request");
  }

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.PO_LINK_SUBMITTED,
    entityType: "PO_LINK",
    entityId: poLink.id,
    payload: {
      poLinkId: poLink.id,
      itemDescription: po.item_description,
      requestedQuantity: requested_qty,
      requestedBy: user.userName,
    },
  });

  return poLink;
}

export async function approvePOLinkService(poLinkId, user) {
  const poLink = await getPOLinkDetailsRepo(poLinkId);

  if (!poLink) {
    throw new ApiError(404, "PO Link request not found");
  }

  if (poLink.status !== "PENDING") {
    throw new ApiError(400, "Only pending requests can be approved");
  }

  const po = await getPurchaseInvoiceLineByIdRepo(
    poLink.purchase_invoice_line_id,
  );

  if (!po) {
    throw new ApiError(404, "PO record not found");
  }

  const budgetItem = await getBudgetItemDetails(poLink.budget_item_id);

  if (!budgetItem) {
    throw new ApiError(404, "Budget item not found");
  }

  await validatePOLinkBusinessWindow(budgetItem);

  const requestedQty = Number(poLink.requested_qty || 0);
  const poAllocation = await getPOAllocationSummaryRepo(
    poLink.purchase_invoice_line_id,
  );
  const availablePOQty = Number(poAllocation.available_qty) + requestedQty;

  if (requestedQty > availablePOQty) {
    throw new ApiError(
      400,
      `PO quantity is no longer available. Available quantity is ${availablePOQty}`,
    );
  }

  const budgetAllocation = await getBudgetItemAllocationSummaryRepo(
    poLink.budget_item_id,
  );
  const remainingBudgetQty =
    Number(budgetAllocation.remaining_qty) + requestedQty;

  if (requestedQty > remainingBudgetQty) {
    throw new ApiError(
      400,
      `Budget quantity is no longer available. Remaining quantity is ${remainingBudgetQty}`,
    );
  }

  const approved = await approvePOLinkRepo(poLinkId, user.userId);

  if (!approved) {
    throw new ApiError(409, "PO Link request is no longer pending");
  }

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.PO_LINK_APPROVED,
    entityType: "PO_LINK",
    entityId: poLinkId,
    payload: {
      poLinkId,
    },
  });

  return approved;
}

export async function rejectPOLinkService(poLinkId, reason, user) {
  if (!reason?.trim()) {
    throw new ApiError(400, "Rejection reason is required");
  }

  const poLink = await getPOLinkDetailsRepo(poLinkId);

  if (!poLink) {
    throw new ApiError(404, "PO Link request not found");
  }

  if (poLink.status !== "PENDING") {
    throw new ApiError(400, "Only pending requests can be rejected");
  }

  const rejected = await rejectPOLinkRepo(poLinkId, user.userId, reason);

  if (!rejected) {
    throw new ApiError(409, "PO Link request is no longer pending");
  }

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.PO_LINK_REJECTED,
    entityType: "PO_LINK",
    entityId: poLinkId,
    payload: {
      poLinkId,
      reason,
    },
  });

  return rejected;
}

export async function getPOLinkByIdService(id, user, budgetAccess) {
  const poLink = await getPOLinkDetailsRepo(id);

  if (!poLink) {
    throw new ApiError(404, "PO Link request not found");
  }

  if (!canViewPOLink(poLink, user, budgetAccess)) {
    throw new ApiError(403, "You are not allowed to view this PO link");
  }

  return poLink;
}

export async function getPOTransparencyService(
  purchaseInvoiceLineId,
  user,
  budgetAccess,
) {
  const summary = await getPOAllocationSummaryRepo(purchaseInvoiceLineId);

  if (!summary) {
    throw new ApiError(404, "PO record not found");
  }

  const allocations = await getPOAllocationHistoryRepo(purchaseInvoiceLineId);

  const visibleAllocations = allocations.filter((allocation) =>
    canViewPOLink(allocation, user, budgetAccess),
  );

  if (allocations.length > 0 && visibleAllocations.length === 0) {
    throw new ApiError(403, "You are not allowed to view this PO transparency");
  }

  return {
    ...summary,
    allocations: visibleAllocations,
  };
}
