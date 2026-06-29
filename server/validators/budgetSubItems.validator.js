import { ApiError } from "../utils/apiError.js";

function asPositiveInteger(value, fieldName) {
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

function normalizeOptionalText(value, maxLength, fieldName) {
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

export function validateBudgetSubItemId(value) {
  return asPositiveInteger(value, "subItemId");
}

export function validateBudgetTypeQuery(query) {
  return {
    budgetTypeId: asPositiveInteger(query.budgetTypeId, "budgetTypeId"),
    includeInactive:
      String(query.includeInactive || "").toLowerCase() === "true",
  };
}

export function validateBudgetSubItemCreatePayload(body) {
  const name = normalizeOptionalText(body.name, 255, "name");

  if (!name) {
    throw new ApiError(400, "name is required", "VALIDATION_ERROR");
  }

  return {
    budgetTypeId: asPositiveInteger(body.budgetTypeId, "budgetTypeId"),
    name,
    description: normalizeOptionalText(body.description, 1000, "description"),
    specificationSummary: normalizeOptionalText(
      body.specificationSummary,
      2000,
      "specificationSummary",
    ),
  };
}

export function validateBudgetSubItemUpdatePayload(body) {
  const name =
    body.name === undefined ? undefined : normalizeOptionalText(body.name, 255, "name");

  if (body.name !== undefined && !name) {
    throw new ApiError(400, "name cannot be empty", "VALIDATION_ERROR");
  }

  return {
    name,
    description:
      body.description === undefined
        ? undefined
        : normalizeOptionalText(body.description, 1000, "description"),
    specificationSummary:
      body.specificationSummary === undefined
        ? undefined
        : normalizeOptionalText(
            body.specificationSummary,
            2000,
            "specificationSummary",
          ),
  };
}
