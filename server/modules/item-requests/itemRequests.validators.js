import { ApiError } from "../../utils/apiError.js";
import {
  ITEM_REQUEST_EXPENSE_TYPES,
  ITEM_REQUEST_STATUSES,
} from "./itemRequests.constants.js";

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

function normalizePositiveInt(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive number`,
      "VALIDATION_ERROR",
    );
  }

  return number;
}

export function validateCreateItemRequest(body) {
  const existingCategoryId =
    body?.existingCategoryId ?? body?.existing_category_id ?? body?.categoryId;

  const categoryId = normalizePositiveInt(
    existingCategoryId,
    "existingCategoryId",
  );

  const requestedCategoryName = normalizeOptionalName(
    body?.requestedCategoryName ?? body?.requested_category_name,
  );

  if (requestedCategoryName) {
    throw new ApiError(
      400,
      "New category requests are not supported. Select IT, Biomedical, or General.",
      "CATEGORY_REQUEST_NOT_ALLOWED",
    );
  }

  const requestedTypeName = normalizeRequiredName(
    body?.requestedTypeName ?? body?.requested_type_name,
    "Requested item name",
  );

  const expenseType = String(body?.expenseType ?? body?.expense_type ?? "")
    .trim()
    .toUpperCase();

  if (!Object.values(ITEM_REQUEST_EXPENSE_TYPES).includes(expenseType)) {
    throw new ApiError(
      400,
      "Expense type must be OPEX or CAPEX",
      "VALIDATION_ERROR",
    );
  }

  return {
    existingCategoryId: categoryId,
    requestedCategoryName: null,
    requestedTypeName,
    expenseType,
    unitOfMeasureId: normalizePositiveInt(
      body?.unitOfMeasureId ?? body?.unit_of_measure_id,
      "Unit of Measure",
    ),
  };
}

export function validateItemRequestStatus(value) {
  if (!value) return ITEM_REQUEST_STATUSES.PENDING;

  const status = String(value).trim().toUpperCase();

  if (!Object.values(ITEM_REQUEST_STATUSES).includes(status)) {
    throw new ApiError(400, "Invalid request status", "VALIDATION_ERROR");
  }

  return status;
}

export function validateItemRequestId(value) {
  return normalizePositiveInt(value, "requestId");
}

export function validateItemRequestDecision(body) {
  return {
    adminNote: body?.adminNote ? String(body.adminNote).trim() : null,
  };
}

export function validateItemRequestAutoCreateDecision(body) {
  return validateItemRequestDecision(body);
}
