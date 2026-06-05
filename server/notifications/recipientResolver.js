import { NOTIFICATION_CONFIG } from "./notificationConfig.js";

import {
  getUsersByPermissionRepo,
  getAllActiveUsersExceptRepo,
  getTransferRequesterRepo,
  getBudgetOwnerRepo,
  getItemRequestOwnerRepo,
} from "../repositories/notificationRecipients.repository.js";

export async function resolveRecipients(notificationType, payload) {
  const config = NOTIFICATION_CONFIG[notificationType];

  if (!config) {
    return [];
  }

  switch (config.strategy) {
    case "PERMISSION":
      return getUsersByPermissionRepo(config.permission);

    case "BROADCAST":
      return getAllActiveUsersExceptRepo(payload.actorUserId);

    case "OWNER":
      switch (config.ownerType) {
        case "TRANSFER":
          return getTransferRequesterRepo(payload.transferId);

        case "BUDGET":
          return getBudgetOwnerRepo(payload.budgetId);

        case "ITEM_REQUEST":
          return getItemRequestOwnerRepo(payload.requestId);

        default:
          return [];
      }

    default:
      return [];
  }
}
