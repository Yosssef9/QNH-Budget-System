import { ApiError } from "../utils/apiError.js";

const allowedExpenseTypes = ["OPEX", "CAPEX"];
const allowedDistributionMethods = ["ANNUAL", "MONTHLY", "QUARTERLY", "CUSTOM"];
const allowedDistributionLevels = ["YEAR", "MONTH", "QUARTER"];

export function validateCreateBudgetItem(body) {
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

  if (!category_id) {
    throw new ApiError(400, "category_id is required", "VALIDATION_ERROR");
  }

  if (!type_id) {
    throw new ApiError(400, "type_id is required", "VALIDATION_ERROR");
  }

  if (quantity === undefined || quantity === null) {
    throw new ApiError(400, "quantity is required", "VALIDATION_ERROR");
  }

  if (Number(quantity) < 0) {
    throw new ApiError(400, "quantity cannot be negative", "VALIDATION_ERROR");
  }

  if (unit_price === undefined || unit_price === null) {
    throw new ApiError(400, "unit_price is required", "VALIDATION_ERROR");
  }

  if (Number(unit_price) < 0) {
    throw new ApiError(400, "unit_price cannot be negative", "VALIDATION_ERROR");
  }

  if (!expense_type || !allowedExpenseTypes.includes(expense_type)) {
    throw new ApiError(
      400,
      "expense_type must be OPEX or CAPEX",
      "VALIDATION_ERROR"
    );
  }

  if (
    !distribution_method ||
    !allowedDistributionMethods.includes(distribution_method)
  ) {
    throw new ApiError(
      400,
      "Invalid distribution_method",
      "VALIDATION_ERROR"
    );
  }

  if (
    !distribution_level ||
    !allowedDistributionLevels.includes(distribution_level)
  ) {
    throw new ApiError(
      400,
      "Invalid distribution_level",
      "VALIDATION_ERROR"
    );
  }

  if (distribution !== undefined && !Array.isArray(distribution)) {
    throw new ApiError(
      400,
      "distribution must be an array",
      "VALIDATION_ERROR"
    );
  }
}

export function validateBudgetIdParam(params) {
  const budgetId = Number(params.budgetId);

  if (!Number.isInteger(budgetId) || budgetId <= 0) {
    throw new ApiError(400, "Invalid budget id", "VALIDATION_ERROR");
  }

  return budgetId;
}