import { ApiError } from "../utils/apiError.js";
import {
  createCategoryRepo,
  createTypeRepo,
  findCategoryByIdRepo,
  findCategoryByNameRepo,
  findTypeByNameInCategoryRepo,
  getCategoriesRepo,
  getTypesByCategoryRepo,
  reactivateCategoryRepo,
  reactivateTypeRepo,
} from "../repositories/category.repository.js";

export async function getCategoriesService() {
  return await getCategoriesRepo();
}

export async function getTypesByCategoryService(categoryId) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  return await getTypesByCategoryRepo(categoryId);
}

export async function createCategoryService({ name }) {
  const existing = await findCategoryByNameRepo(name);

  if (existing?.is_active === true || existing?.is_active === 1) {
    throw new ApiError(
      409,
      "Category already exists",
      "CATEGORY_ALREADY_EXISTS",
    );
  }

  if (existing) {
    return await reactivateCategoryRepo(existing.id);
  }

  return await createCategoryRepo({ name });
}

export async function createTypeService({ categoryId, name, expenseType }) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  const existing = await findTypeByNameInCategoryRepo(categoryId, name);

  if (existing?.is_active === true || existing?.is_active === 1) {
    throw new ApiError(
      409,
      "Type already exists in this category",
      "TYPE_ALREADY_EXISTS",
    );
  }

  if (existing) {
    return await reactivateTypeRepo(existing.id, expenseType);
  }

  return await createTypeRepo({ categoryId, name, expenseType });
}
