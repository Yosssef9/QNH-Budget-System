import { memo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Trash2,
} from "lucide-react";

import SearchableMultiSelect from "../../../components/SearchableMultiSelect";
import { BUDGET_ITEMS_PAGE_SIZE } from "../../../constants/budget.constants";
import { toNumber } from "../../../utils/number";

import BudgetMethodBadge from "./BudgetMethodBadge";
import CategoryManagerReviewDetailsDrawer, {
  getCategoryManagerReviewDisplay,
} from "./drawers/CategoryManagerReviewDetailsDrawer";
import BudgetItemRequestNoteDrawer from "./drawers/BudgetItemRequestNoteDrawer";

function BudgetDistributionRow({
  row,
  rowIndex,

  budgetItemsPage,

  categories,
  typesByCategory,
  methodOptions,
  departmentName,

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
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);

  const monthly = getMonthlyDistribution(row);

  const quarterly = getQuarterlyDistribution(row);

  const distributedQuantity = getDistributedQuantity(row);

  const isRowValid =
    toNumber(row.quantity) > 0 &&
    (row.method === "ANNUAL" ||
      distributedQuantity === toNumber(row.quantity));

  const selectedType = getSelectedType(row);

  const isDuplicateTypeRow = duplicateTypeRowIds.has(row.id);

  const isReviewedRow =
    row.reviewStatus === "CATEGORY_REVIEW_COMPLETED";

  const isPendingReviewRow =
    row.reviewStatus === "PENDING_CATEGORY_REVIEW";

  const isRowLocked =
    isBudgetLocked || isReviewedRow || isPendingReviewRow;

  const isCatalogLocked = isRowLocked;

  const isDeleteLocked = isRowLocked;

  const deleteLockMessage =
    "Submitted category budgets are read-only.";

  const approvedQuantity =
    row.approvedQuantity === null ||
    row.approvedQuantity === undefined
      ? null
      : toNumber(row.approvedQuantity);

  const quantityDifference =
    approvedQuantity === null
      ? null
      : approvedQuantity - toNumber(row.quantity);

  const selectedCategory = categories.find(
    (category) => Number(category.id) === Number(row.category),
  );

  const reviewDisplay = getCategoryManagerReviewDisplay({
    reviewStatus: row.reviewStatus,
    requestedQuantity: row.quantity,
    approvedQuantity,
  });

  const ReviewStatusIcon = reviewDisplay.Icon;

  const itemName =
    selectedType?.name || row.typeName || "Generic item";

  const categoryName =
    selectedCategory?.name ||
    row.categoryName ||
    "Active category";

  const expenseType =
    selectedType?.expense_type || row.expenseType || null;

  return (
    <>
      <tr
        id={`budget-item-row-${row.id}`}
        className={[
          "budget-row-enter transition-all duration-200 ease-in-out",
          deletingRowIds.includes(row.id)
            ? "scale-[0.995] opacity-0"
            : "scale-100 opacity-100",

          isReviewedRow && approvedQuantity === 0
            ? "border-l-4 border-red-500 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.16)]"
            : isReviewedRow &&
                approvedQuantity !== null &&
                quantityDifference !== 0
              ? "border-l-4 border-amber-500 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.16)]"
              : !isRowValid || isDuplicateTypeRow
                ? "border-l-4 border-red-500 bg-red-50 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]"
                : "",
        ].join(" ")}
      >
        <td className="w-[72px] truncate border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600">
          <div className="flex flex-col items-center gap-1">
            <span>
              {(budgetItemsPage - 1) * BUDGET_ITEMS_PAGE_SIZE +
                rowIndex +
                1}
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
            {categoryName}

            <div className="mt-1 text-[11px] font-medium text-slate-500">
              Locked to selected tab
            </div>
          </div>
        </td>

        <td className="w-[280px] border border-slate-200 px-3 py-4">
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
              onChange={(event) =>
                updateRow(
                  row.id,
                  "item",
                  event.target.value
                    ? Number(event.target.value)
                    : null,
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

          {expenseType && (
            <div className="mt-2 flex justify-center">
              <span
                className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${
                  expenseType === "CAPEX"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {expenseType}
              </span>
            </div>
          )}

          {(isPendingReviewRow || isReviewedRow) && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setReviewDrawerOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={reviewDrawerOpen}
                title="Open Category Manager review details"
                className={`group inline-flex max-w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${reviewDisplay.buttonClassName}`}
              >
                <ReviewStatusIcon
                  size={15}
                  className="shrink-0"
                />

                <span className="truncate">
                  {reviewDisplay.label}
                </span>

                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          )}
        </td>

        <td className="w-[210px] border border-slate-200 px-3 py-4 align-middle">
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
                onChange={(event) =>
                  updateRow(row.id, "method", event.target.value)
                }
              />
            </div>

            <BudgetMethodBadge method={row.method} />
          </div>
        </td>

        <td className="w-[130px] border border-slate-200 px-3 py-4 text-center">
          <input
            type="number"
            disabled={isRowLocked}
            min="0"
            value={row.quantity === 0 ? "" : row.quantity}
            onChange={(event) =>
              updateRow(
                row.id,
                "quantity",
                toNumber(event.target.value),
              )
            }
            onBlur={(event) =>
              updateRow(
                row.id,
                "quantity",
                toNumber(event.target.value),
              )
            }
            className={`h-9 w-20 rounded-md border text-center text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
              row.quantity <= 0
                ? "border-red-400 bg-red-50 text-red-600"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          />
        </td>

        {(row.method === "MONTHLY" ||
          row.method === "CUSTOM_MONTHLY") &&
          monthly.map((quantity, index) => (
            <td
              key={index}
              className="w-[76px] border border-slate-200 px-2 py-2 text-center"
            >
              <input
                type="number"
                min="0"
                value={quantity === 0 ? "" : quantity}
                disabled={
                  isRowLocked || row.method === "MONTHLY"
                }
                onChange={(event) =>
                  updateMonthly(
                    row.id,
                    index,
                    event.target.value,
                  )
                }
                className="mx-auto h-8 w-16 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />

              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Qty {quantity}
              </p>
            </td>
          ))}

        {(row.method === "QUARTERLY" ||
          row.method === "CUSTOM_QUARTERLY") &&
          quarterly.map((quantity, index) => (
            <td
              key={index}
              colSpan="3"
              className="border border-slate-200 px-2 py-2 text-center"
            >
              <input
                type="number"
                min="0"
                value={quantity === 0 ? "" : quantity}
                disabled={
                  isRowLocked || row.method === "QUARTERLY"
                }
                onChange={(event) =>
                  updateQuarterly(
                    row.id,
                    index,
                    event.target.value,
                  )
                }
                className="mx-auto h-8 w-28 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />

              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Qty {quantity}
              </p>
            </td>
          ))}

        {row.method === "ANNUAL" && (
          <td
            colSpan="12"
            className="border border-slate-200 px-3 py-4 text-center"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-slate-800">
                {row.quantity} units / year
              </span>

              <span className="text-sm font-bold text-blue-600">
                Distributed quantity: {row.quantity}
              </span>
            </div>
          </td>
        )}

        <td className="w-[150px] border border-slate-200 px-3 py-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setNoteDrawerOpen(true)}
              title={
                row.hodItemNote
                  ? "View or edit HOD request note"
                  : "Add HOD request note"
              }
              className={[
                "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100",
                row.hodItemNote
                  ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              <FileText size={15} />
              {row.hodItemNote ? "HOD note" : "Add note"}
            </button>

            <button
              type="button"
              disabled={isDeleteLocked}
              onClick={() => setDeleteRowId(row.id)}
              title={
                isDeleteLocked
                  ? deleteLockMessage
                  : "Remove item"
              }
              className="rounded-lg bg-red-50 p-2 text-red-500 transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </td>
      </tr>

      {reviewDrawerOpen && (
        <CategoryManagerReviewDetailsDrawer
          open={reviewDrawerOpen}
          onClose={() => setReviewDrawerOpen(false)}
          row={row}
          itemName={itemName}
          categoryName={categoryName}
          expenseType={expenseType}
        />
      )}

      {noteDrawerOpen && (
        <BudgetItemRequestNoteDrawer
          open={noteDrawerOpen}
          onClose={() => setNoteDrawerOpen(false)}
          itemName={itemName}
          categoryName={categoryName}
          departmentName={departmentName}
          requestedQuantity={row.quantity}
          distributionMethod={row.method}
          note={row.hodItemNote}
          editable={!isRowLocked}
          onNoteChange={(value) => updateRow(row.id, "hodItemNote", value)}
        />
      )}
    </>
  );
}

export default memo(BudgetDistributionRow);
