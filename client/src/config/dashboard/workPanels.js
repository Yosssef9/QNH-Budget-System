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
      title: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG)
        ? "Pending Item Requests"
        : "My Item Requests",
      description: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG)
        ? "New budget item requests waiting for catalog review appear here."
        : "New budget item requests you submitted appear here.",
      show:
        can(
          budgetAccess,
          PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
        ) || can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG),
    },
    {
      title: can(
        budgetAccess,
        PERMISSION_CODES.REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS,
      )
        ? "Department Adjustment Requests"
        : "My Adjustment Requests",
      description:
        "Post-pre-closing adjustment requests and Category Manager decisions appear here.",
      show:
        can(
          budgetAccess,
          PERMISSION_CODES.SUBMIT_DEPARTMENT_BUDGET_CHANGE_REQUESTS,
        ) ||
        can(
          budgetAccess,
          PERMISSION_CODES.REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS,
        ),
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
  ].filter((item) => item.show);
}
