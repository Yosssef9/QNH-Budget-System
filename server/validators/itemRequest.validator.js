import { ApiError } from "../utils/apiError.js";

function normalizeOptionalName(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value !== "string") {
    throw new ApiError(400, "Name must be text", "VALIDATION_ERROR");
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (!name) return null;

  if (name.length < 2 || name.length > 200) {
    throw new ApiError(
      400,
      "Name must be between 2 and 200 characters",
      "VALIDATION_ERROR",
    );
  }

  return name;
}

function normalizeRequiredName(value, fieldName) {
  const name = normalizeOptionalName(value);

  if (!name) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  return name;
}

export function validateCreateItemRequest(body) {
  const existingCategoryId =
    body?.existingCategoryId || body?.existing_category_id || null;

  const categoryId = existingCategoryId ? Number(existingCategoryId) : null;

  if (
    categoryId !== null &&
    (!Number.isInteger(categoryId) || categoryId <= 0)
  ) {
    throw new ApiError(
      400,
      "existingCategoryId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  const requestedCategoryName = normalizeOptionalName(
    body?.requestedCategoryName || body?.requested_category_name,
  );

  const requestedTypeName = normalizeRequiredName(
    body?.requestedTypeName || body?.requested_type_name,
    "Requested item/type name",
  );

  if (!categoryId && !requestedCategoryName) {
    throw new ApiError(
      400,
      "Select existing category or enter new category name",
      "VALIDATION_ERROR",
    );
  }

  const expenseType = String(body?.expenseType || body?.expense_type || "")
    .trim()
    .toUpperCase();

  if (!["OPEX", "CAPEX"].includes(expenseType)) {
    throw new ApiError(
      400,
      "Expense type must be OPEX or CAPEX",
      "VALIDATION_ERROR",
    );
  }

  return {
    existingCategoryId: categoryId,
    requestedCategoryName,
    requestedTypeName,
    expenseType,
  };
}

export function validateItemRequestStatus(value) {
  if (!value) return "PENDING";

  const status = String(value).trim().toUpperCase();

  if (!["PENDING", "APPROVED", "REJECTED", "ALL"].includes(status)) {
    throw new ApiError(400, "Invalid request status", "VALIDATION_ERROR");
  }

  return status;
}

export function validateItemRequestId(value) {
  const requestId = Number(value);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new ApiError(
      400,
      "requestId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return requestId;
}

export function validateItemRequestDecision(body) {
  return {
    adminNote: body?.adminNote ? String(body.adminNote).trim() : null,
  };
}
