import React from "react";

import {
  Building2,
  CheckCircle2,
  Clock3,
  Tags,
  Users,
  ArrowRightLeft,
} from "lucide-react";

import CurrencyText from "../../components/CurrencyText";

import { can } from "../../helpers/permissions";

import { createFinancialYearCard } from "./commonCards";

export function getAdminCards(budgetAccess, dashboardData) {
  const dashboardStats = dashboardData.dashboardStats;

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
      show: can(budgetAccess, "can_approve_budget"),
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

      show: can(budgetAccess, "can_approve_budget"),
    },

    {
      title: "Departments Covered",
      value: dashboardStats?.departments?.departments_with_budgets || 0,

      description: "Departments with budgets in current year",

      icon: Building2,

      show: can(budgetAccess, "can_approve_budget"),
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
      show: can(budgetAccess, "can_manage_categories"),
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
      show: can(budgetAccess, "can_approve_transfer"),
    },
    {
      title: "System Users",

      value: dashboardStats?.users?.system_users || 0,

      description: "Users with active budget system access",

      icon: Users,

      route: "/admin/users",

      show: can(budgetAccess, "can_manage_users"),
    },
  ].filter((item) => item.show);
}
