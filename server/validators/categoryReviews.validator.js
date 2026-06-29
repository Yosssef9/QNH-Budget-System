import { ApiError } from "../utils/apiError.js";

export function validateCategoryReviewId(value) {
  const reviewId = Number(value);

  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new ApiError(
      400,
      "reviewId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return reviewId;
}

export function validateDepartmentCategoryBudgetId(value) {
  const categoryBudgetId = Number(value);

  if (!Number.isInteger(categoryBudgetId) || categoryBudgetId <= 0) {
    throw new ApiError(
      400,
      "categoryBudgetId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return categoryBudgetId;
}

export function validateDepartmentRequestItemId(value) {
  const requestItemId = Number(value);

  if (!Number.isInteger(requestItemId) || requestItemId <= 0) {
    throw new ApiError(
      400,
      "requestItemId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return requestItemId;
}

export function validateCategoryReviewPackageId(value) {
  const packageId = Number(value);

  if (!Number.isInteger(packageId) || packageId <= 0) {
    throw new ApiError(
      400,
      "packageId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return packageId;
}

export function validateReviewSubItemLineId(value) {
  const lineId = Number(value);

  if (!Number.isInteger(lineId) || lineId <= 0) {
    throw new ApiError(
      400,
      "lineId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return lineId;
}

function validateDecimal(value, fieldName, { allowZero = false } = {}) {
  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    (allowZero ? numberValue < 0 : numberValue <= 0)
  ) {
    throw new ApiError(
      400,
      `${fieldName} must be ${allowZero ? "zero or greater" : "greater than zero"}`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function validateOptionalText(value, maxLength, fieldName) {
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

export function validateApprovedQuantityPayload(body) {
  return {
    approvedQuantity: validateDecimal(body.approvedQuantity, "approvedQuantity", {
      allowZero: true,
    }),
  };
}

export function validateCategoryReviewStatusPayload(body) {
  const allowedStatuses = new Set([
    "IN_REVIEW",
    "REVIEWED_ACCEPTED",
    "NEEDS_MODIFICATION",
  ]);
  const status = String(body.status || "").trim().toUpperCase();

  if (!allowedStatuses.has(status)) {
    throw new ApiError(
      400,
      "status must be IN_REVIEW, REVIEWED_ACCEPTED, or NEEDS_MODIFICATION",
      "VALIDATION_ERROR",
    );
  }

  return {
    status,
    note: validateOptionalText(body.note, 2000, "note"),
  };
}

export function validateDepartmentRequestItemReviewPayload(body) {
  const allowedStatuses = new Set(["REVIEWED_ACCEPTED", "NEEDS_MODIFICATION"]);
  const reviewStatus = String(body.reviewStatus || "")
    .trim()
    .toUpperCase();

  if (!allowedStatuses.has(reviewStatus)) {
    throw new ApiError(
      400,
      "reviewStatus must be REVIEWED_ACCEPTED or NEEDS_MODIFICATION",
      "VALIDATION_ERROR",
    );
  }

  const note = validateOptionalText(body.note, 1000, "note");

  if (reviewStatus === "NEEDS_MODIFICATION" && !note) {
    throw new ApiError(
      400,
      "note is required when an item needs modification",
      "REVIEW_NOTE_REQUIRED",
    );
  }

  return {
    reviewStatus,
    note,
  };
}

export function validateReturnDepartmentCategoryBudgetPayload(body) {
  const returnNote = validateOptionalText(body.returnNote, 1000, "returnNote");

  if (!returnNote) {
    throw new ApiError(
      400,
      "returnNote is required",
      "RETURN_NOTE_REQUIRED",
    );
  }

  return { returnNote };
}

export function validateReviewSubItemCreatePayload(body) {
  const budgetSubItemId = Number(body.budgetSubItemId);

  if (!Number.isInteger(budgetSubItemId) || budgetSubItemId <= 0) {
    throw new ApiError(
      400,
      "budgetSubItemId must be a positive number",
      "VALIDATION_ERROR",
    );
  }

  return {
    budgetSubItemId,
    quantity: validateDecimal(body.quantity, "quantity"),
    unitCost: validateDecimal(body.unitCost, "unitCost", { allowZero: true }),
    note: validateOptionalText(body.note, 1000, "note"),
  };
}

export function validateReviewSubItemUpdatePayload(body) {
  return {
    quantity:
      body.quantity === undefined
        ? undefined
        : validateDecimal(body.quantity, "quantity"),
    unitCost:
      body.unitCost === undefined
        ? undefined
        : validateDecimal(body.unitCost, "unitCost", { allowZero: true }),
    note:
      body.note === undefined
        ? undefined
        : validateOptionalText(body.note, 1000, "note"),
  };
}
