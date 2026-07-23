import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";

import { hasPermission } from "../../../shared/permissions/permissionCodes.js";

import {
  CATEGORY_PACKAGE_SUB_ITEM_PERMISSION,
  CATEGORY_SORT_ORDER,
  GENERAL_SUB_ITEM,
  MASTER_CATALOG_PERMISSION,
} from "./masterCatalog.constants.js";

import {
  mapCatalogItem,
  mapCategory,
  mapSubItem,
  mapUnit,
} from "./masterCatalog.mapper.js";

import {
  countActiveGeneralSubItemsRepo,
  createCatalogItemRepo,
  createCategoryRepo,
  createSubItemRepo,
  findCatalogItemByCodeRepo,
  findCatalogItemByIdRepo,
  findCatalogItemByNameInCategoryRepo,
  findCategoryByCodeRepo,
  findCategoryByIdRepo,
  findSubItemByCodeRepo,
  findSubItemByIdRepo,
  findSubItemByNameRepo,
  findUnitByIdRepo,
  getAllCatalogItemsRepo,
  getCatalogItemUsageRepo,
  getCatalogItemsByCategoryRepo,
  getCategoriesRepo,
  getCategoryUsageRepo,
  getNextCatalogItemSortOrderRepo,
  getSubItemsByCatalogItemRepo,
  getUnitsRepo,
  updateCatalogItemRepo,
  updateCatalogItemStatusRepo,
  updateCategoryRepo,
  updateSubItemRepo,
  updateSubItemStatusRepo,
} from "./masterCatalog.repository.js";

function normalizeNullableInt(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return Number(value);
}

function getWorkspaceDepartmentId(access) {
  return (
    access?.department?.id ??
    access?.selectedWorkspace?.department?.id ??
    access?.workspace?.department?.id ??
    null
  );
}

function getWorkspaceCategoryId(access) {
  return (
    access?.budgetCategory?.id ??
    access?.category?.id ??
    access?.selectedWorkspace?.budgetCategory?.id ??
    access?.workspace?.budgetCategory?.id ??
    null
  );
}

function hasCatalogManagementAccess(access) {
  return hasPermission(access, MASTER_CATALOG_PERMISSION);
}

function assertCatalogLookupAccess(access, requestedCategoryId = null) {
  /*
   * A Master Catalog administrator can read all catalog data.
   */
  if (hasCatalogManagementAccess(access)) {
    return;
  }

  /*
   * A Department workspace can prepare budgets under all three
   * responsibility categories.
   */
  if (getWorkspaceDepartmentId(access)) {
    return;
  }

  /*
   * A Category workspace can read only its assigned category.
   */
  const workspaceCategoryId = getWorkspaceCategoryId(access);

  if (
    workspaceCategoryId &&
    (requestedCategoryId === null ||
      Number(workspaceCategoryId) === Number(requestedCategoryId))
  ) {
    return;
  }

  throw new ApiError(
    403,
    "The active workspace cannot access this catalog data",
    "MASTER_CATALOG_LOOKUP_FORBIDDEN",
  );
}
function assertCatalogSubItemCreateAccess(access, requestedCategoryId) {
  if (hasCatalogManagementAccess(access)) {
    return;
  }

  const workspaceCategoryId = getWorkspaceCategoryId(access);

  if (
    workspaceCategoryId &&
    Number(workspaceCategoryId) === Number(requestedCategoryId) &&
    hasPermission(access, CATEGORY_PACKAGE_SUB_ITEM_PERMISSION)
  ) {
    return;
  }

  throw new ApiError(
    403,
    "You do not have permission to create reusable models for this category",
    "CATALOG_SUB_ITEM_CREATE_FORBIDDEN",
  );
}
async function requireCategory(id) {
  const category = await findCategoryByIdRepo(id);

  if (!category || !category.is_active) {
    throw new ApiError(404, "Budget category not found", "CATEGORY_NOT_FOUND");
  }

  return category;
}

async function requireUnit(id) {
  if (!id) {
    throw new ApiError(
      400,
      "Unit of measure is required",
      "UNIT_OF_MEASURE_REQUIRED",
    );
  }

  const unit = await findUnitByIdRepo(id);

  if (!unit) {
    throw new ApiError(
      404,
      "Unit of measure not found",
      "UNIT_OF_MEASURE_NOT_FOUND",
    );
  }

  return unit;
}

async function requireCatalogItem(id) {
  const item = await findCatalogItemByIdRepo(id);

  if (!item || !item.is_active) {
    throw new ApiError(404, "Catalog item not found", "CATALOG_ITEM_NOT_FOUND");
  }

  return item;
}

function withActor(payload = {}, actorUserId) {
  return {
    ...payload,
    created_by: normalizeNullableInt(actorUserId),
    updated_by: normalizeNullableInt(actorUserId),
  };
}

export async function getCategoriesService(access) {
  assertCatalogLookupAccess(access);

  const categories = (await getCategoriesRepo()).map(mapCategory);

  /*
   * Department and Master Catalog administration workspaces
   * can see all active categories.
   */
  if (hasCatalogManagementAccess(access) || getWorkspaceDepartmentId(access)) {
    return categories;
  }

  /*
   * Category workspaces receive only their assigned category.
   */
  const workspaceCategoryId = getWorkspaceCategoryId(access);

  return categories.filter(
    (category) => Number(category.id) === Number(workspaceCategoryId),
  );
}

export async function createCategoryService(payload, actorUserId = null) {
  const existing = await findCategoryByCodeRepo(payload.category_code);

  if (existing?.is_active) {
    throw new ApiError(
      409,
      "Budget category already exists",
      "CATEGORY_ALREADY_EXISTS",
    );
  }

  if (existing) {
    throw new ApiError(
      409,
      "Budget category already exists but is inactive",
      "CATEGORY_ALREADY_EXISTS_INACTIVE",
    );
  }

  const created = await createCategoryRepo({
    ...payload,
    sort_order: CATEGORY_SORT_ORDER[payload.category_code],
    created_by: normalizeNullableInt(actorUserId),
  });

  return mapCategory(created);
}

export async function updateCategoryService(id, payload, actorUserId = null) {
  await requireCategory(id);

  const updated = await updateCategoryRepo(id, {
    ...payload,
    updated_by: normalizeNullableInt(actorUserId),
  });

  if (!updated) {
    throw new ApiError(404, "Budget category not found", "CATEGORY_NOT_FOUND");
  }

  return mapCategory(updated);
}

export async function deactivateCategoryService(id) {
  await requireCategory(id);

  throw new ApiError(
    409,
    "Budget responsibility categories cannot be deactivated during the new workflow migration",
    "CATEGORY_DEACTIVATION_BLOCKED",
  );
}

export async function getUnitsService(access) {
  assertCatalogLookupAccess(access);
  return (await getUnitsRepo()).map(mapUnit);
}

export async function getCatalogItemsByCategoryService(
  categoryId,
  access,
  options = {},
) {
  assertCatalogLookupAccess(access, categoryId);

  if (options.includeInactive && !hasCatalogManagementAccess(access)) {
    throw new ApiError(
      403,
      "Only catalog administrators can view inactive catalog items",
      "INACTIVE_CATALOG_ITEMS_FORBIDDEN",
    );
  }

  await requireCategory(categoryId);

  return (
    await getCatalogItemsByCategoryRepo(categoryId, {
      includeInactive: Boolean(options.includeInactive),
    })
  ).map(mapCatalogItem);
}

export async function getAllCatalogItemsService() {
  return (await getAllCatalogItemsRepo()).map(mapCatalogItem);
}

async function validateCatalogItemUniqueness({
  categoryId,
  itemCode,
  name,
  excludeId = null,
}) {
  const existingName = await findCatalogItemByNameInCategoryRepo(
    categoryId,
    name,
  );

  if (existingName && Number(existingName.id) !== Number(excludeId)) {
    throw new ApiError(
      409,
      "A catalog item with this name already exists in this category",
      "CATALOG_ITEM_NAME_EXISTS",
    );
  }

  const existingCode = await findCatalogItemByCodeRepo(itemCode);

  if (existingCode && Number(existingCode.id) !== Number(excludeId)) {
    throw new ApiError(
      409,
      "A catalog item with this code already exists",
      "CATALOG_ITEM_CODE_EXISTS",
    );
  }
}

export async function createCatalogItemService({
  categoryId,
  payload,
  actorUserId = null,
}) {
  const category = await requireCategory(categoryId);

  const unit = await requireUnit(payload.unit_of_measure_id);

  await validateCatalogItemUniqueness({
    categoryId,
    itemCode: payload.item_code,
    name: payload.name,
  });

  const created = await withTransaction(async (transaction) => {
    const sortOrder = await getNextCatalogItemSortOrderRepo(
      category.id,
      transaction,
    );

    const item = await createCatalogItemRepo(transaction, {
      ...withActor(payload, actorUserId),
      budget_category_id: category.id,
      unit_of_measure_id: unit.id,
      sort_order: sortOrder,
    });

    await createSubItemRepo(transaction, {
      catalog_item_id: item.id,
      sub_item_code: GENERAL_SUB_ITEM.code,
      name: GENERAL_SUB_ITEM.name,
      default_specification: null,
      default_unit_of_measure_id: unit.id,
      is_default_general: true,
      created_by: normalizeNullableInt(actorUserId),
    });

    return item;
  });

  return mapCatalogItem(await findCatalogItemByIdRepo(created.id));
}

export async function updateCatalogItemService({
  id,
  payload,
  actorUserId = null,
}) {
  const existing = await requireCatalogItem(id);

  const unit = await requireUnit(payload.unit_of_measure_id);

  await validateCatalogItemUniqueness({
    categoryId: existing.budget_category_id,
    itemCode: payload.item_code,
    name: payload.name,
    excludeId: id,
  });

  const updated = await updateCatalogItemRepo(id, {
    ...withActor(payload, actorUserId),
    unit_of_measure_id: unit.id,
  });

  if (!updated) {
    throw new ApiError(404, "Catalog item not found", "CATALOG_ITEM_NOT_FOUND");
  }

  return mapCatalogItem(await findCatalogItemByIdRepo(id));
}

export async function updateCatalogItemStatusService({
  id,
  isActive,
  actorUserId = null,
}) {
  const existing = await findCatalogItemByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "Catalog item not found", "CATALOG_ITEM_NOT_FOUND");
  }

  const updated = await updateCatalogItemStatusRepo(
    id,
    isActive,
    normalizeNullableInt(actorUserId),
  );

  if (!updated) {
    throw new ApiError(404, "Catalog item not found", "CATALOG_ITEM_NOT_FOUND");
  }

  return mapCatalogItem(await findCatalogItemByIdRepo(id));
}

export async function getCatalogItemUsageService(id) {
  await requireCatalogItem(id);

  return getCatalogItemUsageRepo(id);
}

export async function getCategoryUsageService(id) {
  await requireCategory(id);

  return getCategoryUsageRepo(id);
}

export async function getSubItemsByCatalogItemService(catalogItemId, access) {
  const item = await requireCatalogItem(catalogItemId);

  assertCatalogLookupAccess(access, item.budget_category_id);

  return (await getSubItemsByCatalogItemRepo(catalogItemId)).map(mapSubItem);
}

async function validateSubItemUniqueness({
  catalogItemId,
  subItemCode,
  name,
  excludeId = null,
}) {
  const existingCode = subItemCode
    ? await findSubItemByCodeRepo(catalogItemId, subItemCode)
    : null;

  if (existingCode && Number(existingCode.id) !== Number(excludeId)) {
    throw new ApiError(
      409,
      "A reusable sub-item with this code already exists for this catalog item",
      "SUB_ITEM_CODE_EXISTS",
    );
  }

  const existingName = await findSubItemByNameRepo(catalogItemId, name);

  if (existingName && Number(existingName.id) !== Number(excludeId)) {
    throw new ApiError(
      409,
      "A reusable sub-item with this name already exists for this catalog item",
      "SUB_ITEM_NAME_EXISTS",
    );
  }
}

async function validateGeneralSubItemRule({
  catalogItemId,
  isDefaultGeneral,
  excludeId = null,
}) {
  if (!isDefaultGeneral) {
    return;
  }

  const activeGeneralCount =
    await countActiveGeneralSubItemsRepo(catalogItemId);

  if (activeGeneralCount > 0 && !excludeId) {
    throw new ApiError(
      409,
      "This catalog item already has an active General sub-item",
      "GENERAL_SUB_ITEM_EXISTS",
    );
  }
}

export async function createSubItemService({
  catalogItemId,
  payload,
  actorUserId = null,
  budgetAccess,
}) {
  if (
    !payload.is_default_general &&
    payload.sub_item_code !== null &&
    payload.sub_item_code !== undefined &&
    String(payload.sub_item_code).trim()
  ) {
    throw new ApiError(
      400,
      "Reusable model codes are generated automatically",
      "SUB_ITEM_CODE_GENERATED",
    );
  }

  const resolvedPayload = {
    ...payload,
    sub_item_code: payload.is_default_general ? GENERAL_SUB_ITEM.code : null,
  };

  /*
   * Load the parent generic catalog item.
   */
  const item = await requireCatalogItem(catalogItemId);

  /*
   * Only allow:
   * - Master Catalog Admin
   * - Category Manager assigned to this category
   *   with can_manage_category_budget_sub_items.
   */
  assertCatalogSubItemCreateAccess(budgetAccess, item.budget_category_id);

  /*
   * Validate the selected default unit.
   */
  const unit = await requireUnit(payload.default_unit_of_measure_id);

  await validateSubItemUniqueness({
    catalogItemId: item.id,
    subItemCode: resolvedPayload.sub_item_code,
    name: resolvedPayload.name,
  });

  await validateGeneralSubItemRule({
    catalogItemId: item.id,
    isDefaultGeneral: resolvedPayload.is_default_general,
  });

  const created = await withTransaction(async (transaction) =>
    createSubItemRepo(transaction, {
      ...withActor(resolvedPayload, actorUserId),
      catalog_item_id: item.id,
      default_unit_of_measure_id: unit.id,
    }),
  );

  return mapSubItem(await findSubItemByIdRepo(created.id));
}

export async function updateSubItemService({
  id,
  payload,
  actorUserId = null,
}) {
  if (
    payload.sub_item_code !== undefined &&
    payload.sub_item_code !== null &&
    String(payload.sub_item_code).trim()
  ) {
    throw new ApiError(
      400,
      "Reusable model codes are generated automatically and cannot be changed",
      "SUB_ITEM_CODE_READ_ONLY",
    );
  }

  const existing = await findSubItemByIdRepo(id);

  if (!existing || !existing.is_active) {
    throw new ApiError(404, "Sub-item not found", "SUB_ITEM_NOT_FOUND");
  }

  const unit = await requireUnit(payload.default_unit_of_measure_id);

  if (existing.is_default_general && !payload.is_default_general) {
    throw new ApiError(
      409,
      "The default General sub-item cannot be changed to a non-General sub-item",
      "GENERAL_SUB_ITEM_REQUIRED",
    );
  }

  if (!existing.is_default_general && payload.is_default_general) {
    await validateGeneralSubItemRule({
      catalogItemId: existing.catalog_item_id,
      isDefaultGeneral: true,
    });
  }

  await validateSubItemUniqueness({
    catalogItemId: existing.catalog_item_id,
    name: payload.name,
    excludeId: id,
  });

  const updated = await updateSubItemRepo(id, {
    ...withActor(payload, actorUserId),
    default_unit_of_measure_id: unit.id,
  });

  if (!updated) {
    throw new ApiError(404, "Sub-item not found", "SUB_ITEM_NOT_FOUND");
  }

  return mapSubItem(await findSubItemByIdRepo(id));
}

export async function updateSubItemStatusService({
  id,
  isActive,
  actorUserId = null,
}) {
  const existing = await findSubItemByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "Sub-item not found", "SUB_ITEM_NOT_FOUND");
  }

  if (existing.is_default_general && !isActive) {
    throw new ApiError(
      409,
      "The default General sub-item cannot be deactivated",
      "GENERAL_SUB_ITEM_REQUIRED",
    );
  }

  const updated = await updateSubItemStatusRepo(
    id,
    isActive,
    normalizeNullableInt(actorUserId),
  );

  if (!updated) {
    throw new ApiError(404, "Sub-item not found", "SUB_ITEM_NOT_FOUND");
  }

  return mapSubItem(await findSubItemByIdRepo(id));
}
