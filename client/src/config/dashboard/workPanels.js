import { can } from "../../helpers/permissions";

export function getWorkPanels(budgetAccess) {
  return [
    {
      title: "Budget Workspace",
      description: "No draft, returned, or active budgets to show yet.",
      show:
        can(budgetAccess, "can_view_budget") ||
        can(budgetAccess, "can_edit_budget"),
    },
    {
      title: "PO Linking",
      description:
        "Approved CareWare PO lines ready for linking will appear here.",
      show: can(budgetAccess, "can_link_po"),
    },

    {
      title: "Approval Queue",
      description:
        "Budgets and transfers waiting for your approval will appear here.",
      show:
        can(budgetAccess, "can_approve_budget") ||
        can(budgetAccess, "can_approve_transfer"),
    },
    {
      title: "Admin Overview",
      description:
        "User access, roles, categories, and item requests will appear here.",
      show:
        can(budgetAccess, "can_manage_users") ||
        can(budgetAccess, "can_manage_categories"),
    },

    {
      title: can(budgetAccess, "can_manage_categories")
        ? "Pending Item / Category Requests"
        : "My Item / Category Requests",
      description: "Requested new items and categories will appear here.",
      show:
        can(budgetAccess, "can_edit_budget") ||
        can(budgetAccess, "can_manage_categories"),
    },
    {
      title: can(budgetAccess, "can_approve_transfer")
        ? "Pending Transfer Requests"
        : "My Transfer Requests",

      description: "Budget transfer requests will appear here.",

      show:
        can(budgetAccess, "can_request_transfer") ||
        can(budgetAccess, "can_approve_transfer"),
    },
    {
      title: "Reports Overview",
      description:
        "Exceeded items, variance, PO usage, and transfer reports will appear here.",
      show: can(budgetAccess, "can_view_reports"),
    },
  ].filter((item) => item.show);
}
