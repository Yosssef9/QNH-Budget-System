import CurrencyText from "../../../components/CurrencyText";
import SearchableMultiSelect from "../../../components/SearchableMultiSelect";

import { AlertCircle, Trash2 } from "lucide-react";

import { toNumber } from "../../../utils/number";

import { BUDGET_ITEMS_PAGE_SIZE } from "../../../constants/budget.constants";

import BudgetMethodBadge from "./BudgetMethodBadge";

import { memo } from "react";

function BudgetDistributionRow({
  row,
  rowIndex,

  budgetItemsPage,

  categories,
  typesByCategory,
  methodOptions,

  duplicateTypeRowIds,
  deletingRowIds,

  returnedItemNotesByItemId,

  isBudgetLocked,

  getMonthlyDistribution,
  getQuarterlyDistribution,
  getDistributedQuantity,
  getSelectedType,

  updateRow,
  updateMonthly,
  updateQuarterly,

  setDeleteRowId,
}) {
  const totalAmount = toNumber(row.quantity) * toNumber(row.unitPrice);

  const monthly = getMonthlyDistribution(row);

  const quarterly = getQuarterlyDistribution(row);

  const distributedQuantity = getDistributedQuantity(row);

  const isRowValid =
    toNumber(row.quantity) > 0 &&
    toNumber(row.unitPrice) > 0 &&
    (row.method === "ANNUAL" || distributedQuantity === toNumber(row.quantity));

  const selectedType = getSelectedType(row);

  const isDuplicateTypeRow = duplicateTypeRowIds.has(row.id);

  const rowReturnNotes = returnedItemNotesByItemId.get(Number(row.id)) || [];

  const hasReturnNotes = rowReturnNotes.length > 0;

  return (
    <tr
      id={`budget-item-row-${row.id}`}
      className={[
        "budget-row-enter transition-all duration-200 ease-in-out",
        deletingRowIds.includes(row.id)
          ? "opacity-0 scale-[0.995]"
          : "opacity-100 scale-100",
        hasReturnNotes
          ? "bg-amber-50 border-l-4 border-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]"
          : !isRowValid || isDuplicateTypeRow
            ? "bg-red-50 border-l-4 border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]"
            : "",
      ].join(" ")}
    >
      <td className="truncate border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600">
        <div className="flex flex-col items-center gap-1">
          <span>
            {(budgetItemsPage - 1) * BUDGET_ITEMS_PAGE_SIZE + rowIndex + 1}
          </span>
          {!row.isSaved && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Unsaved
            </span>
          )}
        </div>
      </td>
      <td className="w-[220px] border border-slate-200 px-3 py-4">
        <div className="w-full min-w-[200px]">
          <SearchableMultiSelect
            disabled={isBudgetLocked}
            name="category"
            multiple={false}
            disableClear
            value={row.category}
            options={categories}
            placeholder="Category"
            searchPlaceholder="Search category..."
            maxVisibleBadges={1}
            getOptionValue={(option) => option.id}
            getOptionLabel={(option) => option.name}
            onChange={(e) => updateRow(row.id, "category", e.target.value)}
          />
        </div>
      </td>

      <td className="w-[260px] border border-slate-200 px-3 py-4">
        <div className="w-full min-w-[200px]">
          <SearchableMultiSelect
            disabled={isBudgetLocked}
            name="item"
            multiple={false}
            disableClear
            value={row.item}
            options={typesByCategory[row.category] || []}
            placeholder="Item / Type"
            searchPlaceholder="Search item..."
            maxVisibleBadges={1}
            getOptionValue={(option) => option.id}
            getOptionLabel={(option) => option.name}
            onChange={(e) => updateRow(row.id, "item", e.target.value)}
          />
        </div>
        {isDuplicateTypeRow && (
          <div className="mt-1 flex justify-center">
            <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
              <AlertCircle size={12} />
              Duplicate item
            </span>
          </div>
        )}
        {selectedType?.isExistingInactive && (
          <div className="mt-1 flex justify-center">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
              Inactive — existing item only
            </span>
          </div>
        )}
        {selectedType?.expense_type && (
          <div className="mt-2 flex justify-center">
            {" "}
            <span
              className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${
                selectedType.expense_type === "CAPEX"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {selectedType.expense_type}
            </span>
          </div>
        )}
        {hasReturnNotes && (
          <div className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {rowReturnNotes.map((note) => (
              <div key={note.id}>
                <span className="font-bold">Approver note:</span> {note.note}
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="w-[180px] border border-slate-200 px-3 py-4 align-middle">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-full min-w-[200px]">
            <SearchableMultiSelect
              disabled={isBudgetLocked}
              name="method"
              multiple={false}
              disableClear
              value={row.method}
              options={methodOptions}
              placeholder="Method"
              searchPlaceholder="Search method..."
              maxVisibleBadges={1}
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
              onChange={(e) => updateRow(row.id, "method", e.target.value)}
            />
          </div>

          <BudgetMethodBadge method={row.method} />
        </div>
      </td>
      <td className="border border-slate-200 px-3 py-4 text-center">
        <input
          type="number"
          disabled={isBudgetLocked}
          min="0"
          value={row.quantity === 0 ? "" : row.quantity}
          onChange={(e) =>
            updateRow(row.id, "quantity", toNumber(e.target.value))
          }
          onBlur={(e) =>
            updateRow(row.id, "quantity", toNumber(e.target.value))
          }
          className={`h-9 w-20 rounded-md border text-center text-xs font-semibold transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
  ${
    row.quantity <= 0
      ? "border-red-400 bg-red-50 text-red-600"
      : "border-slate-200 bg-white text-slate-700"
  }
`}
        />
      </td>

      <td className="border border-slate-200 px-3 py-4 text-center">
        <input
          type="number"
          disabled={isBudgetLocked}
          min="0"
          value={row.unitPrice === 0 ? "" : row.unitPrice}
          onChange={(e) =>
            updateRow(row.id, "unitPrice", toNumber(e.target.value))
          }
          onBlur={(e) =>
            updateRow(row.id, "unitPrice", toNumber(e.target.value))
          }
          className={`h-9 w-20 rounded-md border text-center text-xs font-semibold transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
  ${
    row.unitPrice <= 0
      ? "border-red-400 bg-red-50 text-red-600"
      : "border-slate-200 bg-white text-slate-700"
  }
`}
        />
      </td>

      <td className="truncate border border-slate-200 px-3 py-4 text-center font-bold text-blue-600">
        <CurrencyText value={totalAmount} />
      </td>

      {(row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") &&
        monthly.map((qty, index) => (
          <td
            key={index}
            className="border border-slate-200 px-2 py-2 text-center"
          >
            <input
              type="number"
              min="0"
              value={qty === 0 ? "" : qty}
              disabled={isBudgetLocked || row.method === "MONTHLY"}
              onChange={(e) => updateMonthly(row.id, index, e.target.value)}
              className="mx-auto h-8 w-16 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              <CurrencyText value={qty * toNumber(row.unitPrice)} />
            </p>
          </td>
        ))}

      {(row.method === "QUARTERLY" || row.method === "CUSTOM_QUARTERLY") &&
        quarterly.map((qty, index) => (
          <td
            key={index}
            colSpan="3"
            className="border border-slate-200 px-2 py-2 text-center"
          >
            <input
              type="number"
              min="0"
              value={qty === 0 ? "" : qty}
              disabled={isBudgetLocked || row.method === "QUARTERLY"}
              onChange={(e) => updateQuarterly(row.id, index, e.target.value)}
              className="mx-auto h-8 w-28 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              <CurrencyText value={qty * toNumber(row.unitPrice)} />
            </p>
          </td>
        ))}

      {row.method === "ANNUAL" && (
        <td
          colSpan="12"
          className="border border-slate-200 px-3 py-4 text-center"
        >
          <div className="flex flex-col items-center gap-1">
            {/* Main info */}
            <span className="text-sm font-semibold text-slate-800">
              {row.quantity} units / year
            </span>

            {/* Total */}
            <span className="text-sm font-bold text-blue-600">
              Total:{" "}
              <CurrencyText value={row.quantity * toNumber(row.unitPrice)} />
            </span>
          </div>
        </td>
      )}

      <td className="border border-slate-200 px-3 py-4 text-center">
        <button
          type="button"
          disabled={isBudgetLocked}
          onClick={() => setDeleteRowId(row.id)}
          className="rounded-lg bg-red-50 p-2 text-red-500 transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={17} />
        </button>
      </td>
    </tr>
  );
}

export default memo(BudgetDistributionRow, (prev, next) => {
  return (
    prev.row === next.row &&
    prev.isBudgetLocked === next.isBudgetLocked &&
    prev.deletingRowIds === next.deletingRowIds &&
    prev.duplicateTypeRowIds === next.duplicateTypeRowIds &&
    prev.returnedItemNotesByItemId === next.returnedItemNotesByItemId
  );
});
