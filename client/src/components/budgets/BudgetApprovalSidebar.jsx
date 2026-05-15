import { Loader2, Search } from "lucide-react";
import CurrencyText from "../../components/CurrencyText";

export default function BudgetApprovalSidebar({
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  budgets = [],
  loading,
  error,
  selectedBudgetId,
  onSelectBudget,
  statusLabel,
  statusColorClasses,
  activeCardClasses,
  inactiveCardClasses,
  footerText,
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="enterprise-scrollbar max-h-[calc(100vh-320px)] min-h-[360px] overflow-y-auto p-4 scroll-smooth">
        {loading && (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={18} />
            Loading budgets...
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
            Failed to load budgets.
          </div>
        )}

        {!loading && budgets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {searchValue.trim()
              ? "No matching budgets found."
              : "No budgets found."}
          </div>
        )}

        <div className="space-y-3">
          {budgets.map((budget) => {
            const active = selectedBudgetId === budget.id;

            return (
              <button
                key={budget.id}
                type="button"
                onClick={() => onSelectBudget(budget.id)}
                className={[
                  "w-full rounded-2xl border p-4 text-left transition-all",
                  active ? activeCardClasses : inactiveCardClasses,
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {budget.department_name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Financial Year {budget.financial_year}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold tracking-wide ${statusColorClasses}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Items</p>

                    <p className="mt-1 font-bold text-slate-900">
                      {budget.items_count}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Total</p>

                    <p className="mt-1 font-bold text-slate-900">
                      <CurrencyText value={budget.total_amount} />
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-semibold text-blue-700">
                  {footerText}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
