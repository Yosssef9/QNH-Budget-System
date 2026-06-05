import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";

export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.TRANSFER_CREATED]: {
    strategy: "PERMISSION",
    permission: "can_approve_transfer",
  },

  [NOTIFICATION_TYPES.TRANSFER_APPROVED]: {
    strategy: "OWNER",
    ownerType: "TRANSFER",
  },

  [NOTIFICATION_TYPES.TRANSFER_REJECTED]: {
    strategy: "OWNER",
    ownerType: "TRANSFER",
  },

  [NOTIFICATION_TYPES.BUDGET_SUBMITTED]: {
    strategy: "PERMISSION",
    permission: "can_approve_budget",
  },

  [NOTIFICATION_TYPES.BUDGET_APPROVED]: {
    strategy: "OWNER",
    ownerType: "BUDGET",
  },

  [NOTIFICATION_TYPES.BUDGET_RETURNED]: {
    strategy: "OWNER",
    ownerType: "BUDGET",
  },

  [NOTIFICATION_TYPES.ITEM_REQUEST_CREATED]: {
    strategy: "PERMISSION",
    permission: "can_manage_categories",
  },

  [NOTIFICATION_TYPES.ITEM_REQUEST_APPROVED]: {
    strategy: "OWNER",
    ownerType: "ITEM_REQUEST",
  },

  [NOTIFICATION_TYPES.ITEM_REQUEST_REJECTED]: {
    strategy: "OWNER",
    ownerType: "ITEM_REQUEST",
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
};
