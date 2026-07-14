import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { auditLog } from "../../utils/audit.js";
import {
  approveAndCreateItemRequestService,
  approveItemRequestService,
  createItemRequestService,
  getDashboardItemRequestsService,
  getItemRequestsService,
  rejectItemRequestService,
} from "./itemRequests.service.js";
import {
  validateCreateItemRequest,
  validateItemRequestAutoCreateDecision,
  validateItemRequestDecision,
  validateItemRequestId,
  validateItemRequestStatus,
} from "./itemRequests.validators.js";

export const getItemRequests = asyncHandler(async (req, res) => {
  const status = validateItemRequestStatus(req.query.status);
  const requests = await getItemRequestsService(status);

  return res.json(
    new ApiResponse({
      message: "Item requests fetched successfully",
      data: requests,
    }),
  );
});

export const createItemRequest = asyncHandler(async (req, res) => {
  const payload = validateCreateItemRequest(req.body);

  const request = await createItemRequestService({
    payload,
    requestedBy: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "REQUEST_CATALOG_ITEM",
    entityName: request.requested_type_name || "Item Request",
    entityType: "ITEM_REQUEST",
    entityId: String(request.id),
    description: `Requested new catalog item "${request.requested_type_name}"`,
    newValues: request,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Item request submitted successfully",
      data: request,
    }),
  );
});

export const approveItemRequest = asyncHandler(async (req, res) => {
  const requestId = validateItemRequestId(req.params.requestId);
  const payload = validateItemRequestDecision(req.body);

  const request = await approveItemRequestService({
    requestId,
    adminNote: payload.adminNote,
    reviewedBy: req.user.userId,
  });

  await auditLog(req, {
    action: "APPROVE_ITEM_REQUEST",
    entityName: request.requested_type_name || "Item Request",
    entityType: "ITEM_REQUEST",
    entityId: String(requestId),
    description: `Approved item request "${request.requested_type_name}"`,
    newValues: request,
  });

  return res.json(
    new ApiResponse({
      message: "Item request approved successfully",
      data: request,
    }),
  );
});

export const approveAndCreateItemRequest = asyncHandler(async (req, res) => {
  const requestId = validateItemRequestId(req.params.requestId);
  const payload = validateItemRequestAutoCreateDecision(req.body);

  const result = await approveAndCreateItemRequestService({
    requestId,
    adminNote: payload.adminNote,
    reviewedBy: req.user.userId,
  });

  await auditLog(req, {
    action: "APPROVE_ITEM_REQUEST_AND_CREATE_CATALOG_ITEM",
    entityName:
      result.catalogItem?.name ||
      result.request?.requested_type_name ||
      "Item Request",
    entityType: "ITEM_REQUEST",
    entityId: String(requestId),
    description: `Approved item request and created catalog item "${result.catalogItem?.name}"`,
    newValues: result,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Item request approved and catalog item created successfully",
      data: result,
    }),
  );
});

export const rejectItemRequest = asyncHandler(async (req, res) => {
  const requestId = validateItemRequestId(req.params.requestId);
  const payload = validateItemRequestDecision(req.body);

  const request = await rejectItemRequestService({
    requestId,
    adminNote: payload.adminNote,
    reviewedBy: req.user.userId,
  });

  await auditLog(req, {
    action: "REJECT_ITEM_REQUEST",
    entityName: request.requested_type_name || "Item Request",
    entityType: "ITEM_REQUEST",
    entityId: String(requestId),
    description: `Rejected item request "${request.requested_type_name}"`,
    newValues: request,
  });

  return res.json(
    new ApiResponse({
      message: "Item request rejected successfully",
      data: request,
    }),
  );
});

export const getDashboardItemRequests = asyncHandler(async (req, res) => {
  const data = await getDashboardItemRequestsService({
    userId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Dashboard item requests fetched successfully",
      data,
    }),
  );
});
