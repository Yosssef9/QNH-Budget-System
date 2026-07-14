import { useEffect, useMemo, useRef } from "react";
import {
  BarChart3,
  CalendarDays,
  Hash,
  Layers3,
  PackageSearch,
  X,
} from "lucide-react";

import useEscapeKey from "../../../../hooks/useEscapeKey";
import AnimatedDrawer from "./AnimatedDrawer";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function getMethodLabel(method) {
  const labels = {
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    CUSTOM_MONTHLY: "Custom Monthly",
    CUSTOM_QUARTERLY: "Custom Quarterly",
    ANNUAL: "Annual",
  };

  return labels[method] || String(method || "Distribution").replaceAll("_", " ");
}

function getPeriodLabel(row) {
  if (row.period_type === "MONTH") {
    return `Month ${row.period_no}`;
  }

  if (row.period_type === "QUARTER") {
    return `Quarter ${row.period_no}`;
  }

  if (row.period_type === "YEAR") {
    return "Annual total";
  }

  return `${row.period_type || "Period"} ${row.period_no || ""}`.trim();
}

function DistributionPeriodCard({ row }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Period
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {getPeriodLabel(row)}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <CalendarDays size={17} />
        </span>
      </div>
      <p className="mt-4 text-2xl font-black text-blue-700">
        {formatQuantity(row.quantity)}
      </p>
    </article>
  );
}

export default function BudgetDistributionDetailsDrawer({
  open,
  onClose,
  item,
  title = "Distribution Details",
}) {
  const closeButtonRef = useRef(null);
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const animationFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  const distributionRows = useMemo(
    () =>
      [...(item?.distribution || [])].sort((a, b) => {
        const typeCompare = String(a.period_type || "").localeCompare(
          String(b.period_type || ""),
        );
        if (typeCompare !== 0) return typeCompare;
        return Number(a.period_no || 0) - Number(b.period_no || 0);
      }),
    [item?.distribution],
  );

  const distributionTotal = distributionRows.reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0,
  );

  const requestedQuantity =
    item?.requested_quantity ?? item?.quantity ?? item?.requestedQuantity ?? 0;
  const approvedQuantity =
    item?.category_approved_quantity ?? item?.approvedQuantity ?? null;

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="distribution-details-title"
        className="flex h-full min-h-0 flex-col bg-slate-50"
      >
        <header className="flex shrink-0 items-center justify-between gap-5 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <BarChart3 size={24} />
            </div>
            <div className="min-w-0">
              <h2
                id="distribution-details-title"
                className="truncate text-xl font-black text-slate-950"
              >
                {title}
              </h2>
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                {item?.type_name ||
                  item?.catalog_item_name ||
                  item?.itemName ||
                  "Budget item"}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close distribution details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            <X size={20} />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
            <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-slate-50 shadow-sm">
              <div className="grid gap-4 p-5 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Method
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    {getMethodLabel(item?.distribution_method)}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Requested
                  </p>
                  <p className="mt-2 text-lg font-black text-blue-950">
                    {formatQuantity(requestedQuantity)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    Approved
                  </p>
                  <p className="mt-2 text-lg font-black text-emerald-950">
                    {approvedQuantity === null
                      ? "-"
                      : formatQuantity(approvedQuantity)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Distributed
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    {formatQuantity(distributionTotal)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Distribution Breakdown
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Period-by-period quantity requested by the department.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  <Layers3 size={14} />
                  {distributionRows.length} period
                  {distributionRows.length === 1 ? "" : "s"}
                </span>
              </div>

              {distributionRows.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {distributionRows.map((row) => (
                    <DistributionPeriodCard
                      key={`${row.period_type}-${row.period_no}-${row.id || ""}`}
                      row={row}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <PackageSearch className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    No distribution rows are available for this item.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <PackageSearch size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Category
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {item?.category_name || item?.categoryName || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Hash size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Item Code
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {item?.item_code || item?.catalog_item_code || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Layers3 size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Expense Type
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {item?.expense_type || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_16px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            Close
          </button>
        </footer>
      </div>
    </AnimatedDrawer>
  );
}
