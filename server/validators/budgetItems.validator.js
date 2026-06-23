import { ApiError } from "../utils/apiError.js";

const allowedMethods = ["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"];
const allowedLevels = ["MONTH", "QUARTER", "YEAR"];

function positiveInt(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive number`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function nonNegativeNumber(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a valid non-negative number`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function optionalBoolean(value, fieldName) {
  if (value === undefined || value === null) {
    return;
  }

  if (
    typeof value !== "boolean" &&
    value !== 0 &&
    value !== 1 &&
    value !== "0" &&
    value !== "1"
  ) {
    throw new ApiError(
      400,
      `${fieldName} must be a boolean value`,
      "VALIDATION_ERROR",
    );
  }
}

export function validateBudgetIdParam(params = {}) {
  return positiveInt(params.budgetId, "budgetId");
}

export function validateCreateBudgetItem(body = {}) {
  positiveInt(body.type_id, "type_id");
  nonNegativeNumber(body.quantity, "quantity");
  nonNegativeNumber(body.unit_price, "unit_price");
  optionalBoolean(body.is_project, "is_project");

  if (Number(body.quantity) <= 0) {
    throw new ApiError(
      400,
      "quantity must be greater than zero",
      "VALIDATION_ERROR",
    );
  }

  if (Number(body.unit_price) <= 0) {
    throw new ApiError(
      400,
      "unit_price must be greater than zero",
      "VALIDATION_ERROR",
    );
  }

  if (!allowedMethods.includes(body.distribution_method)) {
    throw new ApiError(400, "Invalid distribution_method", "VALIDATION_ERROR");
  }

  if (!allowedLevels.includes(body.distribution_level)) {
    throw new ApiError(400, "Invalid distribution_level", "VALIDATION_ERROR");
  }

  return true;
}
