import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";

export async function buildNotificationPayload(notificationType, payload) {
  switch (notificationType) {
    case NOTIFICATION_TYPES.BUDGET_SUBMITTED:
    case NOTIFICATION_TYPES.BUDGET_APPROVED:
    case NOTIFICATION_TYPES.BUDGET_RETURNED:
      return payload;

    case NOTIFICATION_TYPES.TRANSFER_CREATED:
    case NOTIFICATION_TYPES.TRANSFER_APPROVED:
    case NOTIFICATION_TYPES.TRANSFER_REJECTED:
      return payload;

    case NOTIFICATION_TYPES.ITEM_REQUEST_CREATED:
    case NOTIFICATION_TYPES.ITEM_REQUEST_APPROVED:
    case NOTIFICATION_TYPES.ITEM_REQUEST_REJECTED:
      return payload;

    default:
      return payload;
  }
}
