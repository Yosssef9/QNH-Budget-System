import { ApiError } from "../utils/apiError.js";

const DISTRIBUTION_METHODS = ["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"];
const DISTRIBUTION_LEVELS = ["MONTH", "QUARTER", "YEAR"];
const PERIOD_TYPES = ["MONTH", "QUARTER", "YEAR"];

function positiveInt(value, fieldName) {
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

function optionalText(value, fieldName, maxLength = 1000) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be text`, "VALIDATION_ERROR");
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must not exceed ${maxLength} characters`,
      "VALIDATION_ERROR",
    );
  }

  return text || null;
}

function normalizeDistribution(distribution = [], requestedQuantity) {
  if (!Array.isArray(distribution)) {
    throw new ApiError(
      400,
      "distribution must be an array",
      "VALIDATION_ERROR",
    );
  }

  const rows = distribution.map((row, index) => {
    const periodType = String(row?.period_type || "")
      .trim()
      .toUpperCase();

    if (!PERIOD_TYPES.includes(periodType)) {
      throw new ApiError(
        400,
        `distribution[${index}].period_type is invalid`,
        "VALIDATION_ERROR",
      );
    }

    const periodNo = positiveInt(row?.period_no, `distribution[${index}].period_no`);
    const quantity = Number(row?.quantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new ApiError(
        400,
        `distribution[${index}].quantity must be a valid number`,
        "VALIDATION_ERROR",
      );
    }

    return {
      period_type: periodType,
      period_no: periodNo,
      quantity,
    };
  });

  if (rows.length > 0 && requestedQuantity !== null) {
    const total = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

    if (Math.abs(total - requestedQuantity) > 0.0001) {
      throw new ApiError(
        400,
        "Distribution quantity must equal requested quantity",
        "INVALID_DISTRIBUTION_TOTAL",
      );
    }
  }

  return rows;
}

export function validateCategoryBudgetId(value) {
  return positiveInt(value, "categoryBudgetId");
}

export function validateRequestItemId(value) {
  return positiveInt(value, "requestItemId");
}

export function validateCreateRequestItem(body = {}) {
  const requestedQuantity = positiveNumber(
    body.requested_quantity,
    "requested_quantity",
  );
  const distributionMethod = String(body.distribution_method || "")
    .trim()
    .toUpperCase();
  const distributionLevel = body.distribution_level
    ? String(body.distribution_level).trim().toUpperCase()
    : null;

  if (!DISTRIBUTION_METHODS.includes(distributionMethod)) {
    throw new ApiError(
      400,
      "distribution_method is invalid",
      "VALIDATION_ERROR",
    );
  }

  if (distributionLevel && !DISTRIBUTION_LEVELS.includes(distributionLevel)) {
    throw new ApiError(
      400,
      "distribution_level is invalid",
      "VALIDATION_ERROR",
    );
  }

  return {
    budget_type_id: positiveInt(body.budget_type_id, "budget_type_id"),
    requested_quantity: requestedQuantity,
    distribution_method: distributionMethod,
    distribution_level: distributionLevel,
    distribution: normalizeDistribution(body.distribution || [], requestedQuantity),
  };
}

export function validateUpdateRequestItem(body = {}) {
  const payload = {};

  if (body.requested_quantity !== undefined) {
    payload.requested_quantity = positiveNumber(
      body.requested_quantity,
      "requested_quantity",
    );
  }

  if (body.distribution_method !== undefined) {
    const distributionMethod = String(body.distribution_method || "")
      .trim()
      .toUpperCase();

    if (!DISTRIBUTION_METHODS.includes(distributionMethod)) {
      throw new ApiError(
        400,
        "distribution_method is invalid",
        "VALIDATION_ERROR",
      );
    }

    payload.distribution_method = distributionMethod;
  }

  if (body.distribution_level !== undefined) {
    const distributionLevel = body.distribution_level
      ? String(body.distribution_level).trim().toUpperCase()
      : null;

    if (distributionLevel && !DISTRIBUTION_LEVELS.includes(distributionLevel)) {
      throw new ApiError(
        400,
        "distribution_level is invalid",
        "VALIDATION_ERROR",
      );
    }

    payload.distribution_level = distributionLevel;
  }

  if (body.distribution !== undefined) {
    payload.distribution = normalizeDistribution(
      body.distribution || [],
      payload.requested_quantity ?? null,
    );
  }

  if (body.review_note !== undefined) {
    payload.review_note = optionalText(body.review_note, "review_note");
  }

  if (!Object.keys(payload).length) {
    throw new ApiError(
      400,
      "At least one field is required",
      "VALIDATION_ERROR",
    );
  }

  return payload;
}
