import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  approveItemRequestService,
  createItemRequestService,
  getItemRequestsService,
  rejectItemRequestService,
  approveItemRequestManualService,
} from "../services/itemRequest.service.js";
import {
  validateCreateItemRequest,
  validateItemRequestDecision,
  validateItemRequestId,
  validateItemRequestStatus,
} from "../validators/itemRequest.validator.js";

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
    ...payload,
    requestedBy: req.user.userId,
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

  return res.json(
    new ApiResponse({
      message: "Item request approved successfully",
      data: request,
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

  return res.json(
    new ApiResponse({
      message: "Item request rejected successfully",
      data: request,
    }),
  );
});
export const approveItemRequestManual = asyncHandler(async (req, res) => {
  const requestId = validateItemRequestId(req.params.requestId);
  const payload = validateItemRequestDecision(req.body);

  const request = await approveItemRequestManualService({
    requestId,
    adminNote: payload.adminNote,
    reviewedBy: req.user.userId,
  });

  return res.json(
    new ApiResponse({
      message: "Item request approved successfully",
      data: request,
    }),
  );
});
