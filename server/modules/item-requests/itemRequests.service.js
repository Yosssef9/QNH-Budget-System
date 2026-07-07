import { ApiError } from "../../utils/apiError.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import {
  hasAnyPermission,
  hasPermission,
  PERMISSION_CODES,
} from "../../../shared/permissions/permissionCodes.js";
import {
  ROLE_CODES,
} from "../access-management/access.constants.js";
import {
  ITEM_REQUEST_ADMIN_PERMISSION,
  SUPPORTED_ITEM_REQUEST_CATEGORY_CODES,
} from "./itemRequests.constants.js";
import {
  approveItemRequestRepo,
  createItemRequestRepo,
  findItemRequestByIdRepo,
  findSupportedCategoryByIdRepo,
  getDashboardItemRequestsRepo,
  getItemRequestsRepo,
  rejectItemRequestRepo,
} from "./itemRequests.repository.js";

function assertCanCreateItemRequest(budgetAccess) {
  const roleCode = budgetAccess?.role?.code ?? budgetAccess?.role_code;
  const isDepartmentWorkspace =
    budgetAccess?.workspaceType === "DEPARTMENT" ||
    budgetAccess?.type === "DEPARTMENT";
  const isDepartmentRole =
    roleCode === ROLE_CODES.DEPARTMENT_BUDGET_MANAGER ||
    roleCode === ROLE_CODES.DEPARTMENT_USER;

  if (hasPermission(budgetAccess, ITEM_REQUEST_ADMIN_PERMISSION)) {
    return;
  }

  if (!isDepartmentWorkspace || !isDepartmentRole || !budgetAccess?.department?.id) {
    throw new ApiError(
      403,
      "Select a department workspace to request a new catalog item",
      "ITEM_REQUEST_DEPARTMENT_WORKSPACE_REQUIRED",
    );
  }

  if (
    !hasAnyPermission(budgetAccess, [
      PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
      PERMISSION_CODES.SUBMIT_DEPARTMENT_CATEGORY_BUDGETS,
    ])
  ) {
    throw new ApiError(
      403,
      "You do not have permission to request catalog items",
      "ITEM_REQUEST_PERMISSION_DENIED",
    );
  }
}

function assertSupportedCategory(category) {
  if (!category || !category.is_active) {
    throw new ApiError(
      400,
      "Select an active IT, Biomedical, or General category",
      "ITEM_REQUEST_CATEGORY_INVALID",
    );
  }

  if (!SUPPORTED_ITEM_REQUEST_CATEGORY_CODES.includes(category.category_code)) {
    throw new ApiError(
      400,
      "Item requests are allowed only for IT, Biomedical, or General",
      "ITEM_REQUEST_CATEGORY_UNSUPPORTED",
    );
  }

  return category;
}

function assertPendingRequest(request) {
  if (!request) {
    throw new ApiError(404, "Item request not found", "ITEM_REQUEST_NOT_FOUND");
  }

  if (request.status !== "PENDING") {
    throw new ApiError(
      409,
      "Only pending requests can be reviewed",
      "ITEM_REQUEST_ALREADY_REVIEWED",
    );
  }
}

export async function getItemRequestsService(status) {
  return await getItemRequestsRepo(status);
}

export async function createItemRequestService({ payload, requestedBy, budgetAccess }) {
  assertCanCreateItemRequest(budgetAccess);

  const category = assertSupportedCategory(
    await findSupportedCategoryByIdRepo(payload.existingCategoryId),
  );

  const request = await createItemRequestRepo({
    existingCategoryId: category.id,
    requestedTypeName: payload.requestedTypeName,
    requestedExpenseType: payload.expenseType,
    requestedBy,
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.ITEM_REQUEST_CREATED,
    entityType: "ITEM_REQUEST",
    entityId: request.id,
    payload: {
      requestId: request.id,
      categoryId: category.id,
      itemName: request.requested_type_name,
      categoryName: category.name,
      requestedBy,
      actorUserId: requestedBy,
    },
  });

  return {
    ...request,
    existing_category_name: category.name,
    existing_category_code: category.category_code,
  };
}

export async function approveItemRequestService({
  requestId,
  adminNote,
  reviewedBy,
}) {
  const request = await findItemRequestByIdRepo(requestId);
  assertPendingRequest(request);
  assertSupportedCategory({
    id: request.existing_category_id,
    category_code: request.existing_category_code,
    name: request.existing_category_name,
    is_active: request.existing_category_is_active,
  });

  const result = await approveItemRequestRepo({
    requestId,
    adminNote,
    reviewedBy,
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.ITEM_REQUEST_APPROVED,
    entityType: "ITEM_REQUEST",
    entityId: requestId,
    payload: {
      requestId,
      itemName: request.requested_type_name,
      approvedBy: reviewedBy,
    },
  });

  return result;
}

export async function rejectItemRequestService({
  requestId,
  adminNote,
  reviewedBy,
}) {
  const request = await findItemRequestByIdRepo(requestId);
  assertPendingRequest(request);

  const result = await rejectItemRequestRepo({
    requestId,
    adminNote,
    reviewedBy,
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.ITEM_REQUEST_REJECTED,
    entityType: "ITEM_REQUEST",
    entityId: requestId,
    payload: {
      requestId,
      itemName: request.requested_type_name,
      rejectedBy: reviewedBy,
      reason: adminNote,
    },
  });

  return result;
}

export async function getDashboardItemRequestsService({
  userId,
  budgetAccess,
}) {
  return await getDashboardItemRequestsRepo({
    userId,
    departmentId: budgetAccess?.department?.id || null,
    canManageCatalog: hasPermission(budgetAccess, ITEM_REQUEST_ADMIN_PERMISSION),
  });
}
