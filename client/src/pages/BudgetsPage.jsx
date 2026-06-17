import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Wallet, ArrowRight } from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../context/AuthContext";
import { getCurrentFinancialYear } from "../api/financialYears.api";
import toast from "react-hot-toast";
const budgetActions = [
  {
    title: "My Budgets",
    description: "View draft, returned, pending, and approved budgets.",
    path: "/budgets/my",
    icon: Wallet,
    permission: "can_view_budget",
    primary: true,
  },
  {
    title: "Budget Entry",
    description: "Enter budget items manually for the open financial year.",
    path: "/budgets/entry",
    icon: Plus,
    permission: "can_edit_budget",
  },

  // {
  //   title: "Budget History",
  //   description: "View previous versions and approved historical budgets.",
  //   path: "/budgets/history",
  //   icon: History,
  //   permission: "can_view_budget",
  // },
];

function hasPermission(permissions, permission) {
  if (!permission) return true;
  return Boolean(permissions?.[permission]);
}

export default function BudgetsPage() {
  const { budgetAccess } = useAuth();
  const navigate = useNavigate();
  const permissions = budgetAccess?.permissions || budgetAccess || {};
  const isBudgetApprover = Boolean(permissions.can_approve_budget);

  useEffect(() => {
    if (isBudgetApprover) {
      navigate("/budgets/all", { replace: true });
    }
  }, [isBudgetApprover, navigate]);

  const handleBudgetEntryClick = async () => {
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
  };

  if (isBudgetApprover) {
    return null;
  }

  const visibleActions = budgetActions.filter((action) =>
    hasPermission(permissions, action.permission),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-enterprise-border bg-white p-6 shadow-card">
        <Breadcrumbs
          items={[{ label: "Dashboard", path: "/" }, { label: "Budgets" }]}
        />

        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary-700">
              Budget Management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-enterprise-text">
              Budgets
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-enterprise-muted">
              Choose what you want to do inside the Budgets module: enter a
              budget, import Excel, copy from history, continue drafts, review
              returned budgets, or open budget history.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleActions.map((action) => {
          const Icon = action.icon;

          return (
            <div
              key={action.title}
              onClick={() => {
                const restrictedPaths = [
                  "/budgets/entry",
                  "/budgets/import",
                  "/budgets/copy-history",
                ];

                if (restrictedPaths.includes(action.path)) {
                  handleBudgetEntryClick();
                  return;
                }

                navigate(action.path);
              }}
              className={[
                "cursor-pointer",
                "group rounded-2xl border bg-white p-5 shadow-card transition-all duration-200",
                "hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg",
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
            </div>
          );
        })}
      </section>
    </div>
  );
}
