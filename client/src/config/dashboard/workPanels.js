import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";

export function getWorkPanels(budgetAccess) {
  return [
    {
      title: "My PO Link Requests",
      description:
        "Submitted PO link requests and their approval status will appear here.",
      show: can(budgetAccess, PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS),
    },
    {
      title: "Pending PO Link Requests",
      description:
        "PO link requests waiting for your approval will appear here.",
      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS),
    },

    {
      title: "Approval Queue",
      description:
        "Budgets and transfers waiting for your approval will appear here.",
      show:
        can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES) ||
        can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS),
    },
    {
      title: "Admin Overview",
      description:
        "User access, roles, categories, and item requests will appear here.",
      show:
        can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_ACCESS) ||
        can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG) ||
        can(budgetAccess, PERMISSION_CODES.MANAGE_PO_ITEM_MAPPINGS),
    },

    {
      title: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG)
        ? "Pending Item / Category Requests"
        : "My Item / Category Requests",
      description: "Requested new items and categories will appear here.",
      show:
        can(
          budgetAccess,
          PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
        ) || can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG),
    },
    {
      title: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS)
        ? "Pending Transfer Requests"
        : "My Transfer Requests",

      description: "Budget transfer requests will appear here.",

      show:
        can(budgetAccess, PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS) ||
        can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS),
    },
    {
      title: "Reports Overview",
      description:
        "Exceeded items, variance, PO usage, and transfer reports will appear here.",
      show: can(budgetAccess, PERMISSION_CODES.VIEW_BUDGET_REPORTS),
    },
  ].filter((item) => item.show);
}
