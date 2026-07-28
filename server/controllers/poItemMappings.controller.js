import {
  createManualPOItemMappingService,
  getPOItemMappingCategoriesService,
  getPOItemMappingCatalogItemsService,
  getPOItemMappingCatalogSubItemsService,
  getPOItemMappingsService,
  searchBudgetTypesForMappingService,
  searchPOItemsForMappingService,
  setPOItemMappingStatusService,
} from "../services/poItemMappings.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  validateCreatePOItemMapping,
  validateMappingSearchFilters,
  validatePOItemMappingFilters,
  validatePOItemMappingId,
  validatePOItemMappingStatus,
  validatePositiveInt,
} from "../validators/poItemMappings.validator.js";

export const getPOItemMappings = asyncHandler(async (req, res) => {
  const filters = validatePOItemMappingFilters(req.query);
  const data = await getPOItemMappingsService(filters);

  return res.json(
    new ApiResponse({
      message: "PO item mappings fetched successfully",
      data,
    }),
  );
});

export const createManualPOItemMapping = asyncHandler(async (req, res) => {
  const payload = validateCreatePOItemMapping(req.body);
  const data = await createManualPOItemMappingService(payload, req.user);

  return res.status(201).json(
    new ApiResponse({
      message: "PO item mapping created successfully",
      data,
    }),
  );
});

export const setPOItemMappingStatus = asyncHandler(async (req, res) => {
  const id = validatePOItemMappingId(req.params.id);
  const payload = validatePOItemMappingStatus(req.body);
  const data = await setPOItemMappingStatusService(id, payload, req.user);

  return res.json(
    new ApiResponse({
      message: "PO item mapping status updated successfully",
      data,
    }),
  );
});

export const searchBudgetTypesForMapping = asyncHandler(async (req, res) => {
  const filters = validateMappingSearchFilters(req.query);
  const data = await searchBudgetTypesForMappingService(filters);

  return res.json(
    new ApiResponse({
      message: "Budget item types fetched successfully",
      data,
    }),
  );
});

export const searchPOItemsForMapping = asyncHandler(async (req, res) => {
  const filters = validateMappingSearchFilters(req.query);
  const data = await searchPOItemsForMappingService(filters);

  return res.json(
    new ApiResponse({
      message: "PO item codes fetched successfully",
      data,
    }),
  );
});

export const getPOItemMappingCategories = asyncHandler(async (_req, res) => {
  const data = await getPOItemMappingCategoriesService();

  return res.json(
    new ApiResponse({
      message: "Budget categories fetched successfully",
      data,
    }),
  );
});

export const getPOItemMappingCatalogItems = asyncHandler(async (req, res) => {
  const categoryId = validatePositiveInt(req.params.categoryId, "categoryId");
  const data = await getPOItemMappingCatalogItemsService(categoryId);

  return res.json(
    new ApiResponse({
      message: "Catalog items fetched successfully",
      data,
    }),
  );
});

export const getPOItemMappingCatalogSubItems = asyncHandler(
  async (req, res) => {
    const catalogItemId = validatePositiveInt(req.params.itemId, "itemId");
    const data = await getPOItemMappingCatalogSubItemsService(catalogItemId);

    return res.json(
      new ApiResponse({
        message: "Catalog sub-items fetched successfully",
        data,
      }),
    );
  },
);
