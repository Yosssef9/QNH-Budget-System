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
} from "lucide-react";

export function getQuickActions(budgetAccess) {
  const canViewBudget = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
  );
  const canApproveBudget = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
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
      description: "Enter and review department budgets.",
      path: "/budgets",
      icon: Wallet,
      show: canViewBudget && !canApproveBudget,
    },
    {
      title: "All Budgets",
      description: "Review budgets across all departments.",
      path: "/budgets/all",
      icon: Wallet,
      show: canViewBudget && canApproveBudget,
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
        ) && !canApproveBudget,
    },
    {
      title: "Link Approved PO",
      description: "Connect approved CareWare PO lines to budget items.",
      path: "/po-linking",
      icon: Link2,
      show: can(budgetAccess, PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS),
    },
    {
      title: "Request Transfer",
      description: "Move balance between existing or new budget items.",
      path: "/transfers/requests",
      icon: Repeat2,
      show: can(budgetAccess, PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS),
    },
    {
      title: "Approve Budgets",
      description: "Approve or return submitted budgets.",
      path: "/budget-approval",
      icon: ShieldCheck,
      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES),
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
