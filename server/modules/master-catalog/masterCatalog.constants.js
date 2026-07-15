import { PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";

export const MASTER_CATALOG_PERMISSION = PERMISSION_CODES.MANAGE_BUDGET_CATALOG;

export const CATEGORY_PACKAGE_SUB_ITEM_PERMISSION =
  PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_SUB_ITEMS;

export const CATEGORY_CODES = Object.freeze({
  IT: "IT",
  BIOMEDICAL: "BIOMEDICAL",
  GENERAL: "GENERAL",
});

export const CATEGORY_SORT_ORDER = Object.freeze({
  [CATEGORY_CODES.IT]: 1,
  [CATEGORY_CODES.BIOMEDICAL]: 2,
  [CATEGORY_CODES.GENERAL]: 3,
});

export const EXPENSE_TYPES = Object.freeze({
  OPEX: "OPEX",
  CAPEX: "CAPEX",
});

export const GENERAL_SUB_ITEM = Object.freeze({
  code: "GENERAL",
  name: "General",
});

export function normalizeCatalogCode(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

export function categoryCodeFromName(name) {
  const normalized = normalizeCatalogCode(name);

  if (normalized === "BIOMEDICAL" || normalized === "BIOMED") {
    return CATEGORY_CODES.BIOMEDICAL;
  }

  if (normalized === "GENERAL") {
    return CATEGORY_CODES.GENERAL;
  }

  if (normalized === "IT" || normalized === "INFORMATION_TECHNOLOGY") {
    return CATEGORY_CODES.IT;
  }

  return normalized;
}
