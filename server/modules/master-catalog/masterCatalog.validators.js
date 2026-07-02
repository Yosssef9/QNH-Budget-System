import { ApiError } from "../../utils/apiError.js";
import {
  CATEGORY_CODES,
  EXPENSE_TYPES,
  GENERAL_SUB_ITEM,
  categoryCodeFromName,
  normalizeCatalogCode,
} from "./masterCatalog.constants.js";

function normalizeText(value, fieldName, maxLength) {
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be text`, "VALIDATION_ERROR");
  }

  const text = value.trim().replace(/\s+/g, " ");

  if (!text) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  if (text.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must not exceed ${maxLength} characters`,
      "VALIDATION_ERROR",
    );
  }

  return text;
}

function optionalText(value, fieldName, maxLength) {
  if (value === null || value === undefined || value === "") return null;
  return normalizeText(value, fieldName, maxLength);
}

export function validatePositiveInt(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive integer`,
      "VALIDATION_ERROR",
    );
  }

  return number;
}

function normalizeExpenseType(value) {
  const expenseType = String(value || "").trim().toUpperCase();

  if (!Object.values(EXPENSE_TYPES).includes(expenseType)) {
    throw new ApiError(
      400,
      "expense_type must be OPEX or CAPEX",
      "VALIDATION_ERROR",
    );
  }

  return expenseType;
}

function validateRequiredPositiveInt(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  return validatePositiveInt(value, fieldName);
}

function validateCategoryCode(value, fallbackName) {
  const code = value ? normalizeCatalogCode(value) : categoryCodeFromName(fallbackName);

  if (!Object.values(CATEGORY_CODES).includes(code)) {
    throw new ApiError(
      400,
      "Only IT, Biomedical, and General budget categories are supported",
      "INVALID_BUDGET_CATEGORY_CODE",
    );
  }

  return code;
}

export function validateCreateCategory(body = {}) {
  const name = normalizeText(body.name, "Category name", 100);
  const category_code = validateCategoryCode(body.category_code, name);

  return {
    category_code,
    name,
    description: optionalText(body.description, "Category description", 500),
  };
}

export function validateUpdateCategory(body = {}) {
  return {
    name: normalizeText(body.name, "Category name", 100),
    description: optionalText(body.description, "Category description", 500),
  };
}

export function validateCreateCatalogItem(body = {}) {
  return {
    item_code: body.item_code
      ? normalizeCatalogCode(body.item_code)
      : normalizeCatalogCode(body.name),
    name: normalizeText(body.name, "Catalog item name", 200),
    description: optionalText(body.description, "Catalog item description", 1000),
    expense_type: normalizeExpenseType(body.expense_type),
    unit_of_measure_id: validateRequiredPositiveInt(
      body.unit_of_measure_id,
      "unit_of_measure_id",
    ),
  };
}

export function validateUpdateCatalogItem(body = {}) {
  return validateCreateCatalogItem(body);
}

export function validateCreateSubItem(body = {}) {
  const isDefaultGeneral = Boolean(body.is_default_general);
  const subItemCode = body.sub_item_code
    ? normalizeCatalogCode(body.sub_item_code)
    : normalizeCatalogCode(body.name);

  if (isDefaultGeneral && subItemCode !== GENERAL_SUB_ITEM.code) {
    throw new ApiError(
      400,
      "The default General sub-item must use code GENERAL",
      "INVALID_GENERAL_SUB_ITEM_CODE",
    );
  }

  return {
    sub_item_code: subItemCode,
    name: normalizeText(body.name, "Sub-item name", 300),
    default_specification: optionalText(
      body.default_specification,
      "Default specification",
      2000,
    ),
    default_unit_of_measure_id: validatePositiveInt(
      body.default_unit_of_measure_id ?? body.unit_of_measure_id,
      "default_unit_of_measure_id",
    ),
    is_default_general: isDefaultGeneral,
  };
}

export function validateUpdateSubItem(body = {}) {
  return validateCreateSubItem(body);
}

export function validateStatusPayload(body = {}) {
  if (typeof body.is_active !== "boolean") {
    throw new ApiError(400, "is_active must be boolean", "VALIDATION_ERROR");
  }

  return { is_active: body.is_active };
}
