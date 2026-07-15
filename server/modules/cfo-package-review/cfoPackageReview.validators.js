import { ApiError } from "../../utils/apiError.js";
import { CFO_PACKAGE_REVIEW_DECISIONS } from "./cfoPackageReview.constants.js";

function positiveId(value, fieldName) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new ApiError(400, `${fieldName} is invalid`, "INVALID_ID");
  }
  return numeric;
}

function optionalText(value, maxLength, fieldName) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer`,
      "TEXT_TOO_LONG",
    );
  }
  return text;
}

function requiredText(value, maxLength, fieldName, errorCode) {
  const text = optionalText(value, maxLength, fieldName);
  if (!text) {
    throw new ApiError(400, `${fieldName} is required`, errorCode);
  }
  return text;
}

function rowVersion(value, fieldName = "row_version") {
  if (!value || typeof value !== "string") {
    throw new ApiError(400, `${fieldName} is required`, "ROW_VERSION_REQUIRED");
  }
  return Buffer.from(value, "base64");
}

export function validatePackageId(value) {
  return positiveId(value, "Package id");
}

export function validatePackageItemId(value) {
  return positiveId(value, "Package item id");
}

export function validateFinancialYearId(value) {
  return positiveId(value, "Financial year id");
}

export function validateOptionalFinancialYearId(value) {
  if (value === undefined || value === null || value === "") return null;
  return validateFinancialYearId(value);
}

export function validateCfoDecisionPayload(body = {}) {
  const decision = String(body.decision || body.cfo_review_status || "").trim();
  if (!Object.values(CFO_PACKAGE_REVIEW_DECISIONS).includes(decision)) {
    throw new ApiError(
      400,
      "CFO decision must be CFO_ACCEPTED or NEEDS_MODIFICATION",
      "INVALID_CFO_DECISION",
    );
  }

  return {
    decision,
    note:
      decision === CFO_PACKAGE_REVIEW_DECISIONS.NEEDS_MODIFICATION
        ? requiredText(
            body.note ?? body.cfo_review_note,
            1000,
            "CFO note",
            "CFO_REVIEW_NOTE_REQUIRED",
          )
        : optionalText(body.note ?? body.cfo_review_note, 1000, "CFO note"),
    row_version: rowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateMarkAllNeedsModificationPayload(body = {}) {
  return {
    note: requiredText(
      body.note,
      1000,
      "CFO note",
      "CFO_REVIEW_NOTE_REQUIRED",
    ),
    row_version: rowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateReturnPackagePayload(body = {}) {
  return {
    reason: requiredText(
      body.reason ?? body.return_reason,
      1000,
      "Return reason",
      "CFO_RETURN_REASON_REQUIRED",
    ),
    row_version: rowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateReopenPackagePayload(body = {}) {
  return {
    reason: requiredText(
      body.reason ?? body.reopen_reason,
      1000,
      "Reopen reason",
      "CFO_REOPEN_REASON_REQUIRED",
    ),
    row_version: rowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateCompletePackagePayload(body = {}) {
  return {
    note: optionalText(body.note, 1000, "Completion note"),
    row_version: rowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateFinalizeAnnualReviewPayload(body = {}) {
  return {
    note: optionalText(body.note, 1000, "Finalization note"),
  };
}
