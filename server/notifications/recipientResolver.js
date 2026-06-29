import { NOTIFICATION_CONFIG } from "./notificationConfig.js";

import {
  getUsersByPermissionRepo,
  getAllActiveUsersExceptRepo,
  getCategoryPoLinkRequesterRepo,
  getCategoryTransferRequesterRepo,
  getTransferRequesterRepo,
  getBudgetOwnerRepo,
  getBudgetChangeRequestReviewersRepo,
  getItemRequestOwnerRepo,
  getPOLinkRequesterRepo,
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

        case "CATEGORY_TRANSFER":
          return getCategoryTransferRequesterRepo(payload.categoryTransferId);

        case "CATEGORY_PO_LINK":
          return getCategoryPoLinkRequesterRepo(payload.categoryPoLinkId);

        case "BUDGET":
          return getBudgetOwnerRepo(payload.budgetId);

        case "ITEM_REQUEST":
          return getItemRequestOwnerRepo(payload.requestId);
        case "PO_LINK":
          return getPOLinkRequesterRepo(payload.poLinkId);

        default:
          return [];
      }

    case "CHANGE_REQUEST_REVIEWERS":
      return getBudgetChangeRequestReviewersRepo({
        categoryId: payload.categoryId,
      });

    default:
      return [];
  }
}
