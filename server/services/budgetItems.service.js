import { ApiError } from "../utils/apiError.js";
import {
  getBudgetByIdRepo,
  validateCategoryTypeRepo,
  createBudgetItemRepo,
  insertDistributionRepo,
} from "../repositories/budgetItems.repository.js";

import {
  calculateTotalAmount,
  validateDistribution,
} from "../helpers/distribution.helper.js";

export async function createBudgetItemService({
  budgetId,
  body,
  user,
  budgetAccess,
}) {
  const {
    category_id,
    type_id,
    quantity,
    unit_price,
    expense_type,
    distribution_method,
    distribution_level,
    distribution,
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
      "FINANCIAL_YEAR_CLOSED"
    );
  }

  // 3. Budget must be editable
  if (!["DRAFT", "RETURNED"].includes(budget.status)) {
    throw new ApiError(
      400,
      "Budget cannot be modified in current status",
      "INVALID_BUDGET_STATUS"
    );
  }

  // 4. Permission check
  const isGlobal =
    budgetAccess.is_global_admin ||
    budgetAccess.can_approve_budget;

  const userDepartmentId = budgetAccess.departments?.[0]?.department_id;

  if (!isGlobal && budget.department_id !== userDepartmentId) {
    throw new ApiError(
      403,
      "You cannot modify this department budget",
      "FORBIDDEN"
    );
  }

  // 5. Validate category-type
  const isValidType = await validateCategoryTypeRepo(
    category_id,
    type_id
  );

  if (!isValidType) {
    throw new ApiError(
      400,
      "Invalid category/type combination",
      "INVALID_CATEGORY_TYPE"
    );
  }

  // 6. Calculate total
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
    categoryId: category_id,
    typeId: type_id,
    quantity,
    unitPrice: unit_price,
    totalAmount,
    expenseType: expense_type,
    createdBy: user.userId,
  });

  // 9. Insert distribution
  await insertDistributionRepo(item.id, distributionRows);

  return {
    item,
    distribution: distributionRows,
  };
}