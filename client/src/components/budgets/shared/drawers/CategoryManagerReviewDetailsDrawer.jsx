import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  PackageSearch,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import useEscapeKey from "../../../../hooks/useEscapeKey";
import { formatDateTime } from "../../../../utils/dateFormatters";

import AnimatedDrawer from "./AnimatedDrawer";

function normalizeQuantity(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatQuantity(value) {
  const number = normalizeQuantity(value);

  if (number === null) {
    return "-";
  }

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDifference(value) {
  const number = normalizeQuantity(value);

  if (number === null) {
    return "-";
  }

  const formattedValue = formatQuantity(Math.abs(number));

  if (number > 0) {
    return `+${formattedValue}`;
  }

  if (number < 0) {
    return `-${formattedValue}`;
  }

  return "0";
}

/**
 * Returns one shared visual definition for both:
 * 1. The compact status button in the table.
 * 2. The status section inside the details drawer.
 */
export function getCategoryManagerReviewDisplay({
  reviewStatus,
  requestedQuantity,
  approvedQuantity,
}) {
  const requested = normalizeQuantity(requestedQuantity) ?? 0;
  const approved = normalizeQuantity(approvedQuantity);

  if (reviewStatus === "PENDING_CATEGORY_REVIEW") {
    return {
      key: "PENDING",
      label: "Pending Review",
      drawerLabel: "Pending Category Manager Review",
      description:
        "This item was submitted and is waiting for the Category Manager's decision.",
      Icon: Clock3,
      buttonClassName:
        "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
      badgeClassName: "border-blue-200 bg-blue-50 text-blue-700",
      iconContainerClassName: "bg-blue-100 text-blue-700",
    };
  }

  if (
    reviewStatus !== "CATEGORY_REVIEW_COMPLETED" ||
    approved === null
  ) {
    return {
      key: "NOT_REVIEWED",
      label: "Not Reviewed",
      drawerLabel: "Not Reviewed",
      description:
        "No completed Category Manager decision is available for this item.",
      Icon: Clock3,
      buttonClassName:
        "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100",
      badgeClassName: "border-slate-200 bg-slate-50 text-slate-600",
      iconContainerClassName: "bg-slate-100 text-slate-600",
    };
  }

  if (approved === 0) {
    return {
      key: "NOT_APPROVED",
      label: "Not Approved",
      drawerLabel: "Not Approved",
      description:
        "The Category Manager did not approve any quantity for this item.",
      Icon: XCircle,
      buttonClassName:
        "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
      badgeClassName: "border-red-200 bg-red-50 text-red-700",
      iconContainerClassName: "bg-red-100 text-red-700",
    };
  }

  if (approved === requested) {
    return {
      key: "APPROVED_AS_REQUESTED",
      label: "Approved as Requested",
      drawerLabel: "Approved as Requested",
      description:
        "The Category Manager approved the full requested quantity without changes.",
      Icon: CheckCircle2,
      buttonClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
      badgeClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      iconContainerClassName: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    key: "APPROVED_WITH_CHANGES",
    label: "Approved with Changes",
    drawerLabel: "Approved with Changes",
    description:
      "The Category Manager approved this item, but changed its requested quantity.",
    Icon: AlertTriangle,
    buttonClassName:
      "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
    iconContainerClassName: "bg-amber-100 text-amber-800",
  };
}

function MetricCard({ label, value, description, tone = "slate" }) {
  const toneClasses = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <article
      className={`rounded-2xl border p-5 ${toneClasses[tone] || toneClasses.slate}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>

      {description && (
        <p className="mt-2 text-sm font-medium leading-5 opacity-70">
          {description}
        </p>
      )}
    </article>
  );
}

function DetailItem({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <div className="mt-1 break-words text-sm font-bold text-slate-900">
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

export default function CategoryManagerReviewDetailsDrawer({
  open,
  onClose,
  row,
  itemName,
  categoryName,
  expenseType,
}) {
  const closeButtonRef = useRef(null);

  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

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

  const requestedQuantity = normalizeQuantity(row?.quantity) ?? 0;

  const approvedQuantity = normalizeQuantity(row?.approvedQuantity);

  const quantityDifference =
    approvedQuantity === null
      ? null
      : approvedQuantity - requestedQuantity;

  const reviewDisplay = getCategoryManagerReviewDisplay({
    reviewStatus: row?.reviewStatus,
    requestedQuantity,
    approvedQuantity,
  });

  const ReviewStatusIcon = reviewDisplay.Icon;

  const approvedMetricTone =
    reviewDisplay.key === "NOT_APPROVED"
      ? "red"
      : reviewDisplay.key === "APPROVED_WITH_CHANGES"
        ? "amber"
        : reviewDisplay.key === "APPROVED_AS_REQUESTED"
          ? "emerald"
          : "slate";

  const differenceMetricTone =
    quantityDifference === null || quantityDifference === 0
      ? "slate"
      : quantityDifference < 0
        ? "amber"
        : "blue";

  const reviewedBy =
    row?.reviewedByName ||
    row?.reviewedBy ||
    (row?.reviewStatus === "PENDING_CATEGORY_REVIEW"
      ? "Pending review"
      : "-");

  const reviewedAt = row?.reviewedAt
    ? formatDateTime(row.reviewedAt)
    : row?.reviewStatus === "PENDING_CATEGORY_REVIEW"
      ? "Pending review"
      : "-";

  const reviewNote =
    typeof row?.reviewNote === "string" && row.reviewNote.trim()
      ? row.reviewNote.trim()
      : "No review note was added.";

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-review-drawer-title"
        aria-describedby="category-manager-review-drawer-description"
        className="flex h-full min-h-0 flex-col bg-slate-50"
      >
        <header className="flex shrink-0 items-center justify-between gap-5 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${reviewDisplay.iconContainerClassName}`}
            >
              <ReviewStatusIcon size={24} />
            </div>

            <div className="min-w-0">
              <h2
                id="category-manager-review-drawer-title"
                className="truncate text-xl font-black text-slate-900"
              >
                Category Manager Review Details
              </h2>

              <p className="mt-1 truncate text-sm font-medium text-slate-500">
                {itemName || row?.typeName || "Generic item"}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close Category Manager review details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            <X size={20} />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
            <section
              className={`rounded-3xl border p-6 ${reviewDisplay.badgeClassName}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${reviewDisplay.iconContainerClassName}`}
                  >
                    <ReviewStatusIcon size={25} />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
                      Final Review Result
                    </p>

                    <h3 className="mt-1 text-2xl font-black">
                      {reviewDisplay.drawerLabel}
                    </h3>

                    <p
                      id="category-manager-review-drawer-description"
                      className="mt-2 max-w-3xl text-sm font-semibold leading-6 opacity-80"
                    >
                      {reviewDisplay.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${reviewDisplay.badgeClassName}`}
                >
                  <ReviewStatusIcon size={17} />
                  {reviewDisplay.label}
                </span>
              </div>
            </section>

            <section>
              <div className="mb-3">
                <h3 className="text-lg font-black text-slate-900">
                  Quantity Decision
                </h3>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Comparison between the department request and the Category
                  Manager decision.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Requested Quantity"
                  value={formatQuantity(requestedQuantity)}
                  description="Quantity originally requested by the department."
                  tone="blue"
                />

                <MetricCard
                  label="Approved Quantity"
                  value={formatQuantity(approvedQuantity)}
                  description={
                    approvedQuantity === null
                      ? "The Category Manager has not completed the review."
                      : "Final quantity approved by the Category Manager."
                  }
                  tone={approvedMetricTone}
                />

                <MetricCard
                  label="Difference"
                  value={formatDifference(quantityDifference)}
                  description={
                    quantityDifference === null
                      ? "Available after the review is completed."
                      : quantityDifference === 0
                        ? "No change from the requested quantity."
                        : quantityDifference < 0
                          ? `${formatQuantity(
                              Math.abs(quantityDifference),
                            )} fewer than requested.`
                          : `${formatQuantity(
                              quantityDifference,
                            )} more than requested.`
                  }
                  tone={differenceMetricTone}
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <PackageSearch size={19} />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Item Information
                    </h3>

                    <p className="text-xs font-medium text-slate-500">
                      The reviewed department budget item.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <DetailItem
                    label="Generic Item"
                    value={itemName || row?.typeName || "Generic item"}
                    icon={PackageSearch}
                  />

                  <DetailItem
                    label="Category"
                    value={
                      categoryName ||
                      row?.categoryName ||
                      "Active category"
                    }
                    icon={PackageSearch}
                  />

                  <DetailItem
                    label="Expense Type"
                    value={expenseType || row?.expenseType || "-"}
                    icon={PackageSearch}
                  />

                  <DetailItem
                    label="Distribution Method"
                    value={row?.method?.replaceAll("_", " ") || "-"}
                    icon={PackageSearch}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <UserRound size={19} />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Review Information
                    </h3>

                    <p className="text-xs font-medium text-slate-500">
                      Reviewer and completion information.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <DetailItem
                    label="Reviewed By"
                    value={reviewedBy}
                    icon={UserRound}
                  />

                  <DetailItem
                    label="Reviewed At"
                    value={reviewedAt}
                    icon={CalendarDays}
                  />

                  <DetailItem
                    label="Workflow Status"
                    value={row?.reviewStatus?.replaceAll("_", " ") || "-"}
                    icon={Clock3}
                  />
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <MessageSquareText size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-slate-900">
                    Category Manager Note
                  </h3>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Explanation or comment recorded with the review decision.
                  </p>

                  <div className="mt-4 whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-7 text-slate-700">
                    {reviewNote}
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