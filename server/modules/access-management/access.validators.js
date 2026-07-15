import { ApiError } from "../../utils/apiError.js";

function requirePositiveInt(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive integer`,
      "VALIDATION_ERROR",
    );
  }

  return parsed;
}

function validateOptionalPositiveInt(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return requirePositiveInt(value, fieldName);
}

export function validateCreateBudgetAccessAssignment(body) {
  requirePositiveInt(body.user_id, "user_id");
  requirePositiveInt(body.role_id, "role_id");
  validateOptionalPositiveInt(body.department_id, "department_id");
  validateOptionalPositiveInt(body.budget_category_id, "budget_category_id");

  if (
    body.is_active !== undefined &&
    body.is_active !== null &&
    typeof body.is_active !== "boolean"
  ) {
    throw new ApiError(
      400,
      "is_active must be true or false",
      "VALIDATION_ERROR",
    );
  }
}

export function validateUpdateBudgetAccessAssignment(body) {
  requirePositiveInt(body.role_id, "role_id");
  validateOptionalPositiveInt(body.department_id, "department_id");
  validateOptionalPositiveInt(body.budget_category_id, "budget_category_id");
}

export function validateUpdateBudgetAccessAssignmentStatus(body) {
  if (typeof body.is_active !== "boolean") {
    throw new ApiError(
      400,
      "is_active must be true or false",
      "VALIDATION_ERROR",
    );
  }
}

export function validateBudgetAccessAssignmentId(id) {
  return requirePositiveInt(id, "assignment id");
}

export function validateReplacePermissionOverrides(body = {}) {
  if (!Array.isArray(body.overrides)) {
    throw new ApiError(
      400,
      "overrides must be an array",
      "VALIDATION_ERROR",
    );
  }

  for (const override of body.overrides) {
    requirePositiveInt(override.permission_id, "permission_id");

    if (!["GRANT", "DENY"].includes(override.action)) {
      throw new ApiError(
        400,
        "override action must be GRANT or DENY",
        "VALIDATION_ERROR",
      );
    }
  }
}
