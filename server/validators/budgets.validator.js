import { ApiError } from "../utils/apiError.js";

function toPositiveInt(value, fieldName) {
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

export function validateCreateBudget(body = {}) {
  const departmentId = body.department_id
    ? toPositiveInt(body.department_id, "department_id")
    : null;

  return {
    departmentId,
  };
}

export function validateBudgetItemId(value) {
  return toPositiveInt(value, "budgetItemId");
}
