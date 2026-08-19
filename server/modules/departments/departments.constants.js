import { PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";

export const DEPARTMENT_MANAGEMENT_PERMISSION =
  PERMISSION_CODES.MANAGE_DEPARTMENTS;

export const DEPARTMENT_FILTER_STATUS = Object.freeze({
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
});

export const DEPARTMENT_CATEGORY_BUDGET_STATUS = Object.freeze({
  DRAFT: "DRAFT",
});

export const REQUIRED_DEPARTMENT_CATEGORY_CODES = Object.freeze([
  "IT",
  "BIOMEDICAL",
  "GENERAL",
]);
