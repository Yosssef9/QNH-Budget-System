import {
  approvePOLinkService,
  createPOLinkService,
  getAvailablePOsService,
  getMyPOLinksService,
  getPODashboardService,
  getPOBudgetItemsService,
  getPOLinkByIdService,
  getPOLinksForApprovalService,
  getPOSuggestionsService,
  getPOTransparencyService,
  rejectPOLinkService,
} from "../services/po.service.js";
import { auditLog } from "../utils/audit.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  validateCreatePOLink,
  validatePOApprovalFilters,
  validatePOFilters,
  validatePOLinkId,
  validatePOSuggestionFilters,
  validateRejectPOLink,
} from "../validators/po.validator.js";

export const getAvailablePOs = asyncHandler(async (req, res) => {
  const filters = validatePOFilters(req.query);
  const result = await getAvailablePOsService(filters);

  return res.json(
    new ApiResponse({
      message: "Available PO records fetched successfully",
      data: result,
    }),
  );
});

export const getMyPOLinks = asyncHandler(async (req, res) => {
  const result = await getMyPOLinksService(req.user.userId);

  return res.json(
    new ApiResponse({
      message: "My PO links fetched successfully",
      data: result,
    }),
  );
});

export const getPODashboard = asyncHandler(async (req, res) => {
  const data = await getPODashboardService(req.user.userId, req.budgetAccess);

  return res.json(
    new ApiResponse({
      message: "PO dashboard fetched successfully",
      data,
    }),
  );
});

export const getPOBudgetItems = asyncHandler(async (req, res) => {
  const data = await getPOBudgetItemsService({
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "PO eligible budget items fetched successfully",
      data,
    }),
  );
});

export const getPOSuggestions = asyncHandler(async (req, res) => {
  const filters = validatePOSuggestionFilters(req.query);
  const data = await getPOSuggestionsService({
    budgetItemId: filters.budgetItemId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "PO suggestions fetched successfully",
      data,
    }),
  );
});

export const getPOLinksForApproval = asyncHandler(async (req, res) => {
  const filters = validatePOApprovalFilters(req.query);
  const result = await getPOLinksForApprovalService({
    status: filters.status,
    financialYearId: filters.financialYearId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "PO approval requests fetched successfully",
      data: result,
    }),
  );
});

export const createPOLink = asyncHandler(async (req, res) => {
  const payload = validateCreatePOLink(req.body);
  const result = await createPOLinkService(payload, req.user);

  await auditLog(req, {
    action: "CREATE_PO_LINK",
    entityName: `PO Link ${result.id}`,
    entityType: "PO_LINK",
    entityId: String(result.id),
    description: "Created PO link request",
    newValues: result,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "PO link request created successfully",
      data: result,
    }),
  );
});

export const approvePOLink = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const result = await approvePOLinkService(id, req.user);

  await auditLog(req, {
    action: "APPROVE_PO_LINK",
    entityName: `PO Link ${result.id}`,
    entityType: "PO_LINK",
    entityId: String(result.id),
    description: `Approved PO Link #${result.id}`,
    newValues: result,
  });

  return res.json(
    new ApiResponse({
      message: "PO link approved successfully",
      data: result,
    }),
  );
});

export const rejectPOLink = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const payload = validateRejectPOLink(req.body);
  const result = await rejectPOLinkService(id, payload.reason, req.user);

  await auditLog(req, {
    action: "REJECT_PO_LINK",
    entityName: `PO Link ${result.id}`,
    entityType: "PO_LINK",
    entityId: String(result.id),
    description: `Rejected PO Link #${result.id}`,
    newValues: result,
  });

  return res.json(
    new ApiResponse({
      message: "PO link rejected successfully",
      data: result,
    }),
  );
});

export const getPOLinkById = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const result = await getPOLinkByIdService(id, req.user, req.budgetAccess);

  return res.json(
    new ApiResponse({
      message: "PO link fetched successfully",
      data: result,
    }),
  );
});

export const getPOTransparency = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const result = await getPOTransparencyService(
    id,
    req.user,
    req.budgetAccess,
  );

  return res.json(
    new ApiResponse({
      message: "PO transparency data fetched successfully",
      data: result,
    }),
  );
});
