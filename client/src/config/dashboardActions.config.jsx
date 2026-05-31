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

import { can } from "../helpers/permissions";

export function getQuickActions(budgetAccess) {
  return [
    {
      title: "Manage Financial Years",
      description: "Create and control active budget years.",
      path: "/financial-years",
      icon: CalendarDays,
      show: can(budgetAccess, "can_manage_financial_years"),
    },
    {
      title: "View Budgets",
      description: "Review assigned department budgets.",
      path: "/budgets",
      icon: Wallet,
      show: can(budgetAccess, "can_view_budget"),
    },
    {
      title: "Enter / Edit Budget",
      description: "Enter, import, copy, and submit budgets.",
      path: "/budgets",
      icon: FileSpreadsheet,
      show: can(budgetAccess, "can_edit_budget"),
    },
    {
      title: "Link Approved PO",
      description: "Connect approved CareWare PO lines to budget items.",
      path: "/budgets",
      icon: Link2,
      show: can(budgetAccess, "can_link_po"),
    },
    {
      title: "Request Transfer",
      description: "Move balance between existing or new budget items.",
      path: "/transfers",
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
      path: "/transfers",
      icon: Repeat2,
      show: can(budgetAccess, "can_approve_transfer"),
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
      title: "My Transfer Requests",
      description:
        "Your pending, approved, and rejected transfer requests will appear here.",
      show: can(budgetAccess, "can_request_transfer"),
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
      title: "Reports Overview",
      description:
        "Exceeded items, variance, PO usage, and transfer reports will appear here.",
      show: can(budgetAccess, "can_view_reports"),
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
  ].filter((item) => item.show);
}
