import {
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
  onClose,
  onGoToDepartmentReview,
}) {
  if (!item) return null;

  const departments = item.departments || [];
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
                      const reviewed =
                        department.review_status ===
                        "CATEGORY_REVIEW_COMPLETED";

                      return (
                        <tr
                          key={department.department_budget_item_id}
                          className="hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-950">
                              {department.department_name}
                            </p>
                            {department.department_code ? (
                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                {department.department_code}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {department.hod_name || "Not assigned"}
                          </td>
                          <td className="px-5 py-4 font-black text-slate-950">
                            {formatNumber(department.requested_quantity)}
                          </td>
                          <td className="px-5 py-4 font-black text-slate-950">
                            {reviewed
                              ? formatNumber(department.approved_quantity)
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <ReviewStatusBadge reviewed={reviewed} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                onGoToDepartmentReview(
                                  department.department_category_budget_id,
                                )
                              }
                              className={[
                                "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                                reviewed
                                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  : "bg-blue-600 text-white hover:bg-blue-700",
                              ].join(" ")}
                            >
                              {reviewed ? "View Department" : "Review"}
                            </button>
                          </td>
                        </tr>
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
