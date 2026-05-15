import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
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

  return res.json(
    new ApiResponse({
      message: "Category deleted successfully",
      data: category,
    }),
  );
});

export const deleteType = asyncHandler(async (req, res) => {
  const categoryId = validateCategoryId(req.params.categoryId);
  const typeId = validateTypeId(req.params.typeId);

  const type = await deleteTypeService({ categoryId, typeId });

  return res.json(
    new ApiResponse({
      message: "Type deleted successfully",
      data: type,
    }),
  );
});
