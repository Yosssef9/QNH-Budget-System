import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../context/AuthContext";
import { getCurrentFinancialYear } from "../api/financialYears.api";

import {
  PERMISSION_CODES,
  hasAnyPermission,
  hasPermission,
} from "../../../shared/permissions/permissionCodes.js";

const budgetActions = [
  {
    title: "My Budgets",
    description: "View draft, returned, pending, and approved budgets.",
    path: "/budgets/my",
    icon: Wallet,
    permission: PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    primary: true,
  },
  {
    title: "Category Budget",
    description: "View category balances and department requests.",
    path: "/budgets/my",
    icon: Wallet,
    permission: PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
    primary: true,
  },
  {
    title: "Budget Entry",
    description: "Enter budget items manually for the open financial year.",
    path: "/budgets/entry",
    icon: Plus,
    permission: PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
  },

  // {
  //   title: "Budget History",
  //   description: "View previous versions and approved historical budgets.",
  //   path: "/budgets/history",
  //   icon: History,
  //   permission: PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
  // },
];

export default function BudgetsPage() {
  const { budgetAccess } = useAuth();
  const navigate = useNavigate();

  const permissionCodes =
    budgetAccess?.permissionCodes ??
    budgetAccess?.selectedWorkspace?.permissionCodes ??
    [];

  const isCfoBudgetReviewer = hasAnyPermission(permissionCodes, [
    PERMISSION_CODES.VIEW_BUDGET_REPORTS,
  ]);
  const isCategoryManager = hasAnyPermission(permissionCodes, [
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
    PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
  ]);

  useEffect(() => {
    if (isCfoBudgetReviewer) {
      navigate("/budgets/all", { replace: true });
    }
  }, [isCfoBudgetReviewer, navigate]);

  async function handleBudgetEntryClick() {
    try {
      const year = await getCurrentFinancialYear();

      if (year?.status === "PRE_CLOSING") {
        toast.error(
          "Budget Entry is locked. The financial year is in Pre-Closing status.",
        );
        return;
      }

      if (year?.status === "CLOSED") {
        toast.error(
          "Budget Entry is locked. The financial year has been closed.",
        );
        return;
      }

      navigate("/budgets/entry");
    } catch {
      toast.error("Unable to verify financial year status.");
    }
  }

  function handleActionClick(action) {
    if (action.path === "/budgets/entry") {
      handleBudgetEntryClick();
      return;
    }

    navigate(action.path);
  }

  if (isCfoBudgetReviewer) {
    return null;
  }

  const visibleActions = budgetActions.filter((action) =>
    hasPermission(permissionCodes, action.permission),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-enterprise-border bg-white p-6 shadow-card">
        <Breadcrumbs
          items={[
            {
              label: "Dashboard",
              path: "/",
            },
            {
              label: "Budgets",
            },
          ]}
        />

        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary-700">
          {isCategoryManager ? "Category Budget" : "Budget Management"}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-enterprise-text">
              {isCategoryManager ? "Category Budget" : "Budgets"}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-enterprise-muted">
              {isCategoryManager
                ? "View your assigned category budget, balances, and department demand."
                : "Choose what you want to do inside the Budgets module: enter a budget, continue drafts, review returned budgets, or view your submitted category budgets."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              type="button"
              onClick={() => handleActionClick(action)}
              className={[
                "group w-full cursor-pointer rounded-2xl border bg-white p-5 text-left shadow-card",
                "transition-all duration-200",
                "hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                action.primary
                  ? "border-primary-200 bg-primary-50/40"
                  : "border-enterprise-border",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    action.primary
                      ? "bg-primary-600 text-white"
                      : "bg-enterprise-soft text-primary-700",
                  ].join(" ")}
                >
                  <Icon size={22} />
                </div>

                <ArrowRight
                  size={18}
                  className="mt-1 text-enterprise-muted transition group-hover:translate-x-1 group-hover:text-primary-700"
                />
              </div>

              <h2 className="mt-5 text-lg font-bold text-enterprise-text">
                {action.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-enterprise-muted">
                {action.description}
              </p>
            </button>
          );
        })}
      </section>

      {visibleActions.length === 0 && (
        <section className="rounded-2xl border border-enterprise-border bg-white p-6 text-center shadow-card">
          <h2 className="text-lg font-bold text-enterprise-text">
            No budget actions available
          </h2>

          <p className="mt-2 text-sm text-enterprise-muted">
            Your selected workspace does not have permission to access
            department budget actions.
          </p>
        </section>
      )}
    </div>
  );
}
