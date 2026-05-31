import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import CurrencyText from "../components/CurrencyText";
import { can } from "../helpers/permissions";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../theme/statusStyles";

export function getDashboardStatsCards(budgetAccess, dashboardData) {
  const isApprover =
    can(budgetAccess, "can_approve_budget") ||
    can(budgetAccess, "can_manage_users");

  const isHod = can(budgetAccess, "can_edit_budget") && !isApprover;

  if (isHod) {
    const budgetStatus = dashboardData.currentBudget?.status || "DRAFT";
    const statusStyle = getBudgetStatusStyle(budgetStatus);

    return [
      {
        title: "Current Financial Year",
        value: dashboardData.openYear?.year || "-",
        description: dashboardData.openYear?.status
          ? `${dashboardData.openYear.status} financial year`
          : "Open financial year",
        icon: CalendarDays,
      },
      {
        title: "My Department",
        value: budgetAccess?.department?.name || "My Department",
        description: "Your department budget workspace",
        icon: Building2,
      },
      {
        title: "Current Budget Status",
        value: (
          <span
            className={`inline-flex rounded-2xl border px-3.5 py-2 text-sm font-bold ${statusStyle.badge}`}
          >
            {getBudgetStatusLabel(budgetStatus)}
          </span>
        ),
        description:
          budgetStatus === "RETURNED"
            ? "Budget returned and needs updates"
            : budgetStatus === "PENDING_APPROVAL"
              ? "Budget submitted and waiting approval"
              : budgetStatus === "APPROVED"
                ? "Budget approved and locked"
                : "Budget is editable",
        icon:
          budgetStatus === "APPROVED"
            ? CheckCircle2
            : budgetStatus === "RETURNED"
              ? AlertTriangle
              : Wallet,
      },
      {
        title: "Current Budget Total",
        value: <CurrencyText value={dashboardData.totalAmount} />,
        description: `${dashboardData.budgetItems.length} item(s) in your current budget`,
        icon: Wallet,
      },
    ];
  }

  const dashboardStats = dashboardData.dashboardStats;

  return [
    {
      title: "Current Financial Year",
      value: dashboardData.openYear?.year || "-",
      description: "Open budget cycle",
      icon: CalendarDays,
      show: true,
    },
    {
      title: "Pending Budget Approvals",
      value: dashboardStats?.budgets?.pending_budgets || 0,
      description: "Budgets waiting for approval decision",
      icon: Clock3,
      route: "/budget-approval",

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
      show: can(budgetAccess, "can_manage_categories"),
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
