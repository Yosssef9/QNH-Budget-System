import SearchableMultiSelect from "../../../components/SearchableMultiSelect";

import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

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
  const monthly = getMonthlyDistribution(row);

  const quarterly = getQuarterlyDistribution(row);

  const distributedQuantity = getDistributedQuantity(row);

  const isRowValid =
    toNumber(row.quantity) > 0 &&
    (row.method === "ANNUAL" || distributedQuantity === toNumber(row.quantity));

  const selectedType = getSelectedType(row);

  const isDuplicateTypeRow = duplicateTypeRowIds.has(row.id);

  const isReviewedRow = row.reviewStatus === "CATEGORY_REVIEW_COMPLETED";
  const isPendingReviewRow = row.reviewStatus === "PENDING_CATEGORY_REVIEW";
  const isRowLocked = isBudgetLocked || isReviewedRow || isPendingReviewRow;
  const isCatalogLocked = isRowLocked;
  const isDeleteLocked = isRowLocked;
  const deleteLockMessage = "Submitted category budgets are read-only.";
  const approvedQuantity =
    row.approvedQuantity === null || row.approvedQuantity === undefined
      ? null
      : toNumber(row.approvedQuantity);
  const quantityDifference =
    approvedQuantity === null ? null : approvedQuantity - toNumber(row.quantity);
  const selectedCategory = categories.find(
    (category) => Number(category.id) === Number(row.category),
  );

  return (
    <tr
      id={`budget-item-row-${row.id}`}
      className={[
        "budget-row-enter transition-all duration-200 ease-in-out",
        deletingRowIds.includes(row.id)
          ? "opacity-0 scale-[0.995]"
          : "opacity-100 scale-100",
        isReviewedRow && quantityDifference !== 0
          ? "bg-blue-50 border-l-4 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.18)]"
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
          {isReviewedRow && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 size={10} />
              Reviewed
            </span>
          )}
        </div>
      </td>
      <td className="w-[220px] border border-slate-200 px-3 py-4">
        <div className="min-w-[180px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          {selectedCategory?.name || row.categoryName || "Active category"}
          <div className="mt-1 text-[11px] font-medium text-slate-500">
            Locked to selected tab
          </div>
        </div>
      </td>

      <td className="w-[260px] border border-slate-200 px-3 py-4">
        <div className="w-full min-w-[200px]">
          <SearchableMultiSelect
            disabled={isCatalogLocked}
            name="item"
            multiple={false}
            disableClear
            value={row.item}
            options={typesByCategory[row.category]}
            placeholder="Generic item"
            searchPlaceholder="Search item..."
            maxVisibleBadges={1}
            getOptionValue={(option) => option.id}
            getOptionLabel={(option) => option.name}
            onChange={(e) =>
              updateRow(
                row.id,
                "item",
                e.target.value ? Number(e.target.value) : null,
              )
            }
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
        {(isPendingReviewRow || isReviewedRow) && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {isPendingReviewRow && (
              <div className="font-semibold text-amber-700">
                Pending Category Manager review
              </div>
            )}
            {isReviewedRow && (
              <div className="space-y-1">
                <div className="font-bold text-slate-900">
                  Review result:{" "}
                  {approvedQuantity === 0
                    ? "Not approved"
                    : quantityDifference === 0
                      ? "Approved as requested"
                      : "Approved with changes"}
                </div>
                <div>
                  Requested {row.quantity} · Approved {approvedQuantity} ·
                  Difference {quantityDifference > 0 ? "+" : ""}
                  {quantityDifference}
                </div>
                {row.reviewNote && (
                  <div>
                    <span className="font-semibold">Category Manager note:</span>{" "}
                    {row.reviewNote}
                  </div>
                )}
                {(row.reviewedByName || row.reviewedAt) && (
                  <div className="text-slate-500">
                    Reviewed {row.reviewedByName ? `by ${row.reviewedByName}` : ""}
                    {row.reviewedAt
                      ? ` on ${new Date(row.reviewedAt).toLocaleString()}`
                      : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="w-[180px] border border-slate-200 px-3 py-4 align-middle">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-full min-w-[200px]">
            <SearchableMultiSelect
              disabled={isRowLocked}
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
          disabled={isRowLocked}
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
              disabled={isRowLocked || row.method === "MONTHLY"}
              onChange={(e) => updateMonthly(row.id, index, e.target.value)}
              className="mx-auto h-8 w-16 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              Qty {qty}
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
              disabled={isRowLocked || row.method === "QUARTERLY"}
              onChange={(e) => updateQuarterly(row.id, index, e.target.value)}
              className="mx-auto h-8 w-28 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              Qty {qty}
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
              Distributed quantity: {row.quantity}
            </span>
          </div>
        </td>
      )}

      <td className="border border-slate-200 px-3 py-4 text-center">
        <button
          type="button"
          disabled={isDeleteLocked}
          onClick={() => setDeleteRowId(row.id)}
          title={isDeleteLocked ? deleteLockMessage : "Remove item"}
          className="rounded-lg bg-red-50 p-2 text-red-500 transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={17} />
        </button>
      </td>
    </tr>
  );
}

export default memo(BudgetDistributionRow);
