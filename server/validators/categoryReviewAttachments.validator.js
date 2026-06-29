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

export function validateAttachmentId(value) {
  return positiveInteger(value, "attachmentId");
}

export function validateReviewId(value) {
  return positiveInteger(value, "reviewId");
}

export function validateLineId(value) {
  return positiveInteger(value, "lineId");
}

export function validateAttachmentDescription(body) {
  if (!body?.description) return null;

  const description = String(body.description).trim();

  if (description.length > 500) {
    throw new ApiError(
      400,
      "description must be 500 characters or fewer",
      "VALIDATION_ERROR",
    );
  }

  return description || null;
}
