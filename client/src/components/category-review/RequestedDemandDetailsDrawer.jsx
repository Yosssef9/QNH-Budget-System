import { Fragment, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isCountableUnit } from "../../utils/approvedDistribution";
import { getCategoryReviewBudget } from "../../api/categoryReview.api";
import {
  Save,
  ChevronRight,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  X,
} from "lucide-react";

import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormatter.format(number) : "—";
}

function ReviewStatusBadge({ reviewed }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-black",
        reviewed
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {reviewed ? "Reviewed" : "Pending"}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    slate: "border-slate-200 bg-white text-slate-900",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.blue}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-black uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

export default function RequestedDemandDetailsDrawer({
  item,
  cfoReview = null,
  onClose,
  onGoToDepartmentReview,
  onSaveApprovedQuantity,
  canReviewItems = false,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [quantityDraft, setQuantityDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const departments = item?.departments || [];
  const activeDepartment = departments.find((department) =>
    Number(department.department_budget_item_id) === Number(expandedId));
  const budgetQuery = useQuery({
    queryKey: ["category-review", "budget", activeDepartment?.department_category_budget_id],
    queryFn: () => getCategoryReviewBudget(activeDepartment.department_category_budget_id),
    enabled: Boolean(item && activeDepartment),
  });
  const budget = budgetQuery.data;
  const activeReviewItem = (budget?.items || []).find((row) =>
    Number(row.id) === Number(activeDepartment?.department_budget_item_id));
  const returnedCorrection = budget?.status === "CATEGORY_REVIEW_COMPLETED" &&
    budget?.category_package_status === "RETURNED_BY_CFO" &&
    activeReviewItem?.package_item_cfo_review_status === "NEEDS_MODIFICATION";
  const editable = canReviewItems && (budget?.status === "IN_CATEGORY_REVIEW" || returnedCorrection);
  const customDistribution = !returnedCorrection && activeReviewItem?.approved_distribution_mode === "CUSTOM";
  const countable = isCountableUnit(activeReviewItem || {});
  const quantity = Number(quantityDraft);
  const validQuantity = quantityDraft !== "" && Number.isFinite(quantity) &&
    quantity >= 0 && (!countable || Number.isInteger(quantity));
  const unchanged = Number(activeReviewItem?.category_approved_quantity ?? activeReviewItem?.requested_quantity) === quantity;
  const canSave = editable && !customDistribution && validQuantity && !saving &&
    (!unchanged || activeReviewItem?.review_status !== "CATEGORY_REVIEW_COMPLETED");

  useEffect(() => setExpandedId(null), [item?.catalog_item_id]);
  useEffect(() => {
    if (!activeReviewItem) return;
    setQuantityDraft(String(activeReviewItem.category_approved_quantity ?? activeReviewItem.requested_quantity ?? ""));
  }, [activeReviewItem?.id, activeReviewItem?.row_version, activeReviewItem?.category_approved_quantity]);

  async function handleSave(event) {
    event.preventDefault();
    if (!canSave || !onSaveApprovedQuantity) return;
    setSaving(true);
    try {
      const saved = await onSaveApprovedQuantity({ budget, item: activeReviewItem, quantity: quantityDraft });
      if (saved) {
        const index = departments.findIndex((department) =>
          Number(department.department_budget_item_id) === Number(activeReviewItem.id));
        const next = departments[index + 1];
        setExpandedId(next?.department_budget_item_id ?? null);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!item) return null;

  const nextDepartment =
    departments.find(
      (department) =>
        department.review_status !== "CATEGORY_REVIEW_COMPLETED",
    ) || departments[0];

  return (
    <AnimatedDrawer open={Boolean(item)} onClose={onClose} fullScreen>
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Requested Demand Details
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="break-words text-2xl font-black text-slate-950">
                  {item.catalog_item_name}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                  {item.expense_type || "—"}
                </span>
                {cfoReview?.cfo_review_status === "CFO_ACCEPTED" ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">CFO Accepted</span>
                ) : cfoReview?.cfo_review_status === "NEEDS_MODIFICATION" ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Needs Revision</span>
                ) : null}
                {item.is_project ? (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                    Project
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {item.unit_name || item.unit_code || "Unit"} · Consolidated from submitted departments
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close requested demand details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-5">
            {cfoReview?.cfo_review_status === "NEEDS_MODIFICATION" && cfoReview?.cfo_review_note?.trim() ? (
              <div className="whitespace-pre-wrap break-words rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                {cfoReview.cfo_review_note}
              </div>
            ) : null}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Building2}
                label="Total Requested"
                value={formatNumber(item.total_requested_quantity)}
              />
              <MetricCard
                icon={Building2}
                label="Departments"
                value={formatNumber(item.department_count)}
                tone="slate"
              />
              <MetricCard
                icon={Clock3}
                label="Reviewed"
                value={`${formatNumber(item.reviewed_department_count)} / ${formatNumber(item.department_count)}`}
                tone="amber"
              />
              <MetricCard
                icon={CheckCircle2}
                label="Approved So Far"
                value={formatNumber(item.approved_so_far)}
                tone="emerald"
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-black text-slate-950">
                  Department Contributions
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  See exactly which submitted departments make up this requested total.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3">HOD</th>
                      <th className="px-5 py-3">Requested</th>
                      <th className="px-5 py-3">Approved</th>
                      <th className="px-5 py-3">Review Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((department) => {
                      const reviewed = department.review_status === "CATEGORY_REVIEW_COMPLETED";
                      const expanded = Number(expandedId) === Number(department.department_budget_item_id);
                      const nextValue = department.approved_quantity;
                      return (
                        <Fragment key={department.department_budget_item_id}>
                          <tr tabIndex={0} aria-expanded={expanded}
                            aria-label={`${expanded ? "Collapse" : "Expand"} approved quantity for ${department.department_name}`}
                            onClick={() => setExpandedId((current) => Number(current) === Number(department.department_budget_item_id) ? null : department.department_budget_item_id)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setExpandedId((current) => Number(current) === Number(department.department_budget_item_id) ? null : department.department_budget_item_id);
                              }
                            }}
                            className={`cursor-pointer transition-colors hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${expanded ? "bg-blue-50/50" : ""}`}>
                            <td className="px-5 py-4">
                              <span className="flex items-center gap-2 font-black text-slate-950">
                                <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-90 text-blue-600" : ""}`} />
                                {department.department_name}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-600">{department.hod_name || "Not assigned"}</td>
                            <td className="px-5 py-4 font-black text-slate-950">{formatNumber(department.requested_quantity)}</td>
                            <td className="px-5 py-4 font-black text-slate-950">{reviewed ? formatNumber(nextValue) : "—"}</td>
                            <td className="px-5 py-4"><ReviewStatusBadge reviewed={reviewed} /></td>
                            <td className="px-5 py-4 text-right">
                              <button type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onGoToDepartmentReview(department.department_category_budget_id, department.department_budget_item_id);
                                }}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">
                                View Approval
                              </button>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="bg-blue-50/40">
                              <td colSpan={6} className="px-5 py-4">
                                {budgetQuery.isLoading ? (
                                  <p className="text-sm text-slate-500">Loading department approval...</p>
                                ) : budgetQuery.isError || !activeReviewItem ? (
                                  <p className="text-sm text-rose-700">Unable to load this department item. Use View Approval to inspect it.</p>
                                ) : (
                                  <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3 rounded-xl border border-blue-200 bg-white p-4">
                                    <div className="w-44">
                                      <label htmlFor={`demand-approved-${department.department_budget_item_id}`}
                                        className="text-xs font-black uppercase tracking-wide text-slate-700">Approved Quantity</label>
                                      <input id={`demand-approved-${department.department_budget_item_id}`}
                                        type="number" min="0" step={countable ? "1" : "any"}
                                        value={quantityDraft} disabled={!editable || saving || customDistribution}
                                        onChange={(event) => setQuantityDraft(event.target.value)}
                                        aria-invalid={!validQuantity}
                                        className="mt-2 w-full rounded-xl border border-blue-200 bg-slate-50 px-3 py-2.5 text-lg font-black text-slate-950 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
                                    </div>
                                    <button type="submit" disabled={!canSave}
                                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                      <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Quantity & Next"}
                                    </button>
                                    <div className="flex-1 text-xs text-slate-500">
                                      <p>Requested: {formatNumber(department.requested_quantity)}{countable ? " · Whole numbers only" : ""}</p>
                                      {customDistribution ? <p className="mt-1 font-semibold text-amber-700">Custom period distribution: use View Approval to edit quantity and period allocations together.</p> : null}
                                      {!editable ? <p className="mt-1 font-semibold text-slate-600">Read-only in the current review stage.</p> : null}
                                      {!validQuantity ? <p className="mt-1 text-rose-700">Enter a valid non-negative quantity.</p> : null}
                                    </div>
                                  </form>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>

          {nextDepartment ? (
            <button
              type="button"
              onClick={() =>
                onGoToDepartmentReview(
                  nextDepartment.department_category_budget_id,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              Go to Department Review
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </footer>
      </div>
    </AnimatedDrawer>
  );
}

