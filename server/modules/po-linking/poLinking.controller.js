import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import {
  approvePOLinkService,
  createManualPOItemMappingService,
  createPOLinkService,
  getAvailablePOsService,
  getMyPOLinksService,
  getPODashboardService,
  getPOBudgetItemsService,
  getPOItemMappingsService,
  getPackageItemOverallAveragePriceIntelligenceService,
  getPackageSubItemPOLinksService,
  getPackageSubItemPriceIntelligenceService,
  getPOLinkByIdService,
  getPOLinksForApprovalService,
  getPOSuggestionsService,
  getPOTransparencyService,
  rejectPOLinkService,
  searchBudgetTypesForMappingService,
  searchPOItemsForMappingService,
  setPOItemMappingStatusService,
} from "./poLinking.service.js";
import {
  validateCreatePOItemMapping,
  validateCreatePOLink,
  validateMappingId,
  validatePOApprovalFilters,
  validatePOFilters,
  validatePOItemMappingStatus,
  validatePOLinkId,
  validatePOSuggestionFilters,
  validateRejectPOLink,
} from "./poLinking.validators.js";

export const getAvailablePOs = asyncHandler(async (req, res) => {
  const filters = validatePOFilters(req.query);
  const data = await getAvailablePOsService(filters);
  res.json(new ApiResponse({ message: "Available PO records fetched successfully", data }));
});

export const getMyPOLinks = asyncHandler(async (req, res) => {
  const data = await getMyPOLinksService(req.user.userId);
  res.json(new ApiResponse({ message: "My PO links fetched successfully", data }));
});

export const getPODashboard = asyncHandler(async (req, res) => {
  const data = await getPODashboardService(req.user.userId, req.budgetAccess);
  res.json(new ApiResponse({ message: "PO dashboard fetched successfully", data }));
});

export const getPOBudgetItems = asyncHandler(async (req, res) => {
  const data = await getPOBudgetItemsService({ budgetAccess: req.budgetAccess });
  res.json(new ApiResponse({ message: "PO package sub-items fetched successfully", data }));
});

export const getPOSuggestions = asyncHandler(async (req, res) => {
  const filters = validatePOSuggestionFilters(req.query);
  const data = await getPOSuggestionsService({
    packageSubItemId: filters.packageSubItemId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "PO suggestions fetched successfully", data }));
});

export const getPOLinksForApproval = asyncHandler(async (req, res) => {
  const filters = validatePOApprovalFilters(req.query);
  const data = await getPOLinksForApprovalService({
    status: filters.status,
    financialYearId: filters.financialYearId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "PO approval requests fetched successfully", data }));
});

export const createPOLink = asyncHandler(async (req, res) => {
  const payload = validateCreatePOLink(req.body);
  const data = await createPOLinkService(payload, req.user, req.budgetAccess);

  await auditLog(req, {
    action: "CREATE_CATEGORY_PO_LINK",
    entityName: `Category PO Link ${data.id}`,
    entityType: "CATEGORY_PO_LINK",
    entityId: String(data.id),
    description: "Created category PO link request",
    newValues: data,
  });

  res.status(201).json(new ApiResponse({ message: "PO link request created successfully", data }));
});

export const approvePOLink = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const data = await approvePOLinkService(id, req.user, req.budgetAccess);

  await auditLog(req, {
    action: "APPROVE_CATEGORY_PO_LINK",
    entityName: `Category PO Link ${data.id}`,
    entityType: "CATEGORY_PO_LINK",
    entityId: String(data.id),
    description: `Approved category PO Link #${data.id}`,
    newValues: data,
  });

  res.json(new ApiResponse({ message: "PO link approved successfully", data }));
});

export const rejectPOLink = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const payload = validateRejectPOLink(req.body);
  const data = await rejectPOLinkService(id, payload.reason, req.user, req.budgetAccess);

  await auditLog(req, {
    action: "REJECT_CATEGORY_PO_LINK",
    entityName: `Category PO Link ${data.id}`,
    entityType: "CATEGORY_PO_LINK",
    entityId: String(data.id),
    description: `Rejected category PO Link #${data.id}`,
    newValues: data,
  });

  res.json(new ApiResponse({ message: "PO link rejected successfully", data }));
});

export const getPOLinkById = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const data = await getPOLinkByIdService(id, req.user, req.budgetAccess);
  res.json(new ApiResponse({ message: "PO link fetched successfully", data }));
});

export const getPOTransparency = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.id);
  const data = await getPOTransparencyService(id, req.user, req.budgetAccess);
  res.json(new ApiResponse({ message: "PO transparency data fetched successfully", data }));
});

export const getPackageSubItemPOLinks = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.packageSubItemId);
  const data = await getPackageSubItemPOLinksService({
    packageSubItemId: id,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Package sub-item PO links fetched successfully", data }));
});

export const getPackageSubItemPriceIntelligence = asyncHandler(async (req, res) => {
  const id = validatePOLinkId(req.params.packageSubItemId);
  const data = await getPackageSubItemPriceIntelligenceService({
    packageSubItemId: id,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Package sub-item price intelligence fetched successfully", data }));
});

export const getPackageItemOverallAveragePriceIntelligence = asyncHandler(
  async (req, res) => {
    const id = validatePOLinkId(req.params.packageSubItemId);
    const data =
      await getPackageItemOverallAveragePriceIntelligenceService({
        packageSubItemId: id,
        budgetAccess: req.budgetAccess,
      });

    res.json(
      new ApiResponse({
        message:
          "Package item overall average price intelligence fetched successfully",
        data,
      }),
    );
  },
);

export const getPOItemMappings = asyncHandler(async (req, res) => {
  const data = await getPOItemMappingsService(req.query);
  res.json(new ApiResponse({ message: "PO catalog mappings fetched successfully", data }));
});

export const createManualPOItemMapping = asyncHandler(async (req, res) => {
  const payload = validateCreatePOItemMapping(req.body);
  const data = await createManualPOItemMappingService(payload, req.user);
  res.status(201).json(new ApiResponse({ message: "PO catalog mapping created successfully", data }));
});

export const setPOItemMappingStatus = asyncHandler(async (req, res) => {
  const id = validateMappingId(req.params.id);
  const payload = validatePOItemMappingStatus(req.body);
  const data = await setPOItemMappingStatusService(id, payload, req.user);
  res.json(new ApiResponse({ message: "PO catalog mapping status updated successfully", data }));
});

export const searchBudgetTypesForMapping = asyncHandler(async (req, res) => {
  const data = await searchBudgetTypesForMappingService(req.query);
  res.json(new ApiResponse({ message: "Catalog sub-items fetched successfully", data }));
});

export const searchPOItemsForMapping = asyncHandler(async (req, res) => {
  const data = await searchPOItemsForMappingService(req.query);
  res.json(new ApiResponse({ message: "PO items fetched successfully", data }));
});
