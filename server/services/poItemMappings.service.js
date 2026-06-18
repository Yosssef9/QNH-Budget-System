import { ApiError } from "../utils/apiError.js";
import {
  createManualPOItemMappingRepo,
  findPOItemMappingByIdRepo,
  findPOItemMappingByTypeAndCodeRepo,
  getPOItemMappingsRepo,
  searchBudgetTypesForMappingRepo,
  searchPOItemsForMappingRepo,
  setPOItemMappingStatusRepo,
} from "../repositories/poItemMappings.repository.js";

export async function getPOItemMappingsService(filters = {}) {
  return getPOItemMappingsRepo(filters);
}

export async function createManualPOItemMappingService(payload, user) {
  const existing = await findPOItemMappingByTypeAndCodeRepo({
    budgetTypeId: payload.budget_type_id,
    poItemCode: payload.po_item_code,
  });

  if (existing?.is_active) {
    throw new ApiError(
      409,
      "This PO item mapping already exists",
      "PO_ITEM_MAPPING_EXISTS",
    );
  }

  if (existing) {
    throw new ApiError(
      409,
      "This PO item mapping already exists but is inactive. Re-enable the existing mapping instead of creating a duplicate.",
      "PO_ITEM_MAPPING_INACTIVE",
    );
  }

  const created = await createManualPOItemMappingRepo({
    ...payload,
    created_by: user.userId,
  });

  if (!created) {
    throw new ApiError(500, "Failed to create PO item mapping");
  }

  return created;
}

export async function setPOItemMappingStatusService(id, payload, user) {
  const mapping = await findPOItemMappingByIdRepo(id);

  if (!mapping) {
    throw new ApiError(404, "PO item mapping not found");
  }

  if (payload.is_active === false && !payload.disabled_reason) {
    throw new ApiError(
      400,
      "Disable reason is required",
      "VALIDATION_ERROR",
    );
  }

  if (Boolean(mapping.is_active) === payload.is_active) {
    return mapping;
  }

  const updated = await setPOItemMappingStatusRepo({
    id,
    isActive: payload.is_active,
    userId: user.userId,
    reason: payload.disabled_reason,
  });

  if (!updated) {
    throw new ApiError(500, "Failed to update PO item mapping status");
  }

  return updated;
}

export async function searchBudgetTypesForMappingService(filters = {}) {
  return searchBudgetTypesForMappingRepo(filters);
}

export async function searchPOItemsForMappingService(filters = {}) {
  return searchPOItemsForMappingRepo(filters);
}
