import { ApiError } from "../../utils/apiError.js";
import { DEPARTMENT_FILTER_STATUS } from "./departments.constants.js";

function normalizeRequiredText(value, fieldName, maxLength) {
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be text`, "VALIDATION_ERROR");
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  if (normalized.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must not exceed ${maxLength} characters`,
      "VALIDATION_ERROR",
    );
  }

  return normalized;
}

function normalizeOptionalText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  return normalizeRequiredText(value, fieldName, maxLength);
}

function normalizeDepartmentCode(value) {
  const code = normalizeRequiredText(value, "Department code", 50).toUpperCase();

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new ApiError(
      400,
      "Department code may contain only uppercase letters, numbers, underscores, and hyphens",
      "VALIDATION_ERROR",
    );
  }

  return code;
}

function generateDepartmentCode(name) {
  const code = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50)
    .replace(/_+$/g, "");

  if (!code) {
    throw new ApiError(
      400,
      "Enter a department code because this name cannot generate one automatically",
      "DEPARTMENT_CODE_GENERATION_FAILED",
    );
  }

  return code;
}

function normalizeBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new ApiError(400, `${fieldName} must be true or false`, "VALIDATION_ERROR");
  }

  return value;
}

export function validateDepartmentId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(
      400,
      "Department id must be a positive integer",
      "VALIDATION_ERROR",
    );
  }

  return id;
}

export function validateDepartmentListQuery(query = {}) {
  const status = String(query.status || DEPARTMENT_FILTER_STATUS.ALL)
    .trim()
    .toUpperCase();

  if (!Object.values(DEPARTMENT_FILTER_STATUS).includes(status)) {
    throw new ApiError(
      400,
      "Department status filter must be ALL, ACTIVE, or INACTIVE",
      "VALIDATION_ERROR",
    );
  }

  return {
    status,
    search: normalizeOptionalText(query.search, "Search", 200),
  };
}

export function validateCreateDepartment(body = {}) {
  const name = normalizeRequiredText(body.name, "Department name", 200);
  const suppliedCode =
    typeof body.department_code === "string"
      ? body.department_code.trim()
      : body.department_code;

  return {
    name,
    department_code: suppliedCode
      ? normalizeDepartmentCode(suppliedCode)
      : generateDepartmentCode(name),
    description: normalizeOptionalText(
      body.description,
      "Department description",
      500,
    ),
    is_active:
      body.is_active === undefined
        ? true
        : normalizeBoolean(body.is_active, "is_active"),
  };
}

export function validateUpdateDepartmentDescription(body = {}) {
  return {
    description: normalizeOptionalText(
      body.description,
      "Department description",
      500,
    ),
  };
}

export function validateUpdateDepartmentStatus(body = {}) {
  return {
    is_active: normalizeBoolean(body.is_active, "is_active"),
  };
}
