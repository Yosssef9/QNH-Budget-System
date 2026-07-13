import { ApiError } from "../../utils/apiError.js";
import {
  ADJUSTMENT_REQUEST_STATUS,
  ADJUSTMENT_REQUEST_TYPES,
} from "./adjustmentRequests.constants.js";

function normalizePositiveInt(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new ApiError(400, `${fieldName} must be a positive integer`, "VALIDATION_ERROR");
  }

  return number;
}

function normalizePositiveNumber(value, fieldName, { required = false } = {}) {
  if (value === null || value === undefined || value === "") {
    if (required) {
      throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
    }
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new ApiError(400, `${fieldName} must be greater than zero`, "VALIDATION_ERROR");
  }

  return number;
}

function normalizeText(value, fieldName, maxLength, { required = true } = {}) {
  if (value === null || value === undefined || value === "") {
    if (!required) return null;
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  const text = String(value).trim().replace(/\s+/g, " ");

  if (!text && required) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  if (text.length > maxLength) {
    throw new ApiError(400, `${fieldName} must not exceed ${maxLength} characters`, "VALIDATION_ERROR");
  }

  return text || null;
}

export function validateCategoryBudgetId(value) {
  return normalizePositiveInt(value, "departmentCategoryBudgetId");
}

export function validateAdjustmentRequestId(value) {
  return normalizePositiveInt(value, "adjustmentRequestId");
}

export function validateListStatus(value) {
  if (!value) return null;

  const status = String(value).trim().toUpperCase();

  if (status === "ALL") return null;

  if (!Object.values(ADJUSTMENT_REQUEST_STATUS).includes(status)) {
    throw new ApiError(400, "Invalid adjustment request status", "VALIDATION_ERROR");
  }

  return status;
}

export function validateCreateAdjustmentRequest(body = {}) {
  const requestType = String(body.requestType ?? body.change_type ?? "")
    .trim()
    .toUpperCase();

  if (!Object.values(ADJUSTMENT_REQUEST_TYPES).includes(requestType)) {
    throw new ApiError(400, "Request type must be ADD_ITEM or INCREASE_QUANTITY", "VALIDATION_ERROR");
  }

  const requestedQuantity = normalizePositiveNumber(
    body.requestedQuantity ?? body.proposed_requested_quantity,
    "requestedQuantity",
  );
  const requestedAmount = normalizePositiveNumber(
    body.requestedAmount ?? body.requested_amount,
    "requestedAmount",
  );

  if (requestedQuantity === null && requestedAmount === null) {
    throw new ApiError(
      400,
      "Enter requested quantity or requested amount",
      "ADJUSTMENT_REQUEST_VALUE_REQUIRED",
    );
  }

  return {
    requestType,
    existingDepartmentBudgetItemId:
      requestType === ADJUSTMENT_REQUEST_TYPES.INCREASE_QUANTITY
        ? normalizePositiveInt(
            body.existingDepartmentBudgetItemId ??
              body.existing_department_budget_item_id,
            "existingDepartmentBudgetItemId",
          )
        : null,
    catalogItemId: normalizePositiveInt(
      body.catalogItemId ?? body.catalog_item_id,
      "catalogItemId",
    ),
    requestedQuantity,
    requestedAmount,
    reason: normalizeText(body.reason, "Reason", 2000),
    description: normalizeText(body.description, "Description", 1000, {
      required: false,
    }),
  };
}

export function validateDecisionPayload(body = {}) {
  return {
    note: normalizeText(body.note ?? body.categoryNote, "Decision note", 1000, {
      required: false,
    }),
  };
}

export function validateRejectPayload(body = {}) {
  return {
    note: normalizeText(body.note ?? body.categoryNote, "Rejection reason", 1000),
  };
}
