
import { Link } from "react-router-dom";
import {
  Plus,
  FileSpreadsheet,
  Copy,
  FileText,
  RotateCcw,
  History,
  Wallet,
  ArrowRight,
} from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../context/AuthContext";

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
    title: "Create Budget",
    description: "Enter budget items manually for the open financial year.",
    path: "/budgets/entry",
    icon: Plus,
    permission: "can_edit_budget",
  },
  {
    title: "Import Excel",
    description: "Upload an Excel budget file, validate it, then save items.",
    path: "/budgets/import",
    icon: FileSpreadsheet,
    permission: "can_edit_budget",
  },
  {
    title: "Copy From History",
    description: "Create a new draft budget from a previous approved budget.",
    path: "/budgets/copy-history",
    icon: Copy,
    permission: "can_edit_budget",
  },
  {
    title: "Draft Budgets",
    description: "Continue budgets that are saved but not submitted yet.",
    path: "/budgets/drafts",
    icon: FileText,
    permission: "can_edit_budget",
  },
  {
    title: "Returned Budgets",
    description: "Review returned budgets, fix notes, and resubmit.",
    path: "/budgets/returned",
    icon: RotateCcw,
    permission: "can_edit_budget",
  },
  {
    title: "Budget History",
    description: "View previous versions and approved historical budgets.",
    path: "/budgets/history",
    icon: History,
    permission: "can_view_budget",
  },
];

function hasPermission(permissions, permission) {
  if (!permission) return true;
  return Boolean(permissions?.[permission]);
}

export default function BudgetsPage() {
  const { budgetAccess } = useAuth();
  const permissions = budgetAccess?.permissions || budgetAccess || {};

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
              Choose what you want to do inside the Budgets module: create a
              budget, import Excel, copy from history, continue drafts, review
              returned budgets, or open budget history.
            </p>
          </div>

          {hasPermission(permissions, "can_edit_budget") && (
            <Link
              to="/budgets/entry"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
            >
              <Plus size={18} />
              Create Budget
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              to={action.path}
              className={[
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
            </Link>
          );
        })}
      </section>
    </div>
  );
}
