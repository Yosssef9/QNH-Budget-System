import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";

import { transferCreatedTemplate } from "./templates/transferCreated.template.js";
import { transferApprovedTemplate } from "./templates/transferApproved.template.js";
import { transferRejectedTemplate } from "./templates/transferRejected.template.js";
import { categoryTransferSubmittedTemplate } from "./templates/categoryTransferSubmitted.template.js";
import { categoryTransferApprovedTemplate } from "./templates/categoryTransferApproved.template.js";
import { categoryTransferRejectedTemplate } from "./templates/categoryTransferRejected.template.js";
import { categoryPoLinkSubmittedTemplate } from "./templates/categoryPoLinkSubmitted.template.js";
import { categoryPoLinkApprovedTemplate } from "./templates/categoryPoLinkApproved.template.js";
import { categoryPoLinkRejectedTemplate } from "./templates/categoryPoLinkRejected.template.js";

import { budgetSubmittedTemplate } from "./templates/budgetSubmitted.template.js";
import { budgetApprovedTemplate } from "./templates/budgetApproved.template.js";
import { budgetReturnedTemplate } from "./templates/budgetReturned.template.js";
import { budgetChangeRequestSubmittedTemplate } from "./templates/budgetChangeRequestSubmitted.template.js";

import { itemRequestCreatedTemplate } from "./templates/itemRequestCreated.template.js";
import { itemRequestApprovedTemplate } from "./templates/itemRequestApproved.template.js";
import { itemRequestRejectedTemplate } from "./templates/itemRequestRejected.template.js";

import { financialYearOpenedTemplate } from "./templates/financialYearOpened.template.js";
import { financialYearPreClosingTemplate } from "./templates/financialYearPreClosing.template.js";
import { financialYearClosedTemplate } from "./templates/financialYearClosed.template.js";
import { poLinkSubmittedTemplate } from "./templates/poLinkSubmitted.template.js";
import { poLinkApprovedTemplate } from "./templates/poLinkApproved.template.js";
import { poLinkRejectedTemplate } from "./templates/poLinkRejected.template.js";
export function resolveTemplate(notificationType, payload) {
  switch (notificationType) {
    case NOTIFICATION_TYPES.TRANSFER_CREATED:
      return transferCreatedTemplate(payload);

    case NOTIFICATION_TYPES.TRANSFER_APPROVED:
      return transferApprovedTemplate(payload);

    case NOTIFICATION_TYPES.TRANSFER_REJECTED:
      return transferRejectedTemplate(payload);

    case NOTIFICATION_TYPES.CATEGORY_TRANSFER_SUBMITTED:
      return categoryTransferSubmittedTemplate(payload);

    case NOTIFICATION_TYPES.CATEGORY_TRANSFER_APPROVED:
      return categoryTransferApprovedTemplate(payload);

    case NOTIFICATION_TYPES.CATEGORY_TRANSFER_REJECTED:
      return categoryTransferRejectedTemplate(payload);

    case NOTIFICATION_TYPES.CATEGORY_PO_LINK_SUBMITTED:
      return categoryPoLinkSubmittedTemplate(payload);

    case NOTIFICATION_TYPES.CATEGORY_PO_LINK_APPROVED:
      return categoryPoLinkApprovedTemplate(payload);

    case NOTIFICATION_TYPES.CATEGORY_PO_LINK_REJECTED:
      return categoryPoLinkRejectedTemplate(payload);

    case NOTIFICATION_TYPES.BUDGET_SUBMITTED:
      return budgetSubmittedTemplate(payload);

    case NOTIFICATION_TYPES.BUDGET_APPROVED:
      return budgetApprovedTemplate(payload);

    case NOTIFICATION_TYPES.BUDGET_RETURNED:
      return budgetReturnedTemplate(payload);

    case NOTIFICATION_TYPES.BUDGET_CHANGE_REQUEST_SUBMITTED:
      return budgetChangeRequestSubmittedTemplate(payload);

    case NOTIFICATION_TYPES.ITEM_REQUEST_CREATED:
      return itemRequestCreatedTemplate(payload);

    case NOTIFICATION_TYPES.ITEM_REQUEST_APPROVED:
      return itemRequestApprovedTemplate(payload);

    case NOTIFICATION_TYPES.ITEM_REQUEST_REJECTED:
      return itemRequestRejectedTemplate(payload);

    case NOTIFICATION_TYPES.FINANCIAL_YEAR_OPENED:
      return financialYearOpenedTemplate(payload);

    case NOTIFICATION_TYPES.FINANCIAL_YEAR_PRE_CLOSING:
      return financialYearPreClosingTemplate(payload);

    case NOTIFICATION_TYPES.FINANCIAL_YEAR_CLOSED:
      return financialYearClosedTemplate(payload);
    case NOTIFICATION_TYPES.PO_LINK_SUBMITTED:
      return poLinkSubmittedTemplate(payload);

    case NOTIFICATION_TYPES.PO_LINK_APPROVED:
      return poLinkApprovedTemplate(payload);

    case NOTIFICATION_TYPES.PO_LINK_REJECTED:
      return poLinkRejectedTemplate(payload);
    default:
      throw new Error(`Unknown notification type: ${notificationType}`);
  }
}
