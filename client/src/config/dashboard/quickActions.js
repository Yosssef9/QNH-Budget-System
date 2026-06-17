import { can } from "../../helpers/permissions";
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
  const permissions = budgetAccess?.permissions || {};
  const canViewBudget = can(budgetAccess, "can_view_budget");
  const canApproveBudget = can(budgetAccess, "can_approve_budget");

  return [
    {
      title: "Manage Financial Years",
      description: "Create and control active budget years.",
      path: "/financial-years",
      icon: CalendarDays,
      show: can(budgetAccess, "can_manage_financial_years"),
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
        can(budgetAccess, "can_edit_budget") && !permissions.can_approve_budget,
    },
    {
      title: "Link Approved PO",
      description: "Connect approved CareWare PO lines to budget items.",
      path: "/po-linking",
      icon: Link2,
      show: can(budgetAccess, "can_request_po_links"),
    },
    {
      title: "Request Transfer",
      description: "Move balance between existing or new budget items.",
      path: "/transfers/requests",
      icon: Repeat2,
      show: can(budgetAccess, "can_request_transfer"),
    },
    {
      title: "Approve Budgets",
      description: "Approve or return submitted budgets.",
      path: "/budget-approval",
      icon: ShieldCheck,
      show: can(budgetAccess, "can_approve_budget"),
    },
    {
      title: "Approve Transfers",
      description: "Approve or reject transfer requests.",
      path: "/transfers/approvals",
      icon: Repeat2,
      show: can(budgetAccess, "can_approve_transfer"),
    },
    {
      title: "Approve PO Links",
      description: "Approve or reject PO link requests.",
      path: "/po-approvals",
      icon: ShieldCheck,
      show: can(budgetAccess, "can_approve_po_links"),
    },
    {
      title: "User Access",
      description: "Assign roles and override permissions.",
      path: "/admin/users",
      icon: Users,
      show: can(budgetAccess, "can_manage_users"),
    },
    {
      title: "Budget Configuration",
      description: "Control categories, types, and item requests.",
      path: "/admin/budget-setup",
      icon: Tags,
      show: can(budgetAccess, "can_manage_categories"),
    },
    {
      title: "Reports",
      description: "Track usage, variance, transfers, and exceeded items.",
      path: "/reports",
      icon: BarChart3,
      show: can(budgetAccess, "can_view_reports"),
    },
  ].filter((item) => item.show);
}
