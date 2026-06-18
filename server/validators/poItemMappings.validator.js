import { ApiError } from "../utils/apiError.js";

function toPositiveInteger(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive integer`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function normalizeText(value, fieldName, maxLength, { required = false } = {}) {
  const text = value == null ? "" : String(value).trim().replace(/\s+/g, " ");

  if (required && !text) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  if (text && text.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} cannot exceed ${maxLength} characters`,
      "VALIDATION_ERROR",
    );
  }

  return text || null;
}

export function validatePOItemMappingId(value) {
  return toPositiveInteger(value, "mapping id");
}

export function validatePOItemMappingFilters(query = {}) {
  const source = query.source
    ? String(query.source).trim().toUpperCase()
    : null;
  const status = query.status
    ? String(query.status).trim().toUpperCase()
    : "ALL";

  if (source && !["MANUAL", "APPROVED_LINK", "ALL"].includes(source)) {
    throw new ApiError(400, "Invalid mapping source", "VALIDATION_ERROR");
  }

  if (!["ACTIVE", "INACTIVE", "ALL"].includes(status)) {
    throw new ApiError(400, "Invalid mapping status", "VALIDATION_ERROR");
  }

  return {
    search: normalizeText(query.search, "search", 200),
    source,
    status,
  };
}

export function validateCreatePOItemMapping(body = {}) {
  return {
    budget_type_id: toPositiveInteger(body.budget_type_id, "budget_type_id"),
    po_item_code: normalizeText(body.po_item_code, "po_item_code", 100, {
      required: true,
    }),
    po_item_description: normalizeText(
      body.po_item_description,
      "po_item_description",
      500,
    ),
  };
}

export function validatePOItemMappingStatus(body = {}) {
  if (typeof body.is_active !== "boolean") {
    throw new ApiError(
      400,
      "is_active must be true or false",
      "VALIDATION_ERROR",
    );
  }

  return {
    is_active: body.is_active,
    disabled_reason: normalizeText(
      body.disabled_reason,
      "disabled_reason",
      500,
    ),
  };
}

export function validateMappingSearchFilters(query = {}) {
  return {
    search: normalizeText(query.search, "search", 200),
  };
}
