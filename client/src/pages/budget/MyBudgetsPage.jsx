import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Layers3, Wallet } from "lucide-react";

import Breadcrumbs from "../../components/Breadcrumbs";
import CurrencyText from "../../components/CurrencyText";
import CategoryBudgetYearsTable from "../../components/budgets/CategoryBudgetYearsTable";
import { getCategoryBudgetYears, getMyBudgets } from "../../api/budget.api";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import { formatDateTime } from "../../utils/dateFormatters";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function MetricCard({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase text-slate-500">{label}</div>
      <div className="mt-1 min-w-0 break-words text-2xl font-black text-slate-950">
        {children || value}
      </div>
    </div>
  );
}

function DepartmentBudgetView() {
  const navigate = useNavigate();
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["my-budgets"],
    queryFn: getMyBudgets,
  });

  const sortedBudgets = useMemo(
    () =>
      [...budgets].sort(
        (a, b) => Number(b.financial_year || 0) - Number(a.financial_year || 0),
      ),
    [budgets],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          <Wallet size={14} />
          Department Workspace
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          My Department Budgets
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Select a financial year to view its budget items and adjustment
          request history.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Budgets" value={budgets.length} />
        <MetricCard
          label="Latest Year"
          value={sortedBudgets[0]?.financial_year || "-"}
        />
        <MetricCard
          label="Total Items"
          value={formatQuantity(
            budgets.reduce(
              (sum, budget) => sum + Number(budget.items_count || 0),
              0,
            ),
          )}
        />
        <MetricCard
          label="Requested Quantity"
          value={formatQuantity(
            budgets.reduce(
              (sum, budget) =>
                sum + Number(budget.total_requested_quantity || 0),
              0,
            ),
          )}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">Budget Years</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Read-only department budget history across financial years.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Financial Year</th>
                <th className="px-4 py-3">Year Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Requested Quantity</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Loading budgets...
                  </td>
                </tr>
              ) : sortedBudgets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No budgets found.
                  </td>
                </tr>
              ) : (
                sortedBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    onClick={() => navigate(`/budgets/view/${budget.id}`)}
                    className="cursor-pointer border-t border-slate-200 transition hover:bg-blue-50/50"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/budgets/view/${budget.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-4 font-black text-slate-950">
                      FY {budget.financial_year}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {budget.financial_year_status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatQuantity(budget.items_count)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-blue-700">
                      {formatQuantity(budget.total_requested_quantity)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {budget.updated_at
                        ? formatDateTime(budget.updated_at)
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CategoryBudgetYearsView() {
  const navigate = useNavigate();
  const { budgetAccess } = useAuth();
  const {
    data: years = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["category-budget-years"],
    queryFn: getCategoryBudgetYears,
  });
  const categoryName =
    budgetAccess?.budgetCategory?.name ||
    budgetAccess?.category?.name ||
    budgetAccess?.selectedWorkspace?.budgetCategory?.name ||
    "Assigned Category";
  const currentYear =
    years.find((year) => year.financial_year_status !== "CLOSED") || years[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          <Layers3 size={14} />
          Category Manager Workspace
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          My {categoryName} Budgets
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Select a financial year to review the category balance and the
          department demand included in that year.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Budget Years" value={years.length} />
        <MetricCard
          label="Current Year"
          value={currentYear?.financial_year || "-"}
        />
        <MetricCard
          label="Current Departments"
          value={formatQuantity(currentYear?.department_count)}
        />
        <MetricCard label="Current Package Value">
          <CurrencyText compact value={currentYear?.package_value || 0} />
        </MetricCard>
      </section>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error?.response?.data?.message ||
            error?.message ||
            "Failed to load category budget years."}
        </div>
      ) : null}

      <CategoryBudgetYearsTable
        years={years}
        isLoading={isLoading}
        onSelect={(year) =>
          navigate(`/budgets/my/category/${year.financial_year_id}`)
        }
      />
    </div>
  );
}

export default function MyBudgetsPage() {
  const { budgetAccess } = useAuth();
  const isBudgetApprover = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
  );
  const canViewCategoryBudget = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
  );
  const canCreateTransfers = can(
    budgetAccess,
    PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
  );
  const isCategoryManagerView = canViewCategoryBudget || canCreateTransfers;

  if (isBudgetApprover) {
    return <Navigate to="/budgets/all" replace />;
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs />
      {isCategoryManagerView ? (
        <CategoryBudgetYearsView />
      ) : (
        <DepartmentBudgetView />
      )}
    </div>
  );
}
