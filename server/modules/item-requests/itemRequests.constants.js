import { CATEGORY_CODES } from "../master-catalog/masterCatalog.constants.js";
import { PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";

export const ITEM_REQUEST_STATUSES = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ALL: "ALL",
});

export const ITEM_REQUEST_EXPENSE_TYPES = Object.freeze({
  OPEX: "OPEX",
  CAPEX: "CAPEX",
});

export const SUPPORTED_ITEM_REQUEST_CATEGORY_CODES = Object.freeze([
  CATEGORY_CODES.IT,
  CATEGORY_CODES.BIOMEDICAL,
  CATEGORY_CODES.GENERAL,
]);

export const ITEM_REQUEST_ADMIN_PERMISSION = PERMISSION_CODES.MANAGE_BUDGET_CATALOG;
