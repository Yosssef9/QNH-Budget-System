import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  createCategoryService,
  createTypeService,
  getCategoriesService,
  getTypesByCategoryService,
} from "../services/category.service.js";
import {
  validateCategoryId,
  validateCreateCategory,
  validateCreateType,
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
