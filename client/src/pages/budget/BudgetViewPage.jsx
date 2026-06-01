import Breadcrumbs from "../../components/Breadcrumbs";
import BudgetCompactSummaryPanel from "../../components/budgets/shared/BudgetCompactSummaryPanel";
import BudgetHeaderCard from "../../components/budgets/shared/BudgetHeaderCard";
import BudgetItemsTable from "../../components/budgets/shared/BudgetItemsTable";

import { useBudgetView } from "../../hooks/budgets/useBudgetView";
import useBudgetTotals from "../../hooks/budgets/useBudgetTotals";
export default function BudgetViewPage() {
  const { data, isLoading } = useBudgetView();
  const budget = data;

  const { totalQuantity, totalAmount } = useBudgetTotals(budget?.items || []);
  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!data) {
    return <div className="p-6">Budget not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          {
            label: "Dashboard",
            path: "/",
          },
          {
            label: "My Budgets",
            path: "/budgets/my",
          },
          {
            label: `Budget ${budget.financial_year}`,
          },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Budget Details</h1>

        <p className="mt-2 text-slate-500">
          View budget information and items.
        </p>
      </div>

      <BudgetHeaderCard
        currentBudget={budget}
        openYear={{
          year: budget.financial_year,
        }}
        budgetStatus={budget.status}
      />
      <section className="rounded-2xl border bg-white overflow-hidden">
        <BudgetCompactSummaryPanel
          totalQuantity={totalQuantity}
          totalAmount={totalAmount}
        />
        <BudgetItemsTable items={budget?.items} readOnly />
      </section>
    </div>
  );
}
