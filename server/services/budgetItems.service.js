import { ApiError } from "../utils/apiError.js";
import {
  getBudgetByIdRepo,
  validateTypeExistsRepo,
  getExistingBudgetItemTypeRepo,
  createBudgetItemRepo,
  insertDistributionRepo,
  getBudgetItemsByBudgetIdRepo,
  deleteBudgetItemRepo,
  replaceBudgetItemsRepo,
} from "../repositories/budgetItems.repository.js";

import {
  calculateTotalAmount,
  validateDistribution,
} from "../helpers/distribution.helper.js";
import { validateBudgetModifyPermission } from "../helpers/validateBudgetModifyPermission.js";

function normalizeProjectFlag(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback === true;
  }

  return value === true || value === 1 || value === "1";
}

export async function createBudgetItemService({
  budgetId,
  body,
  user,
  budgetAccess,
}) {
  const {
    type_id,
    quantity,
    unit_price,
    distribution_method,
    distribution_level,
    distribution,
    is_project,
  } = body;

  // 1. Get budget
  const budget = await getBudgetByIdRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }

  // 2. Financial year must be OPEN
  if (budget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Cannot modify budget in closed financial year",
      "FINANCIAL_YEAR_CLOSED",
    );
  }

  // 3. Budget must be editable
  if (!["DRAFT", "RETURNED"].includes(budget.status)) {
    throw new ApiError(
      400,
      "Budget cannot be modified in current status",
      "INVALID_BUDGET_STATUS",
    );
  }

  // 4. Permission check
  const isGlobal =
    budgetAccess.isGlobalAdmin === true ||
    budgetAccess.permissions?.can_approve_budget === true;

  const userDepartmentId = budgetAccess.department?.id || null;

  if (!isGlobal && budget.department_id !== userDepartmentId) {
    throw new ApiError(
      403,
      "You cannot modify this department budget",
      "FORBIDDEN",
    );
  }

  // 5. Validate category-type
  const isValidType = await validateTypeExistsRepo(type_id);

  if (!isValidType) {
    throw new ApiError(400, "Invalid item/type", "INVALID_TYPE");
  }
  // 6. Prevent duplicate type in same budget
  const existingItem = await getExistingBudgetItemTypeRepo(budgetId, type_id);

  if (existingItem) {
    throw new ApiError(
      409,
      "This item/type already exists in this budget",
      "DUPLICATE_BUDGET_ITEM_TYPE",
    );
  }
  //  Calculate total
  const totalAmount = calculateTotalAmount(quantity, unit_price);

  // 7. Validate distribution
  const distributionRows = validateDistribution({
    quantity,
    distribution_method,
    distribution_level,
    distribution,
  });

  // 8. Insert item
  const item = await createBudgetItemRepo({
    budgetId,
    typeId: type_id,
    quantity,
    unitPrice: unit_price,
    totalAmount,
    distributionMethod: distribution_method,
    distributionLevel: distribution_level,
    isProject: normalizeProjectFlag(is_project),
    createdBy: user.userId,
  });

  // 9. Insert distribution
  await insertDistributionRepo(item.id, distributionRows);

  return {
    item,
    distribution: distributionRows,
  };
}

export async function getBudgetItemsService({ budgetId, budgetAccess }) {
  const budget = await getBudgetByIdRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }

  const isGlobal =
    budgetAccess.isGlobalAdmin === true ||
    budgetAccess.permissions?.can_approve_budget === true;

  const userDepartmentId = budgetAccess.department?.id || null;

  if (!isGlobal && budget.department_id !== userDepartmentId) {
    throw new ApiError(
      403,
      "You cannot view this department budget",
      "FORBIDDEN",
    );
  }

  const rows = await getBudgetItemsByBudgetIdRepo(budgetId);

  const itemsMap = new Map();

  for (const row of rows) {
    if (!itemsMap.has(row.id)) {
      itemsMap.set(row.id, {
        id: row.id,
        budget_id: row.budget_id,
        category_id: row.category_id,
        category_name: row.category_name,
        category_is_active: row.category_is_active,
        type_is_active: row.type_is_active,
        type_id: row.type_id,
        type_name: row.type_name,
        expense_type: row.expense_type,
        quantity: Number(row.quantity || 0),
        unit_price: Number(row.unit_price || 0),
        total_amount: Number(row.total_amount || 0),
        is_project: row.is_project === true || row.is_project === 1,

        distribution_method: row.distribution_method,
        distribution_level: row.distribution_level,

        created_from_transfer: row.created_from_transfer,
        source_transfer_id: row.source_transfer_id,

        distribution: [],
      });
    }

    if (row.period_no) {
      itemsMap.get(row.id).distribution.push({
        period_type: row.period_type,
        period_no: row.period_no,
        quantity: Number(row.distribution_quantity || 0),
      });
    }
  }

  return {
    items: Array.from(itemsMap.values()),
  };
}

export async function deleteBudgetItemService({
  budgetId,
  itemId,
  user,
  budgetAccess,
}) {
  const budget = await getBudgetByIdRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }

  if (budget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Cannot modify budget items unless financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (!["DRAFT", "RETURNED"].includes(budget.status)) {
    throw new ApiError(
      400,
      "Budget items can only be deleted while budget is DRAFT or RETURNED",
      "INVALID_BUDGET_STATUS",
    );
  }

  validateBudgetModifyPermission({ budget, budgetAccess });

  return await deleteBudgetItemRepo({ budgetId, itemId });
}
export async function replaceBudgetItemsService({
  budgetId,
  items,
  user,
  budgetAccess,
}) {
  const budget = await getBudgetByIdRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }

  if (budget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Cannot save budget items unless financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (!["DRAFT", "RETURNED"].includes(budget.status)) {
    throw new ApiError(
      400,
      "Budget items can only be saved while budget is DRAFT or RETURNED",
      "INVALID_BUDGET_STATUS",
    );
  }

  validateBudgetModifyPermission({ budget, budgetAccess });

  return await replaceBudgetItemsRepo({
    budgetId,
    items,
    createdBy: user.userId,
  });
}
