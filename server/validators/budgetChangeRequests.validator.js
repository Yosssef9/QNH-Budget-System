import { ApiError } from "../utils/apiError.js";

const REQUEST_TYPES = [
  "ADD_ITEM",
  "INCREASE_QUANTITY",
  "DECREASE_QUANTITY",
  "MODIFY_ITEM",
];

function positiveInteger(value, fieldName) {
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

function optionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  return positiveInteger(value, fieldName);
}

function positiveNumber(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be greater than zero`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function optionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new ApiError(
      400,
      `${fieldName} must be a valid number`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function text(value, fieldName, maxLength) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  if (normalized.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer`,
      "VALIDATION_ERROR",
    );
  }

  return normalized;
}

function optionalText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  return text(value, fieldName, maxLength);
}

export function validateChangeRequestId(value) {
  return positiveInteger(value, "requestId");
}

export function validateCreateChangeRequest(body = {}) {
  const requestType = String(body.requestType || "")
    .trim()
    .toUpperCase();

  if (!REQUEST_TYPES.includes(requestType)) {
    throw new ApiError(
      400,
      `requestType must be one of ${REQUEST_TYPES.join(", ")}`,
      "VALIDATION_ERROR",
    );
  }

  const requestedQuantity =
    body.requestedQuantity === undefined
      ? null
      : positiveNumber(body.requestedQuantity, "requestedQuantity");

  if (requestType !== "MODIFY_ITEM" && requestedQuantity === null) {
    throw new ApiError(
      400,
      "requestedQuantity is required for quantity and add-item changes",
      "VALIDATION_ERROR",
    );
  }

  return {
    requestType,
    budgetTypeId: positiveInteger(body.budgetTypeId, "budgetTypeId"),
    existingDepartmentRequestItemId: optionalPositiveInteger(
      body.existingDepartmentRequestItemId,
      "existingDepartmentRequestItemId",
    ),
    targetDepartmentCategoryBudgetId: optionalPositiveInteger(
      body.targetDepartmentCategoryBudgetId,
      "targetDepartmentCategoryBudgetId",
    ),
    categoryTypeReviewId: optionalPositiveInteger(
      body.categoryTypeReviewId,
      "categoryTypeReviewId",
    ),
    requestedQuantity,
    quantityDelta: optionalNumber(body.quantityDelta, "quantityDelta"),
    reason: text(body.reason, "reason", 2000),
    description: optionalText(body.description, "description", 1000),
  };
}

export function validateDecisionPayload(body = {}) {
  const decision = String(body.decision || "")
    .trim()
    .toUpperCase();

  if (!["ACCEPTED", "REJECTED"].includes(decision)) {
    throw new ApiError(
      400,
      "decision must be ACCEPTED or REJECTED",
      "VALIDATION_ERROR",
    );
  }

  const note = optionalText(body.note, "note", 1000);

  if (decision === "REJECTED" && !note) {
    throw new ApiError(
      400,
      "note is required when rejecting a change request",
      "DECISION_NOTE_REQUIRED",
    );
  }

  return { decision, note };
}

export function validateChangeRequestStatus(value) {
  if (!value) return "ALL";

  const status = String(value).trim().toUpperCase();
  const allowed = [
    "ALL",
    "SUBMITTED",
    "CATEGORY_REVIEWED",
    "CFO_REVIEWED",
    "ACCEPTED",
    "REJECTED",
    "APPLIED",
    "CANCELLED",
    "CLOSED_BY_PRE_CLOSING",
  ];

  if (!allowed.includes(status)) {
    throw new ApiError(400, "Invalid change request status", "VALIDATION_ERROR");
  }

  return status;
}
