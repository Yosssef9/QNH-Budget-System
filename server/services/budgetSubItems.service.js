import { ApiError } from "../utils/apiError.js";
import { findBudgetTypeByIdRepo } from "../repositories/budgetRequests.repository.js";
import { findCategoryByCodeOrNameRepo } from "../repositories/categoryReviews.repository.js";
import {
  createBudgetSubItemRepo,
  deactivateBudgetSubItemRepo,
  findBudgetSubItemByIdRepo,
  findBudgetSubItemByNameRepo,
  getBudgetSubItemsByTypeRepo,
  updateBudgetSubItemRepo,
} from "../repositories/budgetSubItems.repository.js";

function normalizeCategoryCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "BIOMEDICAL") return "BIOMEDICAL";
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "IT") return "IT";

  return normalized;
}

async function resolveCategoryScope(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type !== "CATEGORY_BUDGET_MANAGEMENT") {
    throw new ApiError(
      403,
      "Switch to a Category Budget Management Workspace to manage sub-items",
      "INVALID_WORKSPACE",
    );
  }

  if (!activeWorkspace?.category) {
    throw new ApiError(
      403,
      "No category scope found for the active workspace",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  const category = await findCategoryByCodeOrNameRepo(
    normalizeCategoryCode(activeWorkspace.category),
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category scope was not found in budget categories",
      "CATEGORY_SCOPE_NOT_FOUND",
    );
  }

  return category;
}

async function loadBudgetTypeInScope({ budgetTypeId, budgetAccess }) {
  const [category, budgetType] = await Promise.all([
    resolveCategoryScope(budgetAccess),
    findBudgetTypeByIdRepo(budgetTypeId),
  ]);

  if (!budgetType) {
    throw new ApiError(404, "Budget type not found", "BUDGET_TYPE_NOT_FOUND");
  }

  if (Number(budgetType.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot manage sub-items for this budget type",
      "FORBIDDEN",
    );
  }

  return { category, budgetType };
}

async function loadSubItemInScope({ subItemId, budgetAccess }) {
  const category = await resolveCategoryScope(budgetAccess);
  const subItem = await findBudgetSubItemByIdRepo(subItemId);

  if (!subItem) {
    throw new ApiError(404, "Sub-item not found", "SUB_ITEM_NOT_FOUND");
  }

  if (Number(subItem.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot manage this sub-item",
      "FORBIDDEN",
    );
  }

  return { category, subItem };
}

export async function getBudgetSubItemsService({
  budgetTypeId,
  includeInactive,
  budgetAccess,
}) {
  const { budgetType } = await loadBudgetTypeInScope({
    budgetTypeId,
    budgetAccess,
  });

  const subItems = await getBudgetSubItemsByTypeRepo({
    budgetTypeId,
    includeInactive,
  });

  return {
    budgetType,
    subItems,
  };
}

export async function createBudgetSubItemService({
  payload,
  userId,
  budgetAccess,
}) {
  await loadBudgetTypeInScope({
    budgetTypeId: payload.budgetTypeId,
    budgetAccess,
  });

  const duplicate = await findBudgetSubItemByNameRepo({
    budgetTypeId: payload.budgetTypeId,
    name: payload.name,
  });

  if (duplicate) {
    throw new ApiError(
      409,
      "A sub-item with this name already exists for the budget type",
      "SUB_ITEM_ALREADY_EXISTS",
    );
  }

  return createBudgetSubItemRepo({
    budgetTypeId: payload.budgetTypeId,
    name: payload.name,
    description: payload.description,
    specificationSummary: payload.specificationSummary,
    createdBy: userId,
  });
}

export async function updateBudgetSubItemService({
  subItemId,
  payload,
  userId,
  budgetAccess,
}) {
  const { subItem } = await loadSubItemInScope({ subItemId, budgetAccess });

  if (!subItem.is_active) {
    throw new ApiError(
      409,
      "Inactive sub-items cannot be updated",
      "SUB_ITEM_INACTIVE",
    );
  }

  if (payload.name) {
    const duplicate = await findBudgetSubItemByNameRepo({
      budgetTypeId: subItem.budget_type_id,
      name: payload.name,
      excludeId: subItemId,
    });

    if (duplicate) {
      throw new ApiError(
        409,
        "A sub-item with this name already exists for the budget type",
        "SUB_ITEM_ALREADY_EXISTS",
      );
    }
  }

  const updated = await updateBudgetSubItemRepo({
    subItemId,
    name: payload.name,
    description: payload.description,
    specificationSummary: payload.specificationSummary,
    updatedBy: userId,
  });

  if (!updated) {
    throw new ApiError(404, "Sub-item not found", "SUB_ITEM_NOT_FOUND");
  }

  return updated;
}

export async function deactivateBudgetSubItemService({
  subItemId,
  userId,
  budgetAccess,
}) {
  await loadSubItemInScope({ subItemId, budgetAccess });

  const updated = await deactivateBudgetSubItemRepo({
    subItemId,
    updatedBy: userId,
  });

  if (!updated) {
    throw new ApiError(404, "Sub-item not found", "SUB_ITEM_NOT_FOUND");
  }

  return updated;
}
