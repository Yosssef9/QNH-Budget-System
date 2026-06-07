import { Database, CalendarDays, Package } from "lucide-react";

import BudgetItemsTable from "./shared/BudgetItemsTable";
import CollapsiblePanelToggle from "../layout/CollapsiblePanelToggle";
import { memo } from "react";
import { formatNumber } from "../../utils/formatters";

function CopyBudgetPreview({ budget, items, previewOpen, onTogglePreview }) {
  if (!budget) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
            <Database size={28} className="text-slate-500" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">Select Budget</h3>

          <p className="mt-2 text-sm text-slate-500">
            Choose an approved budget from the left side to preview its items.
          </p>
        </div>
      </div>
    );
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {budget.year} Budget
            </h3>

            <p className="mt-1 text-sm text-slate-500">Review before copying</p>
          </div>

          <CollapsiblePanelToggle
            isOpen={previewOpen}
            onToggle={onTogglePreview}
            openLabel="Show Items"
            closeLabel="Hide Items"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-primary-600" />

              <span className="text-sm font-medium text-slate-500">
                Budget Year
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {budget.year}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Package size={18} className="text-primary-600" />

              <span className="text-sm font-medium text-slate-500">
                Budget Items
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {items.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Database size={18} className="text-primary-600" />

              <span className="text-sm font-medium text-slate-500">
                Total Amount
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {formatNumber(totalAmount)}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`
    flex-1
    min-h-0

    overflow-hidden

    transition-all
    duration-300
    ease-out

    ${previewOpen ? "opacity-100" : "max-h-0 opacity-0"}
  `}
      >
        <div className="flex h-full min-h-0 flex-col p-5">
          <div className="flex-1 min-h-0">
            <BudgetItemsTable items={items} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
}
export default memo(CopyBudgetPreview);
