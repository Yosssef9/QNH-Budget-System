import { CalendarDays, Database } from "lucide-react";
import { useMemo, useState } from "react";

import EnterpriseSearch from "../EnterpriseSearch";
import { formatNumber } from "../../utils/formatters";

export default function CopyBudgetHistoryList({
  budgets,
  selectedBudgetId,
  onSelect,
}) {
  const [search, setSearch] = useState("");

  const filteredBudgets = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return budgets;

    return budgets.filter((budget) =>
      [
        budget.year,
        budget.department_name,
        budget.category_name,
        budget.items_count,
        budget.total_requested_quantity,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [budgets, search]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b bg-slate-50/80 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Budget History
        </h3>

        <EnterpriseSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by year, department..."
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredBudgets.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="mx-auto mb-3 h-10 w-10 text-slate-300" />

            <p className="font-medium text-slate-500">
              No matching budgets found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Try another search term
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {filteredBudgets.map((budget) => {
              const active = selectedBudgetId === budget.id;

              return (
                <button
                  key={budget.id}
                  onClick={() => onSelect(budget)}
                  className={`
                    group
                    w-full
                    rounded-2xl
                    border
                    p-4
                    text-left
                    transition-all
                    duration-200

                    ${
                      active
                        ? "border-primary-300 bg-primary-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50 hover:shadow-sm"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CalendarDays
                          size={16}
                          className={
                            active
                              ? "text-primary-600"
                              : "text-slate-400 group-hover:text-primary-500"
                          }
                        />

                        <span className="text-base font-bold text-slate-900">
                          FY {budget.year}
                        </span>
                      </div>

                      {budget.category_name && (
                        <span className="mt-2 inline-flex rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
                          {budget.category_name}
                        </span>
                      )}

                      {budget.department_name && (
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {budget.department_name}
                        </p>
                      )}

                      <span
                        className="
                          mt-2
                          inline-flex
                          rounded-full
                          bg-green-100
                          px-2.5
                          py-1
                          text-xs
                          font-medium
                          text-green-700
                        "
                      >
                        Approved
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="rounded-xl bg-slate-100 px-3 py-2">
                        <p className="text-xs text-slate-500">Items</p>

                        <p className="font-bold text-slate-900">
                          {budget.items_count || 0}
                        </p>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Requested Quantity
                      </p>

                      <p className="font-semibold text-slate-900">
                        {formatNumber(budget.total_requested_quantity || 0)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
