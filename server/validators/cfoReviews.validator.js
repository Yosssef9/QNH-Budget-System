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

function optionalText(value, maxLength, fieldName) {
  if (value === undefined || value === null || value === "") return null;

  const normalized = String(value).trim();

  if (normalized.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer`,
      "VALIDATION_ERROR",
    );
  }

  return normalized || null;
}

export function validatePackageId(value) {
  return positiveInteger(value, "packageId");
}

export function validateReviewId(value) {
  return positiveInteger(value, "reviewId");
}

export function validateCfoReviewListQuery(query) {
  const allowedStatuses = new Set([
    "SUBMITTED_TO_CFO",
    "RETURNED_BY_CFO",
    "APPROVED",
  ]);
  const status = String(query.status || "SUBMITTED_TO_CFO")
    .trim()
    .toUpperCase();

  if (!allowedStatuses.has(status)) {
    throw new ApiError(
      400,
      "status must be SUBMITTED_TO_CFO, RETURNED_BY_CFO, or APPROVED",
      "VALIDATION_ERROR",
    );
  }

  return { status };
}

export function validateCfoItemStatusPayload(body) {
  const status = String(body.status || "").trim().toUpperCase();
  const allowedStatuses = new Set(["REVIEWED_ACCEPTED", "RETURNED"]);

  if (!allowedStatuses.has(status)) {
    throw new ApiError(
      400,
      "status must be REVIEWED_ACCEPTED or RETURNED",
      "VALIDATION_ERROR",
    );
  }

  const note = optionalText(body.note, 1000, "note");

  if (status === "RETURNED" && !note) {
    throw new ApiError(
      400,
      "note is required when returning an item",
      "RETURN_NOTE_REQUIRED",
    );
  }

  return { status, note };
}

export function validateCfoPackageReturnPayload(body) {
  const note = optionalText(body.note, 1000, "note");

  if (!note) {
    throw new ApiError(
      400,
      "note is required when returning a package",
      "RETURN_NOTE_REQUIRED",
    );
  }

  return { note };
}
