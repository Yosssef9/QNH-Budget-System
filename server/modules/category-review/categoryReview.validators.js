import { ApiError } from "../../utils/apiError.js";
function positiveInt(value, fieldName) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive integer`,
      "INVALID_ID",
    );
  }
  return numberValue;
}

function optionalQuantity(value) {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new ApiError(
      400,
      "Approved quantity must be a non-negative number",
      "INVALID_APPROVED_QUANTITY",
    );
  }
  return numberValue;
}

export function validateDepartmentCategoryBudgetId(value) {
  return positiveInt(value, "Department category budget id");
}

export function validateDepartmentBudgetItemId(value) {
  return positiveInt(value, "Department budget item id");
}

export function validateItemDecisionPayload(body = {}) {
  const reviewNote = String(body.review_note ?? body.reviewNote ?? "").trim();
  const approvedQuantity = optionalQuantity(
    body.category_approved_quantity ?? body.categoryApprovedQuantity,
  );

  return {
    category_approved_quantity: approvedQuantity,
    review_note: reviewNote || null,
  };
}

export function validateCloseSubmissionWindowPayload(body = {}) {
  const closeReason = String(
    body.close_reason ?? body.closeReason ?? "",
  ).trim();

  return {
    close_reason: closeReason || null,
  };
}

export function validateReopenSubmissionWindowPayload(body = {}) {
  const reopenReason = String(
    body.reopen_reason ?? body.reopenReason ?? "",
  ).trim();

  if (!reopenReason) {
    throw new ApiError(
      400,
      "A reopen reason is required",
      "REOPEN_REASON_REQUIRED",
    );
  }

  return {
    reopen_reason: reopenReason,
  };
}
export function validateReopenDepartmentCategoryReviewPayload(body = {}) {
  const rowVersion = String(body.row_version ?? body.rowVersion ?? "").trim();

  if (!rowVersion) {
    throw new ApiError(400, "Row version is required", "ROW_VERSION_REQUIRED");
  }

  let rowVersionBuffer;

  try {
    rowVersionBuffer = Buffer.from(rowVersion, "base64");
  } catch {
    throw new ApiError(400, "Row version is invalid", "INVALID_ROW_VERSION");
  }

  if (rowVersionBuffer.length !== 8) {
    throw new ApiError(400, "Row version is invalid", "INVALID_ROW_VERSION");
  }

  return {
    row_version: rowVersionBuffer,
  };
}
