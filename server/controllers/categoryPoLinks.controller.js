import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { auditLog } from "../utils/audit.js";
import {
  approveCategoryPoLinkService,
  createCategoryPoLinkService,
  getAvailableCategoryPOsService,
  getCategoryPoLinkByIdService,
  getCategoryPoLinksForApprovalService,
  getCategoryPOSuggestionsService,
  getEligibleCategoryPoSubItemsService,
  getMyCategoryPoLinksService,
  rejectCategoryPoLinkService,
} from "../services/categoryPoLinks.service.js";
import {
  validateAvailablePOFilters,
  validateCategoryPoLinkId,
  validateCategoryPoLinkStatus,
  validateCreateCategoryPoLink,
  validateRejectCategoryPoLink,
  validateReviewSubItemLineId,
} from "../validators/categoryPoLinks.validator.js";

export const getAvailableCategoryPOs = asyncHandler(async (req, res) => {
  const filters = validateAvailablePOFilters(req.query);
  const data = await getAvailableCategoryPOsService(filters);

  return res.json(
    new ApiResponse({
      message: "Available PO records fetched successfully",
      data,
    }),
  );
});

export const getEligibleCategoryPoSubItems = asyncHandler(async (req, res) => {
  const data = await getEligibleCategoryPoSubItemsService({
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Eligible PO sub-items fetched successfully",
      data,
    }),
  );
});

export const getCategoryPOSuggestions = asyncHandler(async (req, res) => {
  const lineId = validateReviewSubItemLineId(req.query.lineId);
  const data = await getCategoryPOSuggestionsService({
    lineId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "PO suggestions fetched successfully",
      data,
    }),
  );
});

export const createCategoryPoLink = asyncHandler(async (req, res) => {
  const payload = validateCreateCategoryPoLink(req.body);
  const data = await createCategoryPoLinkService({
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CREATE_CATEGORY_PO_LINK",
    entityType: "CATEGORY_PO_LINK",
    entityId: String(data.id),
    entityName: "Category PO Link",
    description: "Created category PO link request",
    newValues: data,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Category PO link request created successfully",
      data,
    }),
  );
});

export const getMyCategoryPoLinks = asyncHandler(async (req, res) => {
  const status = validateCategoryPoLinkStatus(req.query.status);
  const data = await getMyCategoryPoLinksService({
    status,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "My category PO links fetched successfully",
      data,
    }),
  );
});

export const getCategoryPoLinksForApproval = asyncHandler(async (req, res) => {
  const status = validateCategoryPoLinkStatus(req.query.status || "PENDING");
  const data = await getCategoryPoLinksForApprovalService({
    status,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category PO link approvals fetched successfully",
      data,
    }),
  );
});

export const getCategoryPoLinkById = asyncHandler(async (req, res) => {
  const poLinkId = validateCategoryPoLinkId(req.params.poLinkId);
  const data = await getCategoryPoLinkByIdService({
    poLinkId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category PO link fetched successfully",
      data,
    }),
  );
});

export const approveCategoryPoLink = asyncHandler(async (req, res) => {
  const poLinkId = validateCategoryPoLinkId(req.params.poLinkId);
  const data = await approveCategoryPoLinkService({
    poLinkId,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "APPROVE_CATEGORY_PO_LINK",
    entityType: "CATEGORY_PO_LINK",
    entityId: String(poLinkId),
    entityName: "Category PO Link",
    description: "Approved category PO link request",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Category PO link approved successfully",
      data,
    }),
  );
});

export const rejectCategoryPoLink = asyncHandler(async (req, res) => {
  const poLinkId = validateCategoryPoLinkId(req.params.poLinkId);
  const payload = validateRejectCategoryPoLink(req.body);
  const data = await rejectCategoryPoLinkService({
    poLinkId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "REJECT_CATEGORY_PO_LINK",
    entityType: "CATEGORY_PO_LINK",
    entityId: String(poLinkId),
    entityName: "Category PO Link",
    description: "Rejected category PO link request",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Category PO link rejected successfully",
      data,
    }),
  );
});
