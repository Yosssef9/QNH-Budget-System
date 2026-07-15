import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  approveAdjustmentRequestService,
  createAdjustmentRequestService,
  getAdjustmentRequestOptionsService,
  listCategoryAdjustmentRequestsService,
  listMyAdjustmentRequestsService,
  rejectAdjustmentRequestService,
} from "./adjustmentRequests.service.js";
import {
  validateAdjustmentRequestId,
  validateCategoryBudgetId,
  validateCreateAdjustmentRequest,
  validateDecisionPayload,
  validateListStatus,
  validateRejectPayload,
} from "./adjustmentRequests.validators.js";

export const getAdjustmentRequestOptions = asyncHandler(async (req, res) => {
  const departmentCategoryBudgetId = validateCategoryBudgetId(
    req.params.departmentCategoryBudgetId,
  );

  const data = await getAdjustmentRequestOptionsService({
    departmentCategoryBudgetId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Adjustment request options fetched successfully",
      data,
    }),
  );
});

export const createAdjustmentRequest = asyncHandler(async (req, res) => {
  const departmentCategoryBudgetId = validateCategoryBudgetId(
    req.params.departmentCategoryBudgetId,
  );
  const payload = validateCreateAdjustmentRequest(req.body);

  const data = await createAdjustmentRequestService({
    departmentCategoryBudgetId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Adjustment request submitted successfully",
      data,
    }),
  );
});

export const listMyAdjustmentRequests = asyncHandler(async (req, res) => {
  const status = validateListStatus(req.query.status);
  const data = await listMyAdjustmentRequestsService({
    budgetAccess: req.budgetAccess,
    status,
  });

  return res.json(
    new ApiResponse({
      message: "My adjustment requests fetched successfully",
      data,
    }),
  );
});

export const listCategoryAdjustmentRequests = asyncHandler(async (req, res) => {
  const status = validateListStatus(req.query.status);
  const data = await listCategoryAdjustmentRequestsService({
    budgetAccess: req.budgetAccess,
    status,
  });

  return res.json(
    new ApiResponse({
      message: "Category adjustment requests fetched successfully",
      data,
    }),
  );
});

export const approveAdjustmentRequest = asyncHandler(async (req, res) => {
  const adjustmentRequestId = validateAdjustmentRequestId(req.params.requestId);
  const payload = validateDecisionPayload(req.body);

  const data = await approveAdjustmentRequestService({
    adjustmentRequestId,
    note: payload.note,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Adjustment request approved for action",
      data,
    }),
  );
});

export const rejectAdjustmentRequest = asyncHandler(async (req, res) => {
  const adjustmentRequestId = validateAdjustmentRequestId(req.params.requestId);
  const payload = validateRejectPayload(req.body);

  const data = await rejectAdjustmentRequestService({
    adjustmentRequestId,
    note: payload.note,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Adjustment request rejected",
      data,
    }),
  );
});
