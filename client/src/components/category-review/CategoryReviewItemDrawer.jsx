import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Lock,
  Save,
  X,
} from "lucide-react";

import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import { buildApprovedDistribution, isCountableUnit } from "../../utils/approvedDistribution";

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormatter.format(number) : "—";
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDistributionMethod(value) {
  const labels = {
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    CUSTOM: "Custom",
    ANNUAL: "Annual",
  };
  return labels[value] || String(value || "Not specified").replaceAll("_", " ");
}

function periodLabel(row) {
  const type = String(row?.period_type || "Period").toUpperCase();
  const no = Number(row?.period_no || 0);

  if (type === "MONTH" || type === "MONTHLY") {
    const date = new Date(2026, Math.max(0, no - 1), 1);
    return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
  }

  if (type === "QUARTER" || type === "QUARTERLY") {
    return `Q${no}`;
  }

  if (type === "YEAR" || type === "ANNUAL") {
    return "Annual";
  }

  return `${String(row?.period_type || "Period").replaceAll("_", " ")} ${no || ""}`.trim();
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function getApprovedDistributionShape(item, distribution = []) {
  const method = String(item?.distribution_method || "").toUpperCase();

  if (method === "MONTHLY") {
    return { periodType: "MONTH", periodCount: 12 };
  }

  if (method === "QUARTERLY") {
    return { periodType: "QUARTER", periodCount: 4 };
  }

  if (method === "CUSTOM") {
    const types = [
      ...new Set(
        distribution
          .map((row) => String(row?.period_type || "").toUpperCase())
          .filter((type) => type === "MONTH" || type === "QUARTER"),
      ),
    ];

    if (types.length === 1) {
      return {
        periodType: types[0],
        periodCount: types[0] === "MONTH" ? 12 : 4,
      };
    }
  }

  return null;
}

function fillDistributionPeriods(rows, shape) {
  if (!shape) return Array.isArray(rows) ? rows : [];

  const byPeriod = new Map(
    (Array.isArray(rows) ? rows : [])
      .filter(
        (row) =>
          String(row?.period_type || "").toUpperCase() === shape.periodType,
      )
      .map((row) => [Number(row.period_no), row]),
  );

  return Array.from({ length: shape.periodCount }, (_, index) => {
    const periodNo = index + 1;
    const existing = byPeriod.get(periodNo);
    return {
      id: existing?.id ?? null,
      period_type: shape.periodType,
      period_no: periodNo,
      quantity: existing?.quantity ?? 0,
    };
  });
}

function StatusBadge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tones[tone] || tones.slate}`}
    >
      {children}
    </span>
  );
}

export default function CategoryReviewItemDrawer({
  open,
  onClose,
  item,
  departmentName,
  hodName,
  draft,
  dirty,
  locked,
  returnedCorrection,
  saving,
  onDraftChange,
  onSave,
  onSaveAndNext,
}) {
  if (!item) return null;

  const approvedValue = draft?.category_approved_quantity ?? "";
  const approvedNumber = Number(approvedValue);
  const countableUnit = isCountableUnit(item);
  const approvedIsValid =
    approvedValue !== "" &&
    Number.isFinite(approvedNumber) &&
    approvedNumber >= 0 &&
    (!countableUnit || Number.isInteger(approvedNumber));
  const decisionCompleted = item.review_status === "CATEGORY_REVIEW_COMPLETED";
  const requested = Number(item.requested_quantity || 0);
  const difference = approvedIsValid ? approvedNumber - requested : null;
  const distribution = item.distribution || [];
  const distributionTotal = distribution.reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0,
  );
  const distributionShape = getApprovedDistributionShape(item, distribution);
  const automaticApprovedDistribution = approvedIsValid
    ? buildApprovedDistribution({
        distribution,
        requestedQuantity: requested,
        approvedQuantity: approvedNumber,
        unitCode: item.unit_code,
        unitName: item.unit_name,
      })
    : [];
  const automaticDisplayRows = fillDistributionPeriods(
    automaticApprovedDistribution,
    distributionShape,
  );
  const approvedDistributionMode =
    draft?.approved_distribution_mode === "CUSTOM" ? "CUSTOM" : "AUTO";
  const customApprovedDistribution = fillDistributionPeriods(
    draft?.approved_distribution || item.approved_distribution || [],
    distributionShape,
  );
  const returnedAdjustedCustomDistribution =
    returnedCorrection &&
    approvedDistributionMode === "CUSTOM" &&
    approvedIsValid
      ? fillDistributionPeriods(
          buildApprovedDistribution({
            distribution: customApprovedDistribution,
            requestedQuantity:
              item.category_approved_quantity ?? item.requested_quantity ?? 0,
            approvedQuantity: approvedNumber,
            unitCode: item.unit_code,
            unitName: item.unit_name,
          }),
          distributionShape,
        )
      : customApprovedDistribution;
  const customRowsValid = returnedAdjustedCustomDistribution.every((row) => {
    if (row.quantity === "" || row.quantity === null || row.quantity === undefined) {
      return false;
    }
    const quantity = Number(row.quantity);
    return (
      Number.isFinite(quantity) &&
      quantity >= 0 &&
      (!countableUnit || Number.isInteger(quantity))
    );
  });
  const customDistributionTotal = roundQuantity(
    returnedAdjustedCustomDistribution.reduce(
      (sum, row) => sum + Number(row.quantity || 0),
      0,
    ),
  );
  const customDistributionRemaining = approvedIsValid
    ? roundQuantity(approvedNumber - customDistributionTotal)
    : null;
  const customDistributionValid =
    approvedIsValid &&
    Boolean(distributionShape) &&
    customRowsValid &&
    customDistributionTotal === roundQuantity(approvedNumber);
  const approvedDistribution =
    approvedDistributionMode === "CUSTOM"
      ? returnedAdjustedCustomDistribution
      : automaticDisplayRows;
  const approvedDistributionTotal = roundQuantity(
    approvedDistribution.reduce(
      (sum, row) => sum + Number(row.quantity || 0),
      0,
    ),
  );
  const distributionDecisionValid =
    returnedCorrection ||
    approvedDistributionMode !== "CUSTOM" ||
    customDistributionValid;
  const saveDisabled =
    locked ||
    saving ||
    !approvedIsValid ||
    !distributionDecisionValid ||
    (decisionCompleted && !dirty);
  const hodNote = item.hod_item_note || item.hodItemNote || "";
  const isProject = item.is_project === true || item.is_project === 1 || item.isProject === true;

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Review Department Item
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-2xl font-black text-slate-950">
                  {item.catalog_item_name}
                </h2>
                <StatusBadge
                  tone={
                    item.review_status === "CATEGORY_REVIEW_COMPLETED"
                      ? "emerald"
                      : "amber"
                  }
                >
                  {item.review_status === "CATEGORY_REVIEW_COMPLETED"
                    ? "Reviewed"
                    : "Pending Review"}
                </StatusBadge>
                {isProject ? <StatusBadge tone="blue">Project</StatusBadge> : null}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {departmentName || "Department"}
                {hodName ? ` · HOD: ${hodName}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close item review"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {returnedCorrection ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-black">CFO requested a correction</p>
                  <p className="mt-1 text-sm leading-6">
                    {item.package_item_cfo_review_note ||
                      "Only this returned item is open for correction."}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Only the approved quantity can be changed in this return round.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Requested Quantity
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {formatNumber(item.requested_quantity)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {item.unit_name || item.unit_code || "Unit"}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                <label
                  htmlFor={`approved-quantity-${item.id}`}
                  className="text-[11px] font-black uppercase tracking-wide text-blue-700"
                >
                  Approved Quantity
                </label>
                <input
                  id={`approved-quantity-${item.id}`}
                  type="number"
                  min="0"
                  step={countableUnit ? "1" : "any"}
                  value={approvedValue}
                  disabled={locked || saving}
                  onChange={(event) =>
                    onDraftChange({
                      category_approved_quantity: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-lg font-black text-slate-950 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                {countableUnit ? (
                  <p className={`mt-2 text-xs font-semibold ${approvedIsValid ? "text-blue-700" : "text-rose-600"}`}>
                    Countable item: approved quantity must be a whole number.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Difference
                </p>
                <p
                  className={`mt-1 text-2xl font-black ${
                    difference === null
                      ? "text-slate-400"
                      : difference < 0
                        ? "text-amber-700"
                        : difference > 0
                          ? "text-blue-700"
                          : "text-emerald-700"
                  }`}
                >
                  {difference === null
                    ? "—"
                    : `${difference > 0 ? "+" : ""}${formatNumber(difference)}`}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Approved vs requested
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-700" />
                    <h3 className="font-black text-slate-950">HOD Request Note</h3>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Context submitted by the department.
                  </p>
                </div>
                <StatusBadge tone={hodNote ? "blue" : "slate"}>
                  {hodNote ? "Provided" : "No note"}
                </StatusBadge>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {hodNote || "The department did not add a request note for this item."}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-violet-700" />
                    <h3 className="font-black text-slate-950">Distribution</h3>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatDistributionMethod(item.distribution_method)} · requested {formatNumber(distributionTotal)}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    Number(distributionTotal) === Number(item.requested_quantity)
                      ? "emerald"
                      : "amber"
                  }
                >
                  {Number(distributionTotal) === Number(item.requested_quantity)
                    ? "Balanced"
                    : "Check distribution"}
                </StatusBadge>
              </div>

              {distribution.length ? (
                <div className="grid gap-4 bg-slate-50 p-4 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-sm font-black text-slate-950">HOD Requested Distribution</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Original department timing.</p>
                    </div>
                    <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
                      {distribution.map((row) => (
                        <div key={row.id} className="bg-white px-4 py-3">
                          <p className="text-xs font-bold text-slate-500">{periodLabel(row)}</p>
                          <p className="mt-1 text-lg font-black text-slate-950">{formatNumber(row.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white">
                    <div className="border-b border-blue-100 bg-blue-50/70 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-blue-950">Approved Distribution</p>
                          <p className="mt-1 text-xs font-semibold text-blue-700">
                            {approvedDistributionMode === "CUSTOM"
                              ? "Manually distribute the approved quantity across the available periods."
                              : `Automatically rebalanced to total ${approvedIsValid ? formatNumber(approvedDistributionTotal) : "—"}${countableUnit ? " using whole units only." : "."}`}
                          </p>
                        </div>
                        {approvedIsValid ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-800 shadow-sm ring-1 ring-blue-100">
                            Total {formatNumber(approvedDistributionTotal)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {approvedIsValid ? (
                      <div className="space-y-3 p-3">
                        {distributionShape ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              disabled={locked || returnedCorrection || saving}
                              onClick={() =>
                                onDraftChange({
                                  approved_distribution_mode: "AUTO",
                                })
                              }
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                approvedDistributionMode === "AUTO"
                                  ? "border-blue-300 bg-blue-50 text-blue-900 ring-2 ring-blue-100"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <span className="block text-sm font-black">Use Automatic Distribution</span>
                              <span className="mt-1 block text-xs font-semibold text-slate-500">
                                Keep the system-balanced approved timing.
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={locked || returnedCorrection || saving}
                              onClick={() => {
                                const existingCustomTotal = roundQuantity(
                                  customApprovedDistribution.reduce(
                                    (sum, row) =>
                                      sum + Number(row.quantity || 0),
                                    0,
                                  ),
                                );
                                const seedRows =
                                  existingCustomTotal ===
                                  roundQuantity(approvedNumber)
                                    ? customApprovedDistribution
                                    : automaticDisplayRows;

                                onDraftChange({
                                  approved_distribution_mode: "CUSTOM",
                                  approved_distribution: seedRows.map((row) => ({
                                    period_type: row.period_type,
                                    period_no: row.period_no,
                                    quantity: row.quantity,
                                  })),
                                });
                              }}
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                approvedDistributionMode === "CUSTOM"
                                  ? "border-blue-300 bg-blue-50 text-blue-900 ring-2 ring-blue-100"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <span className="block text-sm font-black">Customize Distribution</span>
                              <span className="mt-1 block text-xs font-semibold text-slate-500">
                                Enter the approved quantity for each {distributionShape.periodType === "MONTH" ? "month" : "quarter"}.
                              </span>
                            </button>
                          </div>
                        ) : null}

                        {approvedDistributionMode === "CUSTOM" && distributionShape ? (
                          <div
                            className={`grid grid-cols-3 gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${
                              customDistributionValid
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                          >
                            <div>
                              <span className="block text-[10px] uppercase tracking-wide opacity-70">Distributed</span>
                              <span className="mt-0.5 block text-sm font-black">{formatNumber(customDistributionTotal)}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wide opacity-70">Remaining</span>
                              <span className="mt-0.5 block text-sm font-black">
                                {customDistributionRemaining === null
                                  ? "—"
                                  : formatNumber(customDistributionRemaining)}
                              </span>
                            </div>
                            <div className="flex items-center justify-end">
                              <span className="font-black">
                                {customDistributionValid ? "Valid" : "Check total"}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {approvedDistribution.map((row) => (
                            <div
                              key={`approved-${row.period_type}-${row.period_no}`}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <label
                                htmlFor={`approved-distribution-${item.id}-${row.period_type}-${row.period_no}`}
                                className="text-xs font-bold text-slate-500"
                              >
                                {periodLabel(row)}
                              </label>
                              {approvedDistributionMode === "CUSTOM" && distributionShape ? (
                                <input
                                  id={`approved-distribution-${item.id}-${row.period_type}-${row.period_no}`}
                                  type="number"
                                  min="0"
                                  step={countableUnit ? "1" : "any"}
                                  value={row.quantity}
                                  disabled={locked || returnedCorrection || saving}
                                  onChange={(event) => {
                                    const nextRows = customApprovedDistribution.map((currentRow) =>
                                      Number(currentRow.period_no) === Number(row.period_no) &&
                                      String(currentRow.period_type) === String(row.period_type)
                                        ? { ...currentRow, quantity: event.target.value }
                                        : currentRow,
                                    );
                                    onDraftChange({
                                      approved_distribution_mode: "CUSTOM",
                                      approved_distribution: nextRows,
                                    });
                                  }}
                                  className="mt-2 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-base font-black text-blue-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                              ) : (
                                <p className="mt-1 text-lg font-black text-blue-700">
                                  {formatNumber(row.quantity)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {approvedDistributionMode === "CUSTOM" &&
                        !returnedCorrection &&
                        !customDistributionValid ? (
                          <p className="px-1 text-xs font-semibold text-rose-600">
                            The custom distribution must use valid {countableUnit ? "whole-number " : ""}quantities and total exactly {formatNumber(approvedNumber)}.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-sm font-semibold text-rose-600">
                        Enter a valid approved quantity to preview the approved distribution.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-5 py-6 text-sm text-slate-500">
                  No distribution rows were recorded for this item.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <label
                htmlFor={`review-note-${item.id}`}
                className="text-sm font-black text-slate-950"
              >
                Category Manager Review Note
              </label>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Record the reason for the approved quantity or any important review context.
              </p>
              <textarea
                id={`review-note-${item.id}`}
                rows={5}
                value={draft?.review_note || ""}
                disabled={locked || returnedCorrection || saving}
                onChange={(event) => onDraftChange({ review_note: event.target.value })}
                placeholder="Add review notes..."
                className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              {item.reviewed_by_name ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Last reviewed by <strong>{item.reviewed_by_name}</strong> on {formatDateTime(item.reviewed_at)}
                  </span>
                </div>
              ) : null}
            </section>

            {locked ? (
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-700">
                <Lock className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-black">Read-only review</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {returnedCorrection
                      ? "This item can only be changed through its approved quantity field during the CFO return round."
                      : "This department review is not currently editable."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </main>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              {dirty ? (
                <>
                  <AlertCircle className="h-4 w-4 text-blue-600" /> Unsaved changes
                </>
              ) : decisionCompleted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Decision saved
                </>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Save className="h-4 w-4" />
                {returnedCorrection ? "Save Correction" : "Save Decision"}
              </button>
              {!returnedCorrection ? (
                <button
                  type="button"
                  onClick={onSaveAndNext}
                  disabled={saveDisabled}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Save & Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </footer>
      </div>
    </AnimatedDrawer>
  );
}

