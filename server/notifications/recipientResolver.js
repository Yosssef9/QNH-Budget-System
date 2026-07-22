import { NOTIFICATION_CONFIG } from "./notificationConfig.js";
import { getUsersByEffectivePermission } from "../modules/access-management/access.service.js";

import {
  getActiveBudgetUsersExceptRepo,
  getTransferRequesterRepo,
  getBudgetOwnerRepo,
  getItemRequestOwnerRepo,
  getPOLinkRequesterRepo,
} from "../repositories/notificationRecipients.repository.js";

function resolvePermissionScope(config, payload = {}) {
  const scope = config.scope || { type: "GLOBAL" };
  const type = String(scope.type || "GLOBAL").toUpperCase();

  if (type === "CATEGORY") {
    return {
      type,
      categoryId: payload[scope.payloadField || "categoryId"],
    };
  }

  if (type === "DEPARTMENT") {
    return {
      type,
      departmentId: payload[scope.payloadField || "departmentId"],
    };
  }

  return { type: "GLOBAL" };
}

export async function resolveRecipients(notificationType, payload) {
  const config = NOTIFICATION_CONFIG[notificationType];

  if (!config) {
    return [];
  }

  switch (config.strategy) {
    case "PERMISSION":
      return getUsersByEffectivePermission({
        permissionCode: config.permission,
        scope: resolvePermissionScope(config, payload),
      });

    case "BROADCAST":
      return getActiveBudgetUsersExceptRepo(payload.actorUserId);

    case "OWNER":
      switch (config.ownerType) {
        case "TRANSFER":
          return getTransferRequesterRepo(payload.transferId);

        case "BUDGET":
          return getBudgetOwnerRepo(payload.budgetId);

        case "ITEM_REQUEST":
          return getItemRequestOwnerRepo(payload.requestId);
        case "PO_LINK":
          return getPOLinkRequesterRepo(payload.poLinkId);

        default:
          return [];
      }

    default:
      return [];
  }
}
