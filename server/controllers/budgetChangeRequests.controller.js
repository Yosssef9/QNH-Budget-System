import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { auditLog } from "../utils/audit.js";
import {
  applyBudgetChangeRequestService,
  createBudgetChangeRequestService,
  decideCategoryBudgetChangeRequestService,
  decideCfoBudgetChangeRequestService,
  getBudgetChangeRequestDetailsService,
  getCategoryBudgetChangeRequestsService,
  getCfoBudgetChangeRequestsService,
  getMyBudgetChangeRequestsService,
} from "../services/budgetChangeRequests.service.js";
import {
  validateChangeRequestId,
  validateChangeRequestStatus,
  validateCreateChangeRequest,
  validateDecisionPayload,
} from "../validators/budgetChangeRequests.validator.js";

export const createBudgetChangeRequest = asyncHandler(async (req, res) => {
  const payload = validateCreateChangeRequest(req.body);
  const data = await createBudgetChangeRequestService({
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CREATE_BUDGET_CHANGE_REQUEST",
    entityType: "BUDGET_CHANGE_REQUEST",
    entityId: String(data.request.id),
    entityName: "Budget Change Request",
    description: "Submitted budget change request",
    newValues: data,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Budget change request submitted successfully",
      data,
    }),
  );
});

export const getMyBudgetChangeRequests = asyncHandler(async (req, res) => {
  const status = validateChangeRequestStatus(req.query.status);
  const data = await getMyBudgetChangeRequestsService({
    status,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "My budget change requests fetched successfully",
      data,
    }),
  );
});

export const getCategoryBudgetChangeRequests = asyncHandler(async (req, res) => {
  const status = validateChangeRequestStatus(req.query.status);
  const data = await getCategoryBudgetChangeRequestsService({
    status,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category budget change requests fetched successfully",
      data,
    }),
  );
});

export const getCfoBudgetChangeRequests = asyncHandler(async (req, res) => {
  const status = validateChangeRequestStatus(req.query.status);
  const data = await getCfoBudgetChangeRequestsService({
    status,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "CFO budget change requests fetched successfully",
      data,
    }),
  );
});

export const getBudgetChangeRequestDetails = asyncHandler(async (req, res) => {
  const requestId = validateChangeRequestId(req.params.requestId);
  const data = await getBudgetChangeRequestDetailsService({
    requestId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Budget change request details fetched successfully",
      data,
    }),
  );
});

export const decideCategoryBudgetChangeRequest = asyncHandler(
  async (req, res) => {
    const requestId = validateChangeRequestId(req.params.requestId);
    const payload = validateDecisionPayload(req.body);
    const data = await decideCategoryBudgetChangeRequestService({
      requestId,
      payload,
      user: req.user,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "CATEGORY_DECIDE_BUDGET_CHANGE_REQUEST",
      entityType: "BUDGET_CHANGE_REQUEST",
      entityId: String(requestId),
      entityName: "Budget Change Request",
      description: "Category decision recorded for budget change request",
      newValues: data,
    });

    return res.json(
      new ApiResponse({
        message: "Category decision saved successfully",
        data,
      }),
    );
  },
);

export const decideCfoBudgetChangeRequest = asyncHandler(async (req, res) => {
  const requestId = validateChangeRequestId(req.params.requestId);
  const payload = validateDecisionPayload(req.body);
  const data = await decideCfoBudgetChangeRequestService({
    requestId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CFO_DECIDE_BUDGET_CHANGE_REQUEST",
    entityType: "BUDGET_CHANGE_REQUEST",
    entityId: String(requestId),
    entityName: "Budget Change Request",
    description: "CFO decision recorded for budget change request",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "CFO decision saved successfully",
      data,
    }),
  );
});

export const applyBudgetChangeRequest = asyncHandler(async (req, res) => {
  const requestId = validateChangeRequestId(req.params.requestId);
  const data = await applyBudgetChangeRequestService({
    requestId,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "APPLY_BUDGET_CHANGE_REQUEST",
    entityType: "BUDGET_CHANGE_REQUEST",
    entityId: String(requestId),
    entityName: "Budget Change Request",
    description: "Applied accepted budget change request",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Budget change request applied successfully",
      data,
    }),
  );
});
