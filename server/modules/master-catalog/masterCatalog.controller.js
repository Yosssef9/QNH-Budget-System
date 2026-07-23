import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";

import {
  createCatalogItemService,
  createCategoryService,
  createSubItemService,
  deactivateCategoryService,
  getAllCatalogItemsService,
  getCatalogItemsByCategoryService,
  getCatalogItemUsageService,
  getCategoriesService,
  getCategoryUsageService,
  getSubItemsByCatalogItemService,
  getUnitsService,
  updateCatalogItemService,
  updateCatalogItemStatusService,
  updateCategoryService,
  updateSubItemService,
  updateSubItemStatusService,
} from "./masterCatalog.service.js";

import {
  validateCreateCatalogItem,
  validateCreateCategory,
  validateCreateSubItem,
  validatePositiveInt,
  validateStatusPayload,
  validateUpdateCatalogItem,
  validateUpdateCategory,
  validateUpdateSubItem,
} from "./masterCatalog.validators.js";

function actorUserId(req) {
  return req.user?.userId ?? req.user?.USER_ID ?? req.user?.id ?? null;
}

export const getCategories = asyncHandler(async (req, res) => {
  const data = await getCategoriesService(req.budgetAccess);

  res.json(
    new ApiResponse({
      message: "Categories fetched successfully",
      data,
    }),
  );
});

export const createCategory = asyncHandler(async (req, res) => {
  const payload = validateCreateCategory(req.body);

  const data = await createCategoryService(payload, actorUserId(req));

  await auditLog(req, {
    action: "CREATE_BUDGET_CATEGORY",
    entityType: "BUDGET_CATEGORY",
    entityId: String(data.id),
    entityName: data.name,
    description: `Created budget category "${data.name}"`,
    newValues: data,
  });

  res.status(201).json(
    new ApiResponse({
      message: "Category created successfully",
      data,
    }),
  );
});

export const updateCategory = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.categoryId, "categoryId");

  const payload = validateUpdateCategory(req.body);

  const data = await updateCategoryService(id, payload, actorUserId(req));

  await auditLog(req, {
    action: "UPDATE_BUDGET_CATEGORY",
    entityType: "BUDGET_CATEGORY",
    entityId: String(data.id),
    entityName: data.name,
    description: `Updated budget category "${data.name}"`,
    newValues: data,
  });

  res.json(
    new ApiResponse({
      message: "Category updated successfully",
      data,
    }),
  );
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.categoryId, "categoryId");

  const data = await deactivateCategoryService(id);

  res.json(
    new ApiResponse({
      message: "Category deactivated successfully",
      data,
    }),
  );
});

export const getUnits = asyncHandler(async (req, res) => {
  const data = await getUnitsService(req.budgetAccess);

  res.json(
    new ApiResponse({
      message: "Units of measure fetched successfully",
      data,
    }),
  );
});
export const getCatalogItemsByCategory = asyncHandler(async (req, res) => {
  const categoryId = validatePositiveInt(req.params.categoryId, "categoryId");
  const includeInactive =
    req.query.includeInactive === "1" ||
    req.query.includeInactive === "true";

  const data = await getCatalogItemsByCategoryService(
    categoryId,
    req.budgetAccess,
    { includeInactive },
  );

  res.json(
    new ApiResponse({
      message: "Catalog items fetched successfully",
      data,
    }),
  );
});

export const getAllCatalogItems = asyncHandler(async (_req, res) => {
  const data = await getAllCatalogItemsService();

  res.json(
    new ApiResponse({
      message: "Catalog items fetched successfully",
      data,
    }),
  );
});

export const createCatalogItem = asyncHandler(async (req, res) => {
  const categoryId = validatePositiveInt(req.params.categoryId, "categoryId");

  const payload = validateCreateCatalogItem(req.body);

  const data = await createCatalogItemService({
    categoryId,
    payload,
    actorUserId: actorUserId(req),
  });

  await auditLog(req, {
    action: "CREATE_CATALOG_ITEM",
    entityType: "BUDGET_CATALOG_ITEM",
    entityId: String(data.id),
    entityName: data.name,
    description: `Created catalog item "${data.name}"`,
    newValues: data,
  });

  res.status(201).json(
    new ApiResponse({
      message: "Catalog item created successfully",
      data,
    }),
  );
});

export const updateCatalogItem = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.itemId, "itemId");

  const payload = validateUpdateCatalogItem(req.body);

  const data = await updateCatalogItemService({
    id,
    payload,
    actorUserId: actorUserId(req),
  });

  await auditLog(req, {
    action: "UPDATE_CATALOG_ITEM",
    entityType: "BUDGET_CATALOG_ITEM",
    entityId: String(data.id),
    entityName: data.name,
    description: `Updated catalog item "${data.name}"`,
    newValues: data,
  });

  res.json(
    new ApiResponse({
      message: "Catalog item updated successfully",
      data,
    }),
  );
});

export const updateCatalogItemStatus = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.itemId, "itemId");

  const { is_active } = validateStatusPayload(req.body);

  const data = await updateCatalogItemStatusService({
    id,
    isActive: is_active,
    actorUserId: actorUserId(req),
  });

  await auditLog(req, {
    action: "UPDATE_CATALOG_ITEM_STATUS",
    entityType: "BUDGET_CATALOG_ITEM",
    entityId: String(data?.id ?? id),
    entityName: data?.name || `Catalog item #${id}`,
    description:
      `${is_active ? "Activated" : "Deactivated"} ` + `catalog item #${id}`,
    newValues: data,
  });

  res.json(
    new ApiResponse({
      message: "Catalog item status updated successfully",
      data,
    }),
  );
});

export const getCategoryUsage = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.categoryId, "categoryId");

  const data = await getCategoryUsageService(id);

  res.json(
    new ApiResponse({
      message: "Category usage fetched successfully",
      data,
    }),
  );
});

export const getCatalogItemUsage = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.itemId, "itemId");

  const data = await getCatalogItemUsageService(id);

  res.json(
    new ApiResponse({
      message: "Catalog item usage fetched successfully",
      data,
    }),
  );
});

export const getSubItemsByCatalogItem = asyncHandler(async (req, res) => {
  const itemId = validatePositiveInt(req.params.itemId, "itemId");

  const data = await getSubItemsByCatalogItemService(itemId, req.budgetAccess);

  res.json(
    new ApiResponse({
      message: "Sub-items fetched successfully",
      data,
    }),
  );
});

export const createSubItem = asyncHandler(async (req, res) => {
  const itemId = validatePositiveInt(req.params.itemId, "itemId");

  const payload = validateCreateSubItem(req.body);

  const data = await createSubItemService({
    catalogItemId: itemId,
    payload,
    actorUserId: actorUserId(req),
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CREATE_CATALOG_SUB_ITEM",
    entityType: "BUDGET_CATALOG_SUB_ITEM",
    entityId: String(data.id),
    entityName: data.name,
    description: `Created reusable catalog sub-item "${data.name}"`,
    newValues: data,
  });

  res.status(201).json(
    new ApiResponse({
      message: "Sub-item created successfully",
      data,
    }),
  );
});

export const updateSubItem = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.subItemId, "subItemId");

  const payload = validateUpdateSubItem(req.body);

  const data = await updateSubItemService({
    id,
    payload,
    actorUserId: actorUserId(req),
  });

  await auditLog(req, {
    action: "UPDATE_CATALOG_SUB_ITEM",
    entityType: "BUDGET_CATALOG_SUB_ITEM",
    entityId: String(data.id),
    entityName: data.name,
    description: `Updated reusable catalog sub-item "${data.name}"`,
    newValues: data,
  });

  res.json(
    new ApiResponse({
      message: "Sub-item updated successfully",
      data,
    }),
  );
});

export const updateSubItemStatus = asyncHandler(async (req, res) => {
  const id = validatePositiveInt(req.params.subItemId, "subItemId");

  const { is_active } = validateStatusPayload(req.body);

  const data = await updateSubItemStatusService({
    id,
    isActive: is_active,
    actorUserId: actorUserId(req),
  });

  await auditLog(req, {
    action: "UPDATE_CATALOG_SUB_ITEM_STATUS",
    entityType: "BUDGET_CATALOG_SUB_ITEM",
    entityId: String(data?.id ?? id),
    entityName: data?.name || `Catalog sub-item #${id}`,
    description:
      `${is_active ? "Activated" : "Deactivated"} ` + `catalog sub-item #${id}`,
    newValues: data,
  });

  res.json(
    new ApiResponse({
      message: "Sub-item status updated successfully",
      data,
    }),
  );
});
