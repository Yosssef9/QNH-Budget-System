import { Fragment, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { isCountableUnit } from "../../utils/approvedDistribution";

import {
  AlertCircle,
  ChevronRight,
  Save,
  Building2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";

import RequestedDemandView from "./RequestedDemandView";

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormatter.format(number) : "—";
}

function StatusBadge({ status, compact = false }) {
  const statusMap = {
    IN_CATEGORY_REVIEW: {
      label: "In Review",
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    },
    CATEGORY_REVIEW_COMPLETED: {
      label: "Completed",
      classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    PENDING_CATEGORY_REVIEW: {
      label: "Pending",
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    },
    CFO_ACCEPTED: {
      label: "CFO Accepted",
      classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    NEEDS_MODIFICATION: {
      label: "Needs Modification",
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    },
  };
  const meta = statusMap[status] || {
    label: String(status || "Unknown").replaceAll("_", " "),
    classes: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border font-black",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        meta.classes,
      )}
    >
      {meta.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, helper, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span
        className={classNames(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tones[tone] || tones.blue,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-xl font-black text-slate-950">{value}</span>
          {helper ? (
            <span className="truncate text-xs font-semibold text-slate-500">
              {helper}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DepartmentQueueItem({ budget, selected, onSelect }) {
  const total = Number(budget.item_count || 0);
  const reviewed = Number(budget.reviewed_count || 0);
  const pending = Number(budget.pending_count || 0);
  const progress = total > 0 ? (reviewed / total) * 100 : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={classNames(
        "group relative w-full border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
        selected ? "bg-blue-50/80" : "bg-white hover:bg-slate-50",
      )}
    >
      <span
        className={classNames(
          "absolute inset-y-0 left-0 w-1",
          selected ? "bg-blue-600" : "bg-transparent group-hover:bg-blue-200",
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {budget.department_name}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-600">
            HOD: {budget.hod_name || "Not assigned"}
          </p>
        </div>
        <StatusBadge status={budget.status} compact />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
        <span>{total} item{total === 1 ? "" : "s"}</span>
        <span>{reviewed}/{total} reviewed</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
        <span className={pending > 0 ? "text-amber-700" : "text-emerald-700"}>
          {pending > 0 ? `${pending} pending` : "Review complete"}
        </span>
        <span className="text-slate-400">
          Requested {formatNumber(budget.total_requested_quantity)}
        </span>
      </div>
    </button>
  );
}

function differenceMeta(requested, approved) {
  if (approved === null || approved === undefined || approved === "") {
    return { label: "—", classes: "text-slate-400" };
  }
  const value = Number(approved || 0) - Number(requested || 0);
  return {
    label: `${value > 0 ? "+" : ""}${formatNumber(value)}`,
    classes:
      value < 0
        ? "text-amber-700"
        : value > 0
          ? "text-blue-700"
          : "text-emerald-700",
  };
}

function DepartmentReviewItemsTable({
  items,
  selectedBudget,
  onReviewItem,
  focusedDemandItemId,
  canReviewItems,
  onInlineSave,
  getItemDraft,
  onItemDraftChange,
  isItemSaving,
  isItemDraftDirty,
}) {
  const [expandedItemId, setExpandedItemId] = useState(null);
  const focusAfterSaveRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const handledDemandItemRef = useRef(null);

  useEffect(() => {
    if (!focusedDemandItemId ||
        !items.some((item) => Number(item.id) === Number(focusedDemandItemId)) ||
        Number(handledDemandItemRef.current) === Number(focusedDemandItemId)) {
      return;
    }

    handledDemandItemRef.current = focusedDemandItemId;
    focusAfterSaveRef.current = focusedDemandItemId;
    setExpandedItemId(focusedDemandItemId);
  }, [focusedDemandItemId, items]);

  useEffect(() => {
    if (expandedItemId === null) return;
    const input = document.getElementById(`category-inline-quantity-${expandedItemId}`);
    input?.focus({ preventScroll: true });
    input?.select();
    if (Number(focusAfterSaveRef.current) === Number(expandedItemId)) {
      focusAfterSaveRef.current = null;
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [expandedItemId]);

  function toggleItem(itemId) {
    setExpandedItemId((current) =>
      Number(current) === Number(itemId) ? null : itemId,
    );
  }

  async function saveAndAdvance(item, index) {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    try {
      const saved = await onInlineSave(item);
      if (!saved) return;

      // Follow the displayed order without wrapping to earlier rows.
      // In a CFO return round, only corrected items are editable.
      const subsequentItems = items.slice(index + 1);
      const nextItem =
        selectedBudget.status === "CATEGORY_REVIEW_COMPLETED" &&
        selectedBudget.category_package_status === "RETURNED_BY_CFO"
          ? subsequentItems.find(
              (candidate) =>
                candidate.package_item_cfo_review_status === "NEEDS_MODIFICATION",
            )
          : subsequentItems[0];
      if (nextItem) {
        focusAfterSaveRef.current = nextItem.id;
        setExpandedItemId(nextItem.id);
      } else {
        setExpandedItemId(null);
        toast.success("Reached the last reviewable item in this department");
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Item</th>
            <th className="px-5 py-3">Expense Type</th>
            <th className="px-5 py-3">Requested</th>
            <th className="px-5 py-3">Approved</th>
            <th className="px-5 py-3">Difference</th>
            <th className="px-5 py-3">Review Status</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const difference = differenceMeta(
              item.requested_quantity,
              item.category_approved_quantity,
            );
            const returnedCorrection =
              selectedBudget.status === "CATEGORY_REVIEW_COMPLETED" &&
              selectedBudget.category_package_status === "RETURNED_BY_CFO" &&
              item.package_item_cfo_review_status === "NEEDS_MODIFICATION";
            const editable =
              canReviewItems &&
              (selectedBudget.status === "IN_CATEGORY_REVIEW" || returnedCorrection);
            const expanded = Number(expandedItemId) === Number(item.id);
            const draft = getItemDraft(item);
            const rawQuantity = draft.category_approved_quantity;
            const quantity = Number(rawQuantity);
            const isCountable = isCountableUnit(item);
            const quantityValid =
              rawQuantity !== "" && rawQuantity !== null &&
              rawQuantity !== undefined && Number.isFinite(quantity) &&
              quantity >= 0 && (!isCountable || Number.isInteger(quantity));
            const customDistribution =
              draft.approved_distribution_mode === "CUSTOM" && !returnedCorrection;
            const saving = isItemSaving(item);
            const dirty = isItemDraftDirty(item);
            const alreadyReviewed = item.review_status === "CATEGORY_REVIEW_COMPLETED";
            const canSave =
              editable && quantityValid && !customDistribution && !saving &&
              (!alreadyReviewed || dirty);

            return (
              <Fragment key={item.id}>
                <tr
                  onClick={(event) => {
                    if (event.target.closest("button, a, input, select, textarea")) return;
                    toggleItem(item.id);
                  }}
                  className={classNames(
                    "cursor-pointer align-middle hover:bg-blue-50/60",
                    expanded ? "bg-blue-50/40" : "",
                  )}
                >
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      aria-expanded={expanded}
                      aria-controls={`category-inline-panel-${item.id}`}
                      className="flex w-full items-start gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <ChevronRight
                        className={classNames(
                          "mt-0.5 h-4 w-4 shrink-0 transition-transform duration-[240ms] ease-in-out motion-reduce:transition-none",
                          expanded ? "rotate-90 text-blue-600" : "text-slate-400",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block font-black text-slate-950">{item.catalog_item_name}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          {item.unit_name || item.unit_code || "Unit"}
                          {item.is_project ? " · Project" : ""}
                        </span>
                        {dirty ? (
                          <span className="mt-1 block text-xs font-bold text-amber-700">
                            Unsaved changes
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                      {item.expense_type || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900">
                    {formatNumber(item.requested_quantity)}
                  </td>
                  <td className="px-5 py-4 font-black text-slate-950">
                    {item.category_approved_quantity === null
                      ? "—"
                      : formatNumber(item.category_approved_quantity)}
                  </td>
                  <td className={classNames("px-5 py-4 font-black", difference.classes)}>
                    {difference.label}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={item.review_status} compact />
                      {item.package_item_cfo_review_status ? (
                        <StatusBadge status={item.package_item_cfo_review_status} compact />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onReviewItem(item.id)}
                      className={classNames(
                        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        editable
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      {editable
                        ? alreadyReviewed ? "Edit Review" : "Review"
                        : "View"}
                    </button>
                  </td>
                </tr>
                <tr className="!border-t-0 bg-blue-50/40">
                  <td colSpan={7} className="p-0">
                    <div
                      id={`category-inline-panel-${item.id}`}
                      aria-hidden={!expanded}
                      inert={!expanded}
                      className={classNames(
                        "grid transition-[grid-template-rows,opacity] duration-[240ms] ease-in-out motion-reduce:transition-none",
                        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="px-5 pb-5 pt-1">
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              if (canSave) void saveAndAdvance(item, index);
                            }}
                            className="flex flex-col items-start gap-2 rounded-xl border border-blue-200 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="w-36 sm:w-40">
                                <label
                                  htmlFor={`category-inline-quantity-${item.id}`}
                                  className="block text-xs font-black uppercase tracking-wide text-slate-700"
                                >
                                  Approved Quantity
                                </label>
                                <input
                                  id={`category-inline-quantity-${item.id}`}
                                  type="number"
                                  min="0"
                                  step={isCountable ? "1" : "any"}
                                  value={rawQuantity ?? ""}
                                  onChange={(event) =>
                                    onItemDraftChange(item, {
                                      category_approved_quantity: event.target.value,
                                    })
                                  }
                                  disabled={!editable || saving}
                                  aria-invalid={!quantityValid}
                                  className="mt-2 w-full rounded-xl border border-blue-200 bg-slate-50 px-3 py-2.5 text-lg font-black text-slate-950 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={!canSave}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                <Save className="h-4 w-4" />
                                {saving ? "Saving..." : "Save Quantity & Next"}
                              </button>
                            </div>
                            <p className="text-xs text-slate-500">
                              Requested: {formatNumber(item.requested_quantity)}
                              {isCountable ? " · Whole numbers only" : ""}
                            </p>
                            {!quantityValid ? (
                              <p className="text-xs font-semibold text-rose-700">
                                Enter a valid non-negative {isCountable ? "whole number" : "quantity"}.
                              </p>
                            ) : null}
                            {customDistribution ? (
                              <p className="text-xs font-semibold text-amber-700">
                                This item has a custom approved distribution. Use Review to keep its period allocations consistent.
                              </p>
                            ) : null}
                            {!editable ? (
                              <p className="text-xs font-semibold text-slate-500">
                                This item is read-only in the current review stage.
                              </p>
                            ) : null}
                          </form>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DepartmentReviewStage({
  activeView,
  onViewChange,
  requestedDemand,
  onGoToDepartmentReview,
  queueLoading,
  queueError,
  onRetryQueue,
  budgets,
  filteredBudgets,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  filterCounts,
  selectedBudget,
  selectedBudgetId,
  onSelectBudget,
  detailLoading,
  detailError,
  onRetryDetail,
  overview,
  coverage,
  onReviewItem,
  focusedDemandItemId,
  canReviewItems,
  onInlineSave,
  getItemDraft,
  onItemDraftChange,
  isItemSaving,
  isItemDraftDirty,
  canComplete,
  onCompleteReview,
  canReopenReview,
  onReopenReview,
  reopenPending,
}) {
  const items = selectedBudget?.items || [];
  const itemCount = Number(selectedBudget?.summary?.item_count || 0);
  const reviewedCount = Number(selectedBudget?.summary?.reviewed_count || 0);
  const pendingCount = Number(selectedBudget?.summary?.pending_count || 0);

  return (
    <div
      id="category-workflow-panel-departments"
      role="tabpanel"
      aria-labelledby="category-workflow-tab-departments"
      tabIndex={0}
      className="space-y-4 focus:outline-none"
    >
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {[
          ["reviews", "Review by Department"],
          ["demand", "Requested Demand"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onViewChange(value)}
            className={classNames(
              "rounded-lg px-4 py-2 text-xs font-black transition sm:text-sm",
              activeView === value
                ? "bg-blue-50 text-blue-700 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeView === "demand" ? (
        <RequestedDemandView
          loading={queueLoading}
          error={queueError}
          onRetry={onRetryQueue}
          data={requestedDemand}
          onGoToDepartmentReview={onGoToDepartmentReview}
        />
      ) : (
        <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Submitted Departments"
          value={coverage.submitted}
          helper={`of ${coverage.total}`}
        />
        <StatCard
          icon={Clock3}
          label="In Review"
          value={coverage.inReview}
          helper={`${overview.itemsPending} pending items`}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Reviews"
          value={coverage.completed}
          helper={`${overview.itemsReviewed} items reviewed`}
          tone="emerald"
        />
        <StatCard
          icon={Building2}
          label="Not Submitted"
          value={coverage.notSubmitted}
          helper="not yet in queue"
          tone="slate"
        />
      </section>

     <section className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4 xl:self-start">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">Department Queue</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Submitted departments only
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                {budgets.length}
              </span>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search department or HOD"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
              {[
                ["ALL", "All"],
                ["IN_CATEGORY_REVIEW", "In Review"],
                ["CATEGORY_REVIEW_COMPLETED", "Completed"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatusFilterChange(value)}
                  className={classNames(
                    "rounded-lg px-2 py-2 text-[11px] font-black transition",
                    statusFilter === value
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {label} {filterCounts[value]}
                </button>
              ))}
            </div>
          </div>

         <div className="max-h-[calc(100vh-290px)] overflow-y-auto">
            {queueLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : queueError ? (
              <div className="p-5 text-center">
                <AlertCircle className="mx-auto h-7 w-7 text-rose-500" />
                <p className="mt-2 text-sm font-bold text-slate-800">
                  Could not load department reviews.
                </p>
                <button
                  type="button"
                  onClick={onRetryQueue}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : filteredBudgets.length ? (
              filteredBudgets.map((budget) => (
                <DepartmentQueueItem
                  key={budget.id}
                  budget={budget}
                  selected={Number(selectedBudgetId) === Number(budget.id)}
                  onSelect={() => onSelectBudget(budget.id)}
                />
              ))
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">
                No departments match the current search and filter.
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {detailLoading ? (
            <div className="space-y-4 p-6">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-[480px] animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : detailError ? (
            <div className="flex min-h-[520px] items-center justify-center p-6 text-center">
              <div>
                <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
                <h2 className="mt-3 text-lg font-black text-slate-900">
                  Could not load this department review
                </h2>
                <button
                  type="button"
                  onClick={onRetryDetail}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" /> Retry
                </button>
              </div>
            </div>
          ) : !selectedBudget ? (
            <div className="flex min-h-[520px] items-center justify-center p-6 text-center">
              <div>
                <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                <h2 className="mt-3 text-lg font-black text-slate-900">
                  Select a department
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a submitted department from the queue to start reviewing.
                </p>
              </div>
            </div>
          ) : (
            <>
              <header className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                        {selectedBudget.department_name}
                      </h2>
                      <StatusBadge status={selectedBudget.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      HOD: {selectedBudget.hod_name || "Not assigned"}
                    </p>
                    {selectedBudget.submitted_by_name ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Submitted by {selectedBudget.submitted_by_name}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                      {itemCount} items
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                      {reviewedCount} reviewed
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                      {pendingCount} pending
                    </span>
                    {canReopenReview ? (
                      <button
                        type="button"
                        onClick={onReopenReview}
                        disabled={reopenPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {reopenPending ? "Reopening..." : "Return to In Review"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {selectedBudget.category_package_status === "RETURNED_BY_CFO" &&
                selectedBudget.package_return_reason ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span className="font-black">CFO return reason:</span>{" "}
                    {selectedBudget.package_return_reason}
                  </div>
                ) : null}
              </header>

              <DepartmentReviewItemsTable
                key={selectedBudget.id}
                items={items}
                selectedBudget={selectedBudget}
                onReviewItem={onReviewItem}
                focusedDemandItemId={focusedDemandItemId}
                canReviewItems={canReviewItems}
                onInlineSave={onInlineSave}
                getItemDraft={getItemDraft}
                onItemDraftChange={onItemDraftChange}
                isItemSaving={isItemSaving}
                isItemDraftDirty={isItemDraftDirty}
              />

              <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {pendingCount === 0
                      ? "All items have been reviewed"
                      : `${pendingCount} item${pendingCount === 1 ? "" : "s"} still need review`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Requested {formatNumber(selectedBudget.summary?.total_requested_quantity)} · Approved {formatNumber(selectedBudget.summary?.total_approved_quantity)}
                  </p>
                </div>

                {selectedBudget.status === "IN_CATEGORY_REVIEW" ? (
                  <button
                    type="button"
                    disabled={!canComplete}
                    onClick={onCompleteReview}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Complete Department Review
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Review Completed
                  </span>
                )}
              </footer>
            </>
          )}
        </section>
      </section>
        </>
      )}
    </div>
  );
}

