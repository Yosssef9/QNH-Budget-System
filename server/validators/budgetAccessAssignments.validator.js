import { ApiError } from "../utils/apiError.js";

const permissionFields = [
  "can_view_budget",
  "can_edit_budget",

  "can_view_po_links",
  "can_request_po_links",
  "can_view_all_po_link_requests",
  "can_approve_po_links",

  "can_request_transfer",
  "can_approve_budget",
  "can_approve_transfer",
  "can_manage_users",
  "can_manage_categories",
  "can_view_reports",
  "can_manage_financial_years",
];

function isValidNullableBoolean(value) {
  return value === null || value === undefined || value === true || value === false;
}

export function validateCreateBudgetAccessAssignment(body) {
  if (!body.user_id) {
    throw new ApiError(400, "user_id is required", "VALIDATION_ERROR");
  }

  if (!body.role_id) {
    throw new ApiError(400, "role_id is required", "VALIDATION_ERROR");
  }

  for (const field of permissionFields) {
    if (!isValidNullableBoolean(body[field])) {
      throw new ApiError(
        400,
        `${field} must be true, false, or null`,
        "VALIDATION_ERROR"
      );
    }
  }
}

export function validateUpdateBudgetAccessAssignment(body) {
  if (!body.role_id) {
    throw new ApiError(400, "role_id is required", "VALIDATION_ERROR");
  }

  for (const field of permissionFields) {
    if (!isValidNullableBoolean(body[field])) {
      throw new ApiError(
        400,
        `${field} must be true, false, or null`,
        "VALIDATION_ERROR"
      );
    }
  }
}

export function validateUpdateBudgetAccessAssignmentStatus(body) {
  if (typeof body.is_active !== "boolean") {
    throw new ApiError(
      400,
      "is_active must be true or false",
      "VALIDATION_ERROR"
    );
  }
}