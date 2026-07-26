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

function renderCfoPackageProgressBadge({ submittedCount, totalCount }) {
  const hasSubmittedPackages = submittedCount > 0;

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-[0.12em]",
        hasSubmittedPackages
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {submittedCount} / {totalCount} Submitted
    </span>
  );
}

export function getAdminCards(budgetAccess, dashboardData) {
  const dashboardStats = dashboardData.dashboardStats;
  const pendingPOLinkCount = (
    dashboardData.dashboardPOLinks?.requests || []
  ).filter((request) => request.status === "PENDING").length;
  const cfoPackageReview = dashboardStats?.cfo?.packageReview || {};
  const totalCategoryPackages = Number(
    cfoPackageReview.total_category_packages || 3,
  );
  const submittedCategoryPackages = Number(
    cfoPackageReview.submitted_category_packages || 0,
  );
  const waitingForCfoPackages = Number(
    cfoPackageReview.waiting_for_cfo_packages || 0,
  );
  const pendingCfoPackageItems = Number(
    cfoPackageReview.pending_cfo_package_items || 0,
  );

  return [
    createFinancialYearCard(dashboardData.activeYear),

    {
      title: "CFO Package Review",
      value: renderCfoPackageProgressBadge({
        submittedCount: submittedCategoryPackages,
        totalCount: totalCategoryPackages,
      }),

      description:
        waitingForCfoPackages > 0
          ? `${waitingForCfoPackages} package(s) and ${pendingCfoPackageItems} item(s) waiting for CFO decision`
          : "No category packages are waiting for CFO review",

      icon: Clock3,

      route: "/cfo-review",
      highlight: waitingForCfoPackages > 0 ? "pending" : null,
      show:
        can(
          budgetAccess,
          PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
        ) ||
        can(budgetAccess, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES),
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

      show: can(budgetAccess, PERMISSION_CODES.VIEW_BUDGET_REPORTS),
    },

    {
      title: "Departments Covered",
      value: dashboardStats?.departments?.departments_with_budgets || 0,

      description: "Departments with budgets in current year",

      icon: Building2,

      route: "/budgets/all",

      show: can(budgetAccess, PERMISSION_CODES.VIEW_BUDGET_REPORTS),
    },

    {
      title: "Pending Item Requests",

      value: dashboardStats?.itemRequests?.pending_item_requests || 0,

      description: "New item requests waiting for catalog review",

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
