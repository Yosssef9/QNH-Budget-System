import React from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Link2,
  Wallet,
} from "lucide-react";

import CurrencyText from "../../components/CurrencyText";
import { can } from "../../helpers/permissions";

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
        budgetStatus === "APPROVED"
          ? "Budget is approved and available for use"
          : budgetStatus === "PENDING_APPROVAL"
            ? "Budget is awaiting approval"
            : budgetStatus === "RETURNED"
              ? "Budget was returned for revision"
              : budgetStatus === "CANCELLED"
                ? "Budget has been cancelled"
                : "Budget is still being prepared",

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
    ...(can(budgetAccess, "can_request_po_links")
      ? [
          {
            title: "PO Link Requests",
            value: "Open",
            description: "Submit and track PO link requests during pre-closing.",
            icon: Link2,
            route: "/po-linking",
          },
        ]
      : []),
  ];
}
