import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
import { PERMISSION_CODES } from "../../shared/permissions/permissionCodes.js";

export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.TRANSFER_CREATED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS,
    scope: { type: "GLOBAL" },
  },

  [NOTIFICATION_TYPES.TRANSFER_APPROVED]: {
    strategy: "OWNER",
    ownerType: "TRANSFER",
  },

  [NOTIFICATION_TYPES.TRANSFER_REJECTED]: {
    strategy: "OWNER",
    ownerType: "TRANSFER",
  },

  [NOTIFICATION_TYPES.DEPARTMENT_CATEGORY_BUDGET_SUBMITTED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS,
    scope: { type: "CATEGORY", payloadField: "categoryId" },
  },

  [NOTIFICATION_TYPES.DEPARTMENT_CATEGORY_REVIEW_COMPLETED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    scope: { type: "DEPARTMENT", payloadField: "departmentId" },
  },

  [NOTIFICATION_TYPES.DEPARTMENT_BUDGET_APPROVAL_UPDATED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    scope: { type: "DEPARTMENT", payloadField: "departmentId" },
  },

  [NOTIFICATION_TYPES.CATEGORY_SUBMISSION_WINDOW_CLOSED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
    scope: { type: "GLOBAL" },
  },

  [NOTIFICATION_TYPES.CATEGORY_SUBMISSION_WINDOW_REOPENED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
    scope: { type: "GLOBAL" },
  },

  [NOTIFICATION_TYPES.CATEGORY_BUDGET_PACKAGE_SUBMITTED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
    scope: { type: "GLOBAL" },
  },

  [NOTIFICATION_TYPES.CATEGORY_BUDGET_PACKAGE_RETURNED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
    scope: { type: "CATEGORY", payloadField: "categoryId" },
  },

  [NOTIFICATION_TYPES.CATEGORY_BUDGET_PACKAGE_COMPLETED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
    scope: { type: "CATEGORY", payloadField: "categoryId" },
  },

  [NOTIFICATION_TYPES.CFO_ANNUAL_PACKAGE_REVIEW_FINALIZED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
    scope: { type: "GLOBAL" },
  },

  [NOTIFICATION_TYPES.ITEM_REQUEST_CREATED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
    scope: { type: "GLOBAL" },
  },

  [NOTIFICATION_TYPES.ITEM_REQUEST_APPROVED]: {
    strategy: "OWNER",
    ownerType: "ITEM_REQUEST",
  },

  [NOTIFICATION_TYPES.ITEM_REQUEST_REJECTED]: {
    strategy: "OWNER",
    ownerType: "ITEM_REQUEST",
  },

  [NOTIFICATION_TYPES.ADJUSTMENT_REQUEST_SUBMITTED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS,
    scope: { type: "CATEGORY", payloadField: "categoryId" },
  },

  [NOTIFICATION_TYPES.ADJUSTMENT_REQUEST_APPROVED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    scope: { type: "DEPARTMENT", payloadField: "departmentId" },
  },

  [NOTIFICATION_TYPES.ADJUSTMENT_REQUEST_REJECTED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    scope: { type: "DEPARTMENT", payloadField: "departmentId" },
  },

  [NOTIFICATION_TYPES.FINANCIAL_YEAR_OPENED]: {
    strategy: "BROADCAST",
  },

  [NOTIFICATION_TYPES.FINANCIAL_YEAR_PRE_CLOSING]: {
    strategy: "BROADCAST",
  },

  [NOTIFICATION_TYPES.FINANCIAL_YEAR_CLOSED]: {
    strategy: "BROADCAST",
  },
  [NOTIFICATION_TYPES.PO_LINK_SUBMITTED]: {
    strategy: "PERMISSION",
    permission: PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS,
    scope: { type: "GLOBAL" },
  },

  [NOTIFICATION_TYPES.PO_LINK_APPROVED]: {
    strategy: "OWNER",
    ownerType: "PO_LINK",
  },

  [NOTIFICATION_TYPES.PO_LINK_REJECTED]: {
    strategy: "OWNER",
    ownerType: "PO_LINK",
  },
};
