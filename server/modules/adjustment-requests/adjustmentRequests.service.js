import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import { hasPermission } from "../../../shared/permissions/permissionCodes.js";
import {
  ADJUSTMENT_REQUEST_PERMISSIONS,
  ADJUSTMENT_REQUEST_STATUS,
  ADJUSTMENT_REQUEST_TYPES,
} from "./adjustmentRequests.constants.js";
import {
  createAdjustmentRequestRepo,
  createWorkflowHistoryRepo,
  findActiveDepartmentItemByCatalogRepo,
  findAdjustmentRequestByIdRepo,
  findCatalogItemInCategoryRepo,
  findDepartmentCategoryBudgetContextRepo,
  findExistingDepartmentItemRepo,
  listCategoryAdjustmentRequestsRepo,
  listEligibleItemsForCategoryBudgetRepo,
  listMyAdjustmentRequestsRepo,
  updateAdjustmentRequestDecisionRepo,
} from "./adjustmentRequests.repository.js";
import {
  mapAdjustmentRequest,
  mapEligibleAdjustmentItems,
} from "./adjustmentRequests.mapper.js";

function actorUserId(user) {
  return user?.userId ?? user?.USER_ID ?? user?.id ?? null;
}

function getUserRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getActingWorkspace(budgetAccess) {
  return budgetAccess?.workspaceType ?? budgetAccess?.type ?? null;
}

function buildAdjustmentNotificationPayload(request, actorId, note = null) {
  const currentQuantity = request.item?.current_requested_quantity;
  const requestedQuantity = request.item?.requested_quantity;
  const difference =
    currentQuantity === null ||
    currentQuantity === undefined ||
    requestedQuantity === null ||
    requestedQuantity === undefined
      ? null
      : Number(requestedQuantity) - Number(currentQuantity);

  return {
    adjustmentRequestId: request.id,
    departmentCategoryBudgetId: request.department_category_budget_id,
    departmentId: request.department?.id,
    departmentName: request.department?.name,
    categoryId: request.category?.id,
    categoryName: request.category?.name,
    itemName: request.item?.catalog_item_name,
    requestType: request.item?.change_type,
    currentApprovedQuantity: currentQuantity,
    requestedQuantity,
    quantityDifference: difference,
    reason: request.reason,
    note,
    financialYear: request.financial_year?.year,
    actorUserId: actorId,
  };
}

function assertDepartmentAccess(budgetAccess) {
  if (!hasPermission(budgetAccess, ADJUSTMENT_REQUEST_PERMISSIONS.SUBMIT)) {
    throw new ApiError(
      403,
      "You do not have permission to submit adjustment requests",
      "ADJUSTMENT_REQUEST_SUBMIT_DENIED",
    );
  }

  const departmentId = budgetAccess?.department?.id;

  if (!departmentId) {
    throw new ApiError(
      403,
      "Select a department workspace to submit adjustment requests",
      "DEPARTMENT_WORKSPACE_REQUIRED",
    );
  }

  return Number(departmentId);
}

function assertCategoryReviewAccess(budgetAccess) {
  if (!hasPermission(budgetAccess, ADJUSTMENT_REQUEST_PERMISSIONS.REVIEW)) {
    throw new ApiError(
      403,
      "You do not have permission to review adjustment requests",
      "ADJUSTMENT_REQUEST_REVIEW_DENIED",
    );
  }

  const categoryId =
    budgetAccess?.budgetCategory?.id ??
    budgetAccess?.category?.id ??
    budgetAccess?.selectedWorkspace?.budgetCategory?.id ??
    null;

  if (!categoryId) {
    throw new ApiError(
      403,
      "Select a category workspace to review adjustment requests",
      "CATEGORY_WORKSPACE_REQUIRED",
    );
  }

  return Number(categoryId);
}

function assertPreClosingContext(context) {
  if (!context) {
    throw new ApiError(
      404,
      "Department category budget not found",
      "DEPARTMENT_CATEGORY_BUDGET_NOT_FOUND",
    );
  }

  if (context.financial_year_status !== "PRE_CLOSING") {
    throw new ApiError(
      409,
      "Adjustment requests are allowed only after the financial year moves to PRE_CLOSING",
      "ADJUSTMENT_REQUEST_PRE_CLOSING_REQUIRED",
    );
  }
}

function assertOwnDepartment(context, departmentId) {
  if (Number(context.department_id) !== Number(departmentId)) {
    throw new ApiError(
      403,
      "You cannot submit an adjustment request for another department",
      "ADJUSTMENT_REQUEST_DEPARTMENT_SCOPE_DENIED",
    );
  }
}

function assertCategoryScope(request, categoryId) {
  if (Number(request?.budget_category_id) !== Number(categoryId)) {
    throw new ApiError(
      403,
      "You cannot review adjustment requests for another category",
      "ADJUSTMENT_REQUEST_CATEGORY_SCOPE_DENIED",
    );
  }
}

export async function getAdjustmentRequestOptionsService({
  departmentCategoryBudgetId,
  budgetAccess,
}) {
  const departmentId = assertDepartmentAccess(budgetAccess);
  const context = await findDepartmentCategoryBudgetContextRepo({
    departmentCategoryBudgetId,
  });

  assertPreClosingContext(context);
  assertOwnDepartment(context, departmentId);

  const rows = await listEligibleItemsForCategoryBudgetRepo({
    departmentCategoryBudgetId,
  });

  return {
    context,
    ...mapEligibleAdjustmentItems(rows),
  };
}

export async function createAdjustmentRequestService({
  departmentCategoryBudgetId,
  payload,
  user,
  budgetAccess,
}) {
  const departmentId = assertDepartmentAccess(budgetAccess);
  const context = await findDepartmentCategoryBudgetContextRepo({
    departmentCategoryBudgetId,
  });

  assertPreClosingContext(context);
  assertOwnDepartment(context, departmentId);

  const catalogItem = await findCatalogItemInCategoryRepo({
    categoryId: context.budget_category_id,
    catalogItemId: payload.catalogItemId,
  });

  if (!catalogItem) {
    throw new ApiError(
      400,
      "Selected item does not belong to the active category",
      "ADJUSTMENT_REQUEST_CATALOG_ITEM_SCOPE_DENIED",
    );
  }

  let existingItem = null;

  if (payload.requestType === ADJUSTMENT_REQUEST_TYPES.INCREASE_QUANTITY) {
    existingItem = await findExistingDepartmentItemRepo({
      departmentCategoryBudgetId,
      itemId: payload.existingDepartmentBudgetItemId,
    });

    if (!existingItem) {
      throw new ApiError(
        400,
        "Select an existing active budget item from this category",
        "ADJUSTMENT_REQUEST_EXISTING_ITEM_REQUIRED",
      );
    }

    if (Number(existingItem.catalog_item_id) !== Number(payload.catalogItemId)) {
      throw new ApiError(
        400,
        "Existing item does not match the selected catalog item",
        "ADJUSTMENT_REQUEST_ITEM_MISMATCH",
      );
    }

    const approvedQuantity = Number(existingItem.category_approved_quantity || 0);

    if (payload.requestedQuantity === null || payload.requestedQuantity === undefined) {
      throw new ApiError(
        400,
        "Enter the new requested quantity for the approved item",
        "ADJUSTMENT_REQUEST_QUANTITY_REQUIRED",
      );
    }

    if (Number(payload.requestedQuantity) <= approvedQuantity) {
      throw new ApiError(
        400,
        "Requested quantity must be greater than the current approved quantity",
        "ADJUSTMENT_REQUEST_QUANTITY_NOT_INCREASED",
      );
    }
  }

  if (payload.requestType === ADJUSTMENT_REQUEST_TYPES.ADD_ITEM) {
    const alreadyInBudget = await findActiveDepartmentItemByCatalogRepo({
      departmentCategoryBudgetId,
      catalogItemId: payload.catalogItemId,
    });

    if (alreadyInBudget) {
      throw new ApiError(
        409,
        "This item already exists in the department category budget. Use increase existing item.",
        "ADJUSTMENT_REQUEST_ITEM_ALREADY_EXISTS",
      );
    }
  }

  const actorId = actorUserId(user);
  const created = await withTransaction(async (transaction) => {
    const request = await createAdjustmentRequestRepo(transaction, {
      departmentCategoryBudgetId,
      requestType: payload.requestType,
      existingDepartmentBudgetItemId:
        payload.existingDepartmentBudgetItemId || null,
      catalogItemId: payload.catalogItemId,
      currentRequestedQuantity:
        existingItem?.category_approved_quantity ?? null,
      requestedQuantity: payload.requestedQuantity,
      reason: payload.reason,
      description: payload.description,
      submittedBy: actorId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financialYearId: context.financial_year_id,
      entityType: "ADJUSTMENT_REQUEST",
      entityId: request.id,
      action: "ADJUSTMENT_REQUEST_SUBMITTED",
      oldStatus: null,
      newStatus: ADJUSTMENT_REQUEST_STATUS.PENDING,
      note: payload.reason,
      userRoleId: getUserRoleId(budgetAccess),
      actingWorkspace: getActingWorkspace(budgetAccess),
      createdBy: actorId,
    });

    return request;
  });

  const mapped = mapAdjustmentRequest(await findAdjustmentRequestByIdRepo(created.id));

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.ADJUSTMENT_REQUEST_SUBMITTED,
    entityType: "ADJUSTMENT_REQUEST",
    entityId: mapped.id,
    payload: buildAdjustmentNotificationPayload(mapped, actorId),
  });

  return mapped;
}

export async function listMyAdjustmentRequestsService({ budgetAccess, status }) {
  const departmentId = assertDepartmentAccess(budgetAccess);
  return (await listMyAdjustmentRequestsRepo({ departmentId, status })).map(
    mapAdjustmentRequest,
  );
}

export async function listCategoryAdjustmentRequestsService({
  budgetAccess,
  status,
}) {
  const categoryId = assertCategoryReviewAccess(budgetAccess);
  return (await listCategoryAdjustmentRequestsRepo({ categoryId, status })).map(
    mapAdjustmentRequest,
  );
}

async function decideAdjustmentRequest({
  adjustmentRequestId,
  status,
  note,
  user,
  budgetAccess,
}) {
  const categoryId = assertCategoryReviewAccess(budgetAccess);
  const request = await findAdjustmentRequestByIdRepo(adjustmentRequestId);

  if (!request) {
    throw new ApiError(
      404,
      "Adjustment request not found",
      "ADJUSTMENT_REQUEST_NOT_FOUND",
    );
  }

  assertCategoryScope(request, categoryId);

  if (request.status !== ADJUSTMENT_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      409,
      "Only pending adjustment requests can be reviewed",
      "ADJUSTMENT_REQUEST_NOT_PENDING",
    );
  }

  const actorId = actorUserId(user);

  await withTransaction(async (transaction) => {
    const updated = await updateAdjustmentRequestDecisionRepo(transaction, {
      adjustmentRequestId,
      status,
      note,
      actorUserId: actorId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Only pending adjustment requests can be reviewed",
        "ADJUSTMENT_REQUEST_NOT_PENDING",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financialYearId: request.financial_year_id,
      entityType: "ADJUSTMENT_REQUEST",
      entityId: adjustmentRequestId,
      action:
        status === ADJUSTMENT_REQUEST_STATUS.APPROVED_FOR_ACTION
          ? "ADJUSTMENT_REQUEST_APPROVED_FOR_ACTION"
          : "ADJUSTMENT_REQUEST_REJECTED",
      oldStatus: ADJUSTMENT_REQUEST_STATUS.PENDING,
      newStatus: status,
      note,
      userRoleId: getUserRoleId(budgetAccess),
      actingWorkspace: getActingWorkspace(budgetAccess),
      createdBy: actorId,
    });
  });

  const mapped = mapAdjustmentRequest(
    await findAdjustmentRequestByIdRepo(adjustmentRequestId),
  );

  await queueNotification({
    notificationType:
      status === ADJUSTMENT_REQUEST_STATUS.APPROVED_FOR_ACTION
        ? NOTIFICATION_TYPES.ADJUSTMENT_REQUEST_APPROVED
        : NOTIFICATION_TYPES.ADJUSTMENT_REQUEST_REJECTED,
    entityType: "ADJUSTMENT_REQUEST",
    entityId: adjustmentRequestId,
    payload: buildAdjustmentNotificationPayload(mapped, actorId, note),
  });

  return mapped;
}

export function approveAdjustmentRequestService(args) {
  return decideAdjustmentRequest({
    ...args,
    status: ADJUSTMENT_REQUEST_STATUS.APPROVED_FOR_ACTION,
  });
}

export function rejectAdjustmentRequestService(args) {
  return decideAdjustmentRequest({
    ...args,
    status: ADJUSTMENT_REQUEST_STATUS.REJECTED,
  });
}
