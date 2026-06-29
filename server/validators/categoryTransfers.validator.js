import { ApiError } from "../utils/apiError.js";

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

export function validateTransferId(value) {
  return positiveInteger(value, "transferId");
}

export function validateCategoryTransferCreatePayload(body = {}) {
  return {
    fromCategoryTypeReviewId: positiveInteger(
      body.fromCategoryTypeReviewId,
      "fromCategoryTypeReviewId",
    ),
    toCategoryTypeReviewId: positiveInteger(
      body.toCategoryTypeReviewId,
      "toCategoryTypeReviewId",
    ),
    amount: positiveNumber(body.amount, "amount"),
    reason: text(body.reason, "reason", 2000),
  };
}

export function validateCategoryTransferRejectPayload(body = {}) {
  return {
    note: text(body.note, "note", 1000),
  };
}

export function validateCategoryTransferStatus(value) {
  if (!value) return "ALL";

  const status = String(value).trim().toUpperCase();
  const allowed = ["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED"];

  if (!allowed.includes(status)) {
    throw new ApiError(400, "Invalid transfer status", "VALIDATION_ERROR");
  }

  return status;
}
