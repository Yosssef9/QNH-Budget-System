import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Wallet,
} from "lucide-react";

import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../theme/statusStyles";

import { createFinancialYearCard } from "./commonCards";

export function getHodCards(budgetAccess, dashboardData) {
  const budgetStatus = dashboardData.currentBudget?.status || "DRAFT";

  const statusStyle = getBudgetStatusStyle(budgetStatus);

  return [
    createFinancialYearCard(dashboardData.activeYear),

    {
      title: "My Department",
      value: budgetAccess?.department?.name || "My Department",
      description: "Your department budget workspace",
      icon: Building2,
      route: "/budgets",
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
        budgetStatus === "CATEGORY_REVIEW_COMPLETED"
          ? "All submitted category budgets have completed Category Manager review"
          : budgetStatus === "IN_CATEGORY_REVIEW"
            ? "At least one category budget is under Category Manager review"
            : "Department category budgets are still being prepared",

      icon:
        budgetStatus === "CATEGORY_REVIEW_COMPLETED"
          ? CheckCircle2
          : budgetStatus === "IN_CATEGORY_REVIEW"
            ? AlertTriangle
            : Wallet,
      route: "/budgets",
    },

    {
      title: "Requested Quantity",
      value: Number(
        dashboardData.totalRequestedQuantity || 0,
      ).toLocaleString(undefined, {
        maximumFractionDigits: 4,
      }),
      description: `${dashboardData.budgetItems.length} requested item(s) in your current budget`,
      icon: Wallet,
      route: "/budgets",
    },
  ];
}
