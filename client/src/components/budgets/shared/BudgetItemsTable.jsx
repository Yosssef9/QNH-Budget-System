import { memo } from "react";

import { formatNumber } from "../../../utils/formatters";
import CurrencyText from "../../../components/CurrencyText";
import BudgetMethodBadge from "../../../components/budgets/shared/BudgetMethodBadge";
import CreatedFromTransferBadge from "../../CreatedFromTransferBadge";

function BudgetItemsTable({
  items = [],
  showNotes = false,
  itemNotes = {},
  onItemNoteChange,
  readOnly = true,
}) {
  return (
    <div
      className="
        h-full
        min-h-0
        overflow-auto

        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm

        scrollbar-thin
        scrollbar-thumb-slate-300
        scrollbar-track-slate-100
      "
    >
      <table className="min-w-[1400px] border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-white">
          <tr className="text-slate-700">
            <th className="w-[70px] border border-slate-200 px-3 py-4">#</th>

            <th className="w-[220px] border border-slate-200 px-4 py-4">
              Category
            </th>

            <th className="w-[260px] border border-slate-200 px-4 py-4">
              Item / Type
            </th>

            <th className="w-[140px] border border-slate-200 px-4 py-4">
              Expense
            </th>

            <th className="w-[160px] border border-slate-200 px-4 py-4">
              Method
            </th>

            <th className="w-[140px] border border-slate-200 px-4 py-4">
              Quantity
            </th>

            <th className="w-[140px] border border-slate-200 px-4 py-4">
              Unit Price
            </th>

            <th className="w-[160px] border border-slate-200 px-4 py-4">
              Total Amount
            </th>

            {showNotes && (
              <th className="w-[300px] border border-slate-200 px-4 py-4">
                Approver Note
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              id={`budget-item-row-${item.id}`}
              className="relative hover:bg-slate-50"
            >
              <td className="border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600">
                {index + 1}
              </td>

              <td className="border border-slate-200 px-3 py-4 font-semibold text-slate-800">
                {item.category_name}
              </td>

              <td className="border border-slate-200 px-3 py-4">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-slate-800">
                    {item.type_name}
                  </div>

                  {Boolean(item.created_from_transfer) && (
                    <CreatedFromTransferBadge />
                  )}
                </div>
              </td>

              <td className="border border-slate-200 px-3 py-4 text-center">
                {item.expense_type && (
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${
                      item.expense_type === "CAPEX"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {item.expense_type}
                  </span>
                )}
              </td>

              <td className="border border-slate-200 px-3 py-4">
                <BudgetMethodBadge
                  method={item.distribution_method}
                  level={item.distribution_level}
                />
              </td>

              <td className="border border-slate-200 px-3 py-4 text-center font-bold">
                {formatNumber(item.quantity)}
              </td>

              <td className="border border-slate-200 px-3 py-4 text-center">
                <CurrencyText value={item.unit_price} />
              </td>

              <td className="border border-slate-200 px-3 py-4 text-center font-bold text-blue-600">
                <CurrencyText value={item.total_amount} />
              </td>

              {showNotes && (
                <td className="border border-slate-200 px-3 py-4">
                  <input
                    value={itemNotes[item.id] || ""}
                    onChange={(e) =>
                      onItemNoteChange?.(item.id, e.target.value)
                    }
                    placeholder="Optional item note"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      px-3
                      py-2
                      text-sm
                      outline-none
                      transition
                      focus:border-blue-300
                      focus:ring-2
                      focus:ring-blue-100
                    "
                  />
                </td>
              )}
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td
                colSpan={showNotes ? 9 : 8}
                className="
                  border
                  border-slate-200
                  px-4
                  py-10
                  text-center
                  text-sm
                  font-semibold
                  text-slate-500
                "
              >
                No budget items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default memo(BudgetItemsTable);
