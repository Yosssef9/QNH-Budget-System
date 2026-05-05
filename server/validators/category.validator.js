import { ApiError } from "../utils/apiError.js";

function normalizeName(value, fieldName) {
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be text`, "VALIDATION_ERROR");
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (!name) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  if (name.length < 2) {
    throw new ApiError(
      400,
      `${fieldName} must be at least 2 characters`,
      "VALIDATION_ERROR",
    );
  }

  if (name.length > 200) {
    throw new ApiError(
      400,
      `${fieldName} must not exceed 200 characters`,
      "VALIDATION_ERROR",
    );
  }

  return name;
}

export function validateCreateCategory(body) {
  return {
    name: normalizeName(body?.name, "Category name"),
  };
}

export function validateCreateType(body) {
  const expenseType = String(body?.expense_type || "")
    .trim()
    .toUpperCase();

  if (!["OPEX", "CAPEX"].includes(expenseType)) {
    throw new ApiError(
      400,
      "expense_type must be OPEX or CAPEX",
      "VALIDATION_ERROR",
    );
  }

  return {
    name: normalizeName(body?.name, "Type name"),
    expense_type: expenseType,
  };
}

export function validateCategoryId(value) {
  const categoryId = Number(value);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new ApiError(
      400,
      "categoryId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return categoryId;
}
