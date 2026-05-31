import { ApiError } from "../utils/apiError.js";
import {
  createCategoryRepo,
  createTypeRepo,
  findCategoryByIdRepo,
  findCategoryByNameRepo,
  findTypeByIdRepo,
  findTypeByNameInCategoryRepo,
  getCategoriesRepo,
  getTypesByCategoryRepo,
  reactivateCategoryRepo,
  reactivateTypeRepo,
  updateCategoryRepo,
  updateTypeRepo,
  deleteCategoryRepo,
  deleteTypeRepo,
  getCategoryUsageRepo,
  getTypeUsageRepo,
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
export async function updateCategoryService({ categoryId, name }) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  const existing = await findCategoryByNameRepo(name);

  if (existing && Number(existing.id) !== Number(categoryId)) {
    throw new ApiError(
      409,
      "Another category with this name already exists",
      "CATEGORY_ALREADY_EXISTS",
    );
  }

  return await updateCategoryRepo({ categoryId, name });
}

export async function updateTypeService({
  categoryId,
  typeId,
  name,
  expenseType,
}) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  const type = await findTypeByIdRepo(typeId);

  if (!type) {
    throw new ApiError(404, "Type not found", "TYPE_NOT_FOUND");
  }
  const usage = await getTypeUsageRepo(typeId);

  if (
    usage.length > 0 &&
    String(type.expense_type).toUpperCase() !==
      String(expenseType).toUpperCase()
  ) {
    throw new ApiError(
      409,
      "This type is already used in budgets. You can rename it, but you cannot change its expense type.",
      "USED_TYPE_EXPENSE_TYPE_LOCKED",
    );
  }
  const existing = await findTypeByNameInCategoryRepo(categoryId, name);

  if (existing && Number(existing.id) !== Number(typeId)) {
    throw new ApiError(
      409,
      "Another type with this name already exists in this category",
      "TYPE_ALREADY_EXISTS",
    );
  }

  return await updateTypeRepo({
    typeId,
    categoryId,
    name,
    expenseType,
  });
}
export async function getCategoryUsageService(categoryId) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  return await getCategoryUsageRepo(categoryId);
}

export async function getTypeUsageService({ categoryId, typeId }) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  const type = await findTypeByIdRepo(typeId);

  if (!type || Number(type.category_id) !== Number(categoryId)) {
    throw new ApiError(404, "Type not found", "TYPE_NOT_FOUND");
  }

  return await getTypeUsageRepo(typeId);
}

export async function deleteCategoryService(categoryId) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  return await deleteCategoryRepo(categoryId);
}

export async function deleteTypeService({ categoryId, typeId }) {
  const category = await findCategoryByIdRepo(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND");
  }

  const type = await findTypeByIdRepo(typeId);

  if (!type || Number(type.category_id) !== Number(categoryId)) {
    throw new ApiError(404, "Type not found", "TYPE_NOT_FOUND");
  }

  return await deleteTypeRepo({ categoryId, typeId });
}
