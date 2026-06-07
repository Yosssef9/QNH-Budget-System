import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { auditLog } from "../utils/audit.js";
import {
  createCategoryService,
  createTypeService,
  getCategoriesService,
  getTypesByCategoryService,
  updateCategoryService,
  updateTypeService,
  deleteCategoryService,
  deleteTypeService,
  getCategoryUsageService,
  getTypeUsageService,
  getAllTypesService,
  getAvailableTransferTypesService,
} from "../services/category.service.js";

import {
  validateCategoryId,
  validateCreateCategory,
  validateCreateType,
  validateTypeId,
} from "../validators/category.validator.js";
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await getCategoriesService();

  return res.json(
    new ApiResponse({
      message: "Categories fetched successfully",
      data: categories,
    }),
  );
});

export const getTypesByCategory = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const types = await getTypesByCategoryService(categoryId);

  return res.json(
    new ApiResponse({
      message: "Types fetched successfully",
      data: types,
    }),
  );
});

export const createCategory = asyncHandler(async (req, res) => {
  const payload = validateCreateCategory(req.body);
  const category = await createCategoryService(payload);
  await auditLog(req, {
    action: "CREATE_CATEGORY",
    entityName: category.name,
    entityType: "BUDGET_CATEGORY",
    entityId: String(category.id),
    description: `Created budget category "${category.name}"`,
    newValues: category,
  });
  return res.status(201).json(
    new ApiResponse({
      message: "Category created successfully",
      data: category,
    }),
  );
});

export const createType = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const payload = validateCreateType(req.body);

  const type = await createTypeService({
    categoryId,
    name: payload.name,
    expenseType: payload.expense_type,
  });
  await auditLog(req, {
    action: "CREATE_TYPE",
    entityName: type.name,
    entityType: "BUDGET_TYPE",
    entityId: String(type.id),
    description: `Created budget type "${type.name}"`,
    newValues: type,
  });
  return res.status(201).json(
    new ApiResponse({
      message: "Type created successfully",
      data: type,
    }),
  );
});

export const updateCategory = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const payload = validateCreateCategory(req.body);

  const category = await updateCategoryService({
    categoryId,
    name: payload.name,
  });
  await auditLog(req, {
    action: "UPDATE_CATEGORY",
    entityName: category.name,
    entityType: "BUDGET_CATEGORY",
    entityId: String(categoryId),
    description: `Updated budget category "${category.name}"`,
    newValues: category,
  });
  return res.json(
    new ApiResponse({
      message: "Category updated successfully",
      data: category,
    }),
  );
});

export const updateType = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const typeId = validateTypeId(req.params.typeId);
  const payload = validateCreateType(req.body);

  const type = await updateTypeService({
    categoryId,
    typeId,
    name: payload.name,
    expenseType: payload.expense_type,
  });
  await auditLog(req, {
    action: "UPDATE_TYPE",
    entityName: type.name,
    entityType: "BUDGET_TYPE",
    entityId: String(typeId),
    description: `Updated budget type "${type.name}"`,
    newValues: type,
  });
  return res.json(
    new ApiResponse({
      message: "Type updated successfully",
      data: type,
    }),
  );
});

export const getCategoryUsage = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const usage = await getCategoryUsageService(categoryId);

  return res.json(
    new ApiResponse({
      message: "Category usage fetched successfully",
      data: usage,
    }),
  );
});

export const getTypeUsage = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const typeId = validateTypeId(req.params.typeId);

  const usage = await getTypeUsageService({ categoryId, typeId });

  return res.json(
    new ApiResponse({
      message: "Type usage fetched successfully",
      data: usage,
    }),
  );
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const category = await deleteCategoryService(categoryId);

  await auditLog(req, {
    action: "DEACTIVATE_CATEGORY",
    entityName: category.name,
    entityType: "BUDGET_CATEGORY",
    entityId: String(category.id),
    description: `Deactivated budget category "${category.name}"`,
    newValues: category,
  });

  return res.json(
    new ApiResponse({
      message: "Category deactivated successfully",
      data: category,
    }),
  );
});
export const deleteType = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const typeId = validateTypeId(req.params.typeId);

  const type = await deleteTypeService({ categoryId, typeId });

  await auditLog(req, {
    action: "DEACTIVATE_TYPE",
    entityName: type.name,
    entityType: "BUDGET_TYPE",
    entityId: String(type.id),
    description: `Deactivated budget type "${type.name}"`,
    newValues: type,
  });

  return res.json(
    new ApiResponse({
      message: "Item/type deactivated successfully",
      data: type,
    }),
  );
});
export const getAllTypes = asyncHandler(async (req, res) => {
  const types = await getAllTypesService();

  return res.json(
    new ApiResponse({
      message: "Types fetched successfully",
      data: types,
    }),
  );
});
export const getAvailableTransferTypes = asyncHandler(async (req, res) => {
  const budgetId = req.user.currentBudgetId;
  console.log("USER =", req.user);
  console.log("BUDGET ACCESS =", req.budgetAccess);
  const data = await getAvailableTransferTypesService(budgetId);

  return res.json(
    new ApiResponse({
      message: "Available types fetched successfully",
      data,
    }),
  );
});
