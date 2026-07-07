import {
  Building2,
  CheckCircle2,
  Clock3,
  Tags,
  Users,
  ArrowRightLeft,
  Link2,
} from "lucide-react";

import CurrencyText from "../../components/CurrencyText";

import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";

import { createFinancialYearCard } from "./commonCards";

export function getAdminCards(budgetAccess, dashboardData) {
  const dashboardStats = dashboardData.dashboardStats;
  const pendingPOLinkCount = (
    dashboardData.dashboardPOLinks?.requests || []
  ).filter((request) => request.status === "PENDING").length;

  return [
    createFinancialYearCard(dashboardData.activeYear),

    {
      title: "Pending Budget Approvals",
      value: dashboardStats?.budgets?.pending_budgets || 0,

      description: "Budgets waiting for approval decision",

      icon: Clock3,

      route: "/budget-approval",
      highlight:
        (dashboardStats?.budgets?.pending_budgets || 0) > 0 ? "pending" : null,
      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES),
    },

    {
      title: "Approved Budget Value",
      value: (
        <CurrencyText
          value={dashboardStats?.approvedAmount?.approved_total_amount || 0}
        />
      ),

      description: "Total approved budget amount in current year",

      icon: CheckCircle2,

      route: "/budgets/all",

      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES),
    },

    {
      title: "Departments Covered",
      value: dashboardStats?.departments?.departments_with_budgets || 0,

      description: "Departments with budgets in current year",

      icon: Building2,

      route: "/budgets/all",

      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES),
    },

    {
      title: "Pending Item Requests",

      value: dashboardStats?.itemRequests?.pending_item_requests || 0,

      description: "New item/category requests waiting review",

      icon: Tags,

      route: "/admin/budget-setup",
      highlight:
        (dashboardStats?.itemRequests?.pending_item_requests || 0) > 0
          ? "pending"
          : null,
      show: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG),
    },
    {
      title: "Pending Transfer Requests",

      value: dashboardStats?.transferRequests?.pending_transfer_requests || 0,

      description: "Transfer requests waiting for approval",

      icon: ArrowRightLeft,

      route: "/transfers/approvals",
      highlight:
        (dashboardStats?.transferRequests?.pending_transfer_requests || 0) > 0
          ? "pending"
          : null,
      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS),
    },
    {
      title: "Pending PO Link Requests",

      value: pendingPOLinkCount,

      description: "PO link requests waiting for approval",

      icon: Link2,

      route: "/po-approvals",
      highlight: pendingPOLinkCount > 0 ? "pending" : null,
      show: can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS),
    },
    {
      title: "System Users",

      value: dashboardStats?.users?.system_users || 0,

      description: "Users with active budget system access",

      icon: Users,

      route: "/admin/users",

      show: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_ACCESS),
    },
  ].filter((item) => item.show);
}
