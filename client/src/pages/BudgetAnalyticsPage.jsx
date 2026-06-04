import { BarChart3 } from "lucide-react";
import BudgetComparison from "./budget-approval/BudgetComparison";
import Breadcrumbs from "../components/Breadcrumbs";

export default function BudgetAnalyticsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/" },
          {
            label: "Budget Analytics & Comparison",
          },
        ]}
      />
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
            <BarChart3 size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Budget Analytics & Comparison
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Compare budgets, departments, categories, items, costs and
              spending patterns.
            </p>
          </div>
        </div>
      </div>

      <BudgetComparison />
    </div>
  );
}
