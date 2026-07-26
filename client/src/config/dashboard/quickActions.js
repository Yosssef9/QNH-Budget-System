import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import {
  CalendarDays,
  Wallet,
  Users,
  BarChart3,
  FileSpreadsheet,
  Link2,
  Repeat2,
  ShieldCheck,
  Tags,
  ClipboardCheck,
} from "lucide-react";

export function getQuickActions(budgetAccess) {
  const canViewBudget = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
  );
  const canViewCfoReview = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
  );
  const canViewReports = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_BUDGET_REPORTS,
  );
  const canViewCategoryBudget = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
  );

  return [
    {
      title: "Manage Financial Years",
      description: "Create and control active budget years.",
      path: "/financial-years",
      icon: CalendarDays,
      show: can(
        budgetAccess,
        PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
      ),
    },
    {
      title: "Budgets",
      description: "View your department budgets.",
      path: "/budgets",
      icon: Wallet,
      show: canViewBudget && !canViewCfoReview && !canViewCategoryBudget,
    },
    {
      title: "View Category Budget",
      description: "Review your category balances and department requests.",
      path: "/budgets",
      icon: Wallet,
      show: canViewCategoryBudget && !canViewCfoReview,
    },
    {
      title: "Category Review",
      description: "Review department submissions and prepare your category package.",
      path: "/category-review",
      icon: ClipboardCheck,
      show: canViewCategoryBudget && !canViewCfoReview,
    },
    {
      title: "All Budgets",
      description: "View department annual budgets and approved amounts.",
      path: "/budgets/all",
      icon: Wallet,
      show: canViewReports,
    },
    {
      title: "Enter / Edit Budget",
      description: "Enter, import, copy, and submit budgets.",
      path: "/budgets/entry",
      icon: FileSpreadsheet,
      show:
        can(
          budgetAccess,
          PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
        ) && !canViewCfoReview,
    },
    {
      title: "Link Approved PO",
      description: "Connect approved PO lines to package sub-items.",
      path: "/po-linking",
      icon: Link2,
      show: can(budgetAccess, PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS),
    },
    {
      title: "Request Transfer",
      description: "Move available balance between package sub-items.",
      path: "/transfers/requests",
      icon: Repeat2,
      show: can(budgetAccess, PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS),
    },
    {
      title: "CFO Review",
      description: "Review submitted category packages.",
      path: "/cfo-review",
      icon: ShieldCheck,
      show: can(
        budgetAccess,
        PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
      ),
    },
    {
      title: "Approve Transfers",
      description: "Approve or reject transfer requests.",
      path: "/transfers/approvals",
      icon: Repeat2,
      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS),
    },
    {
      title: "Approve PO Links",
      description: "Approve or reject PO link requests.",
      path: "/po-approvals",
      icon: ShieldCheck,
      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS),
    },
    {
      title: "User Access",
      description: "Assign roles and override permissions.",
      path: "/admin/users",
      icon: Users,
      show: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_ACCESS),
    },
    {
      title: "Budget Configuration",
      description: "Control categories, types, and item requests.",
      path: "/admin/budget-setup",
      icon: Tags,
      show: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG),
    },
    {
      title: "PO Item Mappings",
      description: "Maintain budget item to PO item code mappings.",
      path: "/admin/po-item-mappings",
      icon: Link2,
      show: can(budgetAccess, PERMISSION_CODES.MANAGE_PO_ITEM_MAPPINGS),
    },
    {
      title: "Reports",
      description: "Track usage, variance, transfers, and exceeded items.",
      path: "/reports",
      icon: BarChart3,
      show: can(budgetAccess, PERMISSION_CODES.VIEW_BUDGET_REPORTS),
    },
  ].filter((item) => item.show);
}
