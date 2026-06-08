import { ApiError } from "../utils/apiError.js";
import {
  approveItemRequestRepo,
  createItemRequestRepo,
  findItemRequestByIdRepo,
  getItemRequestsRepo,
  rejectItemRequestRepo,
  approveItemRequestManualRepo,
  getDashboardItemRequestsRepo,
} from "../repositories/itemRequest.repository.js";
import {
  createCategoryService,
  createTypeService,
} from "./category.service.js";
import { queueNotification } from "./notification.service.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
export async function getItemRequestsService(status) {
  return await getItemRequestsRepo(status);
}

export async function createItemRequestService(payload) {
  const request = await createItemRequestRepo(payload);

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.ITEM_REQUEST_CREATED,

    entityType: "ITEM_REQUEST",

    entityId: request.id,

    payload: {
      requestId: request.id,
      actorUserId: payload.requestedBy,
    },
  });

  return request;
}

export async function approveItemRequestService({
  requestId,
  adminNote,
  reviewedBy,
}) {
  const request = await findItemRequestByIdRepo(requestId);

  if (!request) {
    throw new ApiError(404, "Item request not found", "ITEM_REQUEST_NOT_FOUND");
  }

  if (request.status !== "PENDING") {
    throw new ApiError(
      409,
      "Only pending requests can be approved",
      "ITEM_REQUEST_ALREADY_REVIEWED",
    );
  }

  let categoryId = request.existing_category_id;

  if (!categoryId) {
    const category = await createCategoryService({
      name: request.requested_category_name,
    });

    categoryId = category.id;
  }

  await createTypeService({
    categoryId,
    name: request.requested_type_name,
    expenseType: "OPEX",
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

  if (!request) {
    throw new ApiError(404, "Item request not found", "ITEM_REQUEST_NOT_FOUND");
  }

  if (request.status !== "PENDING") {
    throw new ApiError(
      409,
      "Only pending requests can be rejected",
      "ITEM_REQUEST_ALREADY_REVIEWED",
    );
  }

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

export async function approveItemRequestManualService({
  requestId,
  adminNote,
  reviewedBy,
}) {
  const request = await findItemRequestByIdRepo(requestId);

  if (!request) {
    throw new ApiError(404, "Item request not found", "ITEM_REQUEST_NOT_FOUND");
  }

  if (request.status !== "PENDING") {
    throw new ApiError(
      409,
      "Only pending requests can be approved",
      "ITEM_REQUEST_ALREADY_REVIEWED",
    );
  }

  return await approveItemRequestManualRepo({
    requestId,
    adminNote,
    reviewedBy,
  });
}
export async function getDashboardItemRequestsService({
  userId,
  budgetAccess,
}) {
  return await getDashboardItemRequestsRepo({ userId, budgetAccess });
}
