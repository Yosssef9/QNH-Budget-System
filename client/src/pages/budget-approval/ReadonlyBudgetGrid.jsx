import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BudgetCompactSummaryPanel from "../../components/budgets/shared/BudgetCompactSummaryPanel";

import CurrencyText from "../../components/CurrencyText";

import BudgetHeaderCard from "../../components/budgets/shared/BudgetHeaderCard";
import BudgetReviewStatusCard from "../../components/budgets/shared/BudgetReviewStatusCard";
import BudgetItemsTable from "../../components/budgets/shared/BudgetItemsTable";
import useBudgetTotals from "../../hooks/budgets/useBudgetTotals";


export default function ReadonlyBudgetGrid({
  budget,
  items = [],
  itemNotes = {},
  onItemNoteChange,
  showNotes = false,
}) {
  const [summaryView, setSummaryView] = useState("QUARTER");

  const summary = useBudgetTotals(items);
  return (
    <div className="space-y-5 text-slate-800">
      <BudgetHeaderCard
        currentBudget={{
          ...budget,
          created_by_name: budget?.created_by_name,
        }}
        openYear={{
          year: budget?.financial_year,
        }}
        budgetStatus={budget?.status}
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Budget Items Review
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm">
            <CurrencyText value={summary.totalAmount} />
          </div>
        </div>

        <BudgetItemsTable
          items={items}
          showNotes={showNotes}
          itemNotes={itemNotes}
          onItemNoteChange={onItemNoteChange}
          readOnly
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <BudgetReviewStatusCard hasItems={items.length > 0} />

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Budget Summary
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Read-only approval summary.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSummaryView("TOTAL")}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  summaryView === "TOTAL"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Total
              </button>
            </div>
          </div>

          <BudgetCompactSummaryPanel
            totalQuantity={summary.totalQuantity}
            totalAmount={summary.totalAmount}
          />
        </div>
      </section>
    </div>
  );
}
