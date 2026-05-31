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

export async function getItemRequestsService(status) {
  return await getItemRequestsRepo(status);
}

export async function createItemRequestService(payload) {
  return await createItemRequestRepo(payload);
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

  return await approveItemRequestRepo({
    requestId,
    adminNote,
    reviewedBy,
  });
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

  return await rejectItemRequestRepo({
    requestId,
    adminNote,
    reviewedBy,
  });
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
export async function getDashboardItemRequestsService({ userId, budgetAccess }) {
  return await getDashboardItemRequestsRepo({ userId, budgetAccess });
}