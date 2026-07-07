import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUp,
  ClipboardCheck,
  Clock3,
  FileText,
  Lock,
  Minus,
  RotateCcw,
  Save,
  Search,
  Send,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import Input from "../../components/Input";
import EnterpriseSearch from "../../components/EnterpriseSearch";
import CategoryPackageWorkbench from "../../components/category-packages/CategoryPackageWorkbench";
import {
  closeCategorySubmissionWindow,
  completeDepartmentCategoryReview,
  getCategoryReviewBudget,
  getCategoryReviewQueue,
  reopenCategorySubmissionWindow,
  saveCategoryReviewItemDecision,
  reopenDepartmentCategoryReview,
} from "../../api/categoryReview.api";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";

const STATUS_META = {
  OPEN: {
    label: "Open",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CLOSED: {
    label: "Closed",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  IN_CATEGORY_REVIEW: {
    label: "In Review",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CATEGORY_REVIEW_COMPLETED: {
    label: "Review Completed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  PENDING_CATEGORY_REVIEW: {
    label: "Pending Review",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  DRAFT: {
    label: "Draft",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

const QUEUE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "IN_CATEGORY_REVIEW", label: "In Review" },
  { value: "CATEGORY_REVIEW_COMPLETED", label: "Completed" },
];

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function formatNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? numberFormatter.format(numericValue)
    : "—";
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: String(status || "Unknown").replaceAll("_", " "),
      className: "border-slate-200 bg-slate-50 text-slate-700",
    }
  );
}

function StatusBadge({ status, compact = false }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border font-semibold",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function ProgressBar({ value, className = "" }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div
      className={classNames(
        "h-2 overflow-hidden rounded-full bg-slate-100",
        className,
      )}
      aria-label={`${Math.round(safeValue)}% complete`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <div
        className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function Metric({ icon: Icon, label, value, helper, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3">
      <div
        className={classNames(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tones[tone] || tones.blue,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-950">{value}</span>
          {helper && (
            <span className="truncate text-xs text-slate-500">{helper}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = ClipboardCheck, title, description }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center px-6 py-12 text-center">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function LoadingRows({ count = 4 }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse px-4 py-5">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
          <div className="mt-4 h-2 w-full rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function getBudgetProgress(budget) {
  const total = Number(budget?.item_count || 0);
  const reviewed = Number(budget?.reviewed_count || 0);
  return total > 0 ? (reviewed / total) * 100 : 0;
}

function DepartmentQueueItem({ budget, selected, onSelect }) {
  const progress = getBudgetProgress(budget);
  const pending = Number(budget.pending_count || 0);
  const reviewed = Number(budget.reviewed_count || 0);
  const total = Number(budget.item_count || 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={classNames(
        "group relative w-full border-b border-slate-100 px-4 py-4 text-left transition",
        "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
        selected ? "bg-blue-50/80" : "bg-white hover:bg-slate-50",
      )}
    >
      <span
        className={classNames(
          "absolute inset-y-0 left-0 w-1 transition",
          selected ? "bg-blue-600" : "bg-transparent group-hover:bg-blue-200",
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">
            {budget.department_name}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {budget.department_code || "Department"} · {total} item
            {total === 1 ? "" : "s"}
          </p>
        </div>
        <StatusBadge status={budget.status} compact />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-600">
        <span>
          {reviewed} of {total} reviewed
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <ProgressBar value={progress} className="mt-2" />

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span
          className={
            pending > 0 ? "font-semibold text-amber-700" : "text-slate-500"
          }
        >
          {pending} pending
        </span>
        <span className="truncate text-slate-500">
          Requested {formatNumber(budget.total_requested_quantity)}
        </span>
      </div>
    </button>
  );
}

function getDifferenceMeta(requestedQuantity, approvedQuantity) {
  if (
    approvedQuantity === null ||
    approvedQuantity === undefined ||
    approvedQuantity === ""
  ) {
    return {
      value: null,
      label: "—",
      className: "text-slate-400",
      icon: Minus,
    };
  }

  const requested = Number(requestedQuantity || 0);
  const approved = Number(approvedQuantity || 0);
  const difference = approved - requested;

  if (difference > 0) {
    return {
      value: difference,
      label: `+${formatNumber(difference)}`,
      className: "text-blue-700",
      icon: TrendingUp,
    };
  }

  if (difference < 0) {
    return {
      value: difference,
      label: formatNumber(difference),
      className: approved === 0 ? "text-rose-700" : "text-amber-700",
      icon: TrendingDown,
    };
  }

  return {
    value: 0,
    label: "0",
    className: "text-slate-700",
    icon: Minus,
  };
}

function getDistributionLabel(method) {
  const labels = {
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    CUSTOM: "Custom",
    ANNUAL: "Annual",
  };

  return (
    labels[method] || String(method || "Distribution").replaceAll("_", " ")
  );
}

function getDistributionPeriodLabel(row) {
  const periodType = String(row.period_type || "Period").toUpperCase();

  if (periodType === "MONTH") return `Month ${row.period_no}`;
  if (periodType === "QUARTER") return `Quarter ${row.period_no}`;
  if (periodType === "YEAR") return "Annual";
  return `${periodType} ${row.period_no}`;
}

function DistributionGrid({ rows = [] }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        No distribution rows were submitted for this item.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div
          key={`${row.period_type}-${row.period_no}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
        >
          <span className="text-xs font-semibold text-slate-500">
            {getDistributionPeriodLabel(row)}
          </span>
          <span className="text-sm font-bold text-slate-900">
            {formatNumber(row.quantity)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CollapsiblePanel({ open, id, children }) {
  const [rendered, setRendered] = useState(open);
  const [height, setHeight] = useState(open ? "auto" : 0);
  const innerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const closeTimerRef = useRef(null);

  useLayoutEffect(() => {
    if (open) {
      setRendered(true);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!rendered) return undefined;

    const node = innerRef.current;
    if (!node) return undefined;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setHeight(0);

      animationFrameRef.current = requestAnimationFrame(() => {
        setHeight(node.scrollHeight);
      });
    } else {
      const currentHeight =
        node.getBoundingClientRect().height || node.scrollHeight;

      setHeight(currentHeight);

      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = requestAnimationFrame(() => {
          setHeight(0);
        });
      });

      closeTimerRef.current = window.setTimeout(() => {
        setRendered(false);
      }, 320);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, rendered]);

  function handleTransitionEnd(event) {
    if (
      event.target !== event.currentTarget ||
      event.propertyName !== "height"
    ) {
      return;
    }

    if (open) {
      setHeight("auto");
      return;
    }

    setRendered(false);
  }

  return (
    <div
      id={id}
      aria-hidden={!open}
      onTransitionEnd={handleTransitionEnd}
      className={classNames(
        "overflow-hidden transition-[height,opacity] duration-300 ease-out motion-reduce:transition-none",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      style={{ height: rendered ? height : 0 }}
    >
      {rendered && <div ref={innerRef}>{children}</div>}
    </div>
  );
}

function areReviewItemRowPropsEqual(previous, next) {
  return (
    previous.item === next.item &&
    previous.expanded === next.expanded &&
    previous.dirty === next.dirty &&
    previous.locked === next.locked &&
    previous.saving === next.saving &&
    String(previous.draft.category_approved_quantity ?? "") ===
      String(next.draft.category_approved_quantity ?? "") &&
    String(previous.draft.review_note || "") ===
      String(next.draft.review_note || "")
  );
}

const ReviewItemRow = memo(function ReviewItemRow({
  item,
  expanded,
  draft,
  dirty,
  locked,
  saving,
  onToggle,
  onDraftChange,
  onSave,
  onSaveAndNext,
}) {
  const difference = getDifferenceMeta(
    item.requested_quantity,
    draft.category_approved_quantity,
  );
  const DifferenceIcon = difference.icon;
  const approvedValue = draft.category_approved_quantity;
  const approvedNumber = Number(approvedValue);
  const approvedIsValid =
    approvedValue !== "" &&
    Number.isFinite(approvedNumber) &&
    approvedNumber >= 0;
  const decisionCompleted = item.review_status === "CATEGORY_REVIEW_COMPLETED";
  const saveDisabled =
    locked || saving || !approvedIsValid || (decisionCompleted && !dirty);
  const distributionTotal = (item.distribution || []).reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0,
  );
  const panelId = `category-review-item-panel-${item.id}`;

  return (
    <article
      className={classNames(
        "border-b border-slate-100 last:border-b-0",
        dirty && "bg-blue-50/20",
      )}
    >
      <div className="grid items-center gap-3 px-4 py-4 lg:grid-cols-[minmax(220px,1.7fr)_110px_110px_110px_150px_92px]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="group flex min-w-0 items-center gap-3 text-left focus-visible:outline-none"
        >
          <span
            className={classNames(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
              expanded
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 group-hover:border-blue-200 group-hover:text-blue-700",
            )}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-950">
              {item.catalog_item_name}
            </span>
            <span className="mt-1 block truncate text-xs text-slate-500">
              {item.expense_type || "Expense"} ·{" "}
              {getDistributionLabel(item.distribution_method)} ·{" "}
              {formatNumber(distributionTotal)} distributed
            </span>
          </span>
        </button>

        <div className="flex items-center justify-between lg:block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
            Requested
          </span>
          <span className="text-sm font-bold text-slate-900">
            {formatNumber(item.requested_quantity)}
          </span>
        </div>

        <div className="flex items-center justify-between lg:block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
            Approved
          </span>
          <span className="text-sm font-bold text-slate-900">
            {item.category_approved_quantity === null
              ? "—"
              : formatNumber(item.category_approved_quantity)}
          </span>
        </div>

        <div className="flex items-center justify-between lg:block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
            Difference
          </span>
          <span
            className={classNames(
              "inline-flex items-center gap-1 text-sm font-bold",
              difference.className,
            )}
          >
            <DifferenceIcon className="h-3.5 w-3.5" />
            {difference.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 lg:block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
            Status
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.review_status} compact />
            {dirty && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                Unsaved
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {decisionCompleted ? "View / Edit" : "Review"}
        </button>
      </div>

      <CollapsiblePanel open={expanded} id={panelId}>
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-5">
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <section>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Department Request
                  </p>
                  <h4 className="mt-1 text-base font-bold text-slate-950">
                    Original request and distribution
                  </h4>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Requested Quantity
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-slate-950">
                    {formatNumber(item.requested_quantity)}{" "}
                    {item.unit_code || ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {getDistributionLabel(item.distribution_method)}{" "}
                      distribution
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.distribution?.length || 0} period
                      {(item.distribution?.length || 0) === 1 ? "" : "s"} ·
                      Total {formatNumber(distributionTotal)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Read only
                  </span>
                </div>
                <DistributionGrid rows={item.distribution} />
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                    Category Decision
                  </p>
                  <h4 className="mt-1 text-base font-bold text-slate-950">
                    Approve the final quantity
                  </h4>
                </div>
                {saving && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    Saving…
                  </span>
                )}
              </div>

              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Approved quantity
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  disabled={locked || saving}
                  value={approvedValue ?? ""}
                  onChange={(event) =>
                    onDraftChange({
                      category_approved_quantity: event.target.value,
                    })
                  }
                  className="min-w-0 flex-1 text-sm font-semibold"
                />
                <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600">
                  {item.unit_code || "Unit"}
                </span>
              </div>

              {!approvedIsValid && !locked && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  Enter a valid approved quantity of zero or more.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={locked || saving}
                  onClick={() =>
                    onDraftChange({
                      category_approved_quantity: item.requested_quantity,
                    })
                  }
                  className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve requested
                </button>
                <button
                  type="button"
                  disabled={locked || saving}
                  onClick={() =>
                    onDraftChange({
                      category_approved_quantity: 0,
                    })
                  }
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Set to 0
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Difference from request
                  </span>
                  <span
                    className={classNames(
                      "inline-flex items-center gap-1 text-sm font-bold",
                      difference.className,
                    )}
                  >
                    <DifferenceIcon className="h-3.5 w-3.5" />
                    {difference.label}
                  </span>
                </div>
              </div>

              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Review note
              </label>
              <Input
                multiline
                rows={4}
                disabled={locked || saving}
                value={draft.review_note || ""}
                onChange={(event) =>
                  onDraftChange({
                    review_note: event.target.value,
                  })
                }
                placeholder="Optional explanation for the approved quantity"
                className="mt-1.5 text-sm"
              />

              {item.reviewed_by_name && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Last reviewed by <strong>{item.reviewed_by_name}</strong> on{" "}
                    {formatDateTime(item.reviewed_at)}
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={saveDisabled}
                  onClick={onSave}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <Save className="h-4 w-4" />
                  Save Decision
                </button>
                <button
                  type="button"
                  disabled={saveDisabled}
                  onClick={onSaveAndNext}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Save &amp; Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {locked && (
                <p className="mt-3 text-center text-xs font-semibold text-slate-500">
                  This department review is complete and read-only.
                </p>
              )}
            </section>
          </div>
        </div>
      </CollapsiblePanel>
    </article>
  );
}, areReviewItemRowPropsEqual);

export default function CategoryReviewPage() {
  const queryClient = useQueryClient();
  const { budgetAccess } = useAuth();

  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [decisionDrafts, setDecisionDrafts] = useState({});
  const [savingItemIds, setSavingItemIds] = useState([]);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [windowModal, setWindowModal] = useState(null);
  const [closeReason, setCloseReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const initializedBudgetIdRef = useRef(null);

  const queueQuery = useQuery({
    queryKey: ["category-review", "queue"],
    queryFn: getCategoryReviewQueue,
  });

  const budgets = useMemo(
    () => queueQuery.data?.budgets || [],
    [queueQuery.data?.budgets],
  );

  const selectedBudgetIdResolved = useMemo(() => {
    const selectedStillExists = budgets.some(
      (budget) => Number(budget.id) === Number(selectedBudgetId),
    );

    if (selectedStillExists) return selectedBudgetId;
    return budgets[0]?.id || null;
  }, [budgets, selectedBudgetId]);

  const detailQuery = useQuery({
    queryKey: ["category-review", "budget", selectedBudgetIdResolved],
    queryFn: () => getCategoryReviewBudget(selectedBudgetIdResolved),
    enabled: Boolean(selectedBudgetIdResolved),
  });

  const selectedBudget = detailQuery.data;
  const submissionWindow = queueQuery.data?.submissionWindow || null;

  const canReviewItems = can(
    budgetAccess,
    PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS,
  );
  const canControlSubmissionWindow = can(
    budgetAccess,
    PERMISSION_CODES.CONTROL_CATEGORY_SUBMISSION_WINDOW,
  );

  const reopenReviewMutation = useMutation({
    mutationFn: reopenDepartmentCategoryReview,

    onSuccess: async (data) => {
      toast.success("Department review returned to In Review");

      queryClient.setQueryData(
        ["category-review", "budget", selectedBudgetIdResolved],
        data,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["category-review", "queue"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["category-packages"],
        }),
      ]);

      setExpandedItemId(data?.items?.[0]?.id || null);
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to return department review to In Review",
      );
    },
  });

  const reviewIsInProgress = selectedBudget?.status === "IN_CATEGORY_REVIEW";

  const reviewIsCompleted =
    selectedBudget?.status === "CATEGORY_REVIEW_COMPLETED";

  const canReopenDepartmentReview =
    canReviewItems &&
    reviewIsCompleted &&
    selectedBudget?.can_reopen_review === true;

  const activeCategoryName =
    selectedBudget?.category_name ||
    budgets[0]?.category_name ||
    budgetAccess?.category?.name ||
    budgetAccess?.budgetCategory?.name ||
    "Assigned Category";

  const financialYear =
    selectedBudget?.financial_year ||
    budgets[0]?.financial_year ||
    submissionWindow?.financial_year ||
    "—";

  const overview = useMemo(() => {
    const result = budgets.reduce(
      (accumulator, budget) => {
        accumulator.departmentsInReview +=
          budget.status === "IN_CATEGORY_REVIEW" ? 1 : 0;
        accumulator.departmentsCompleted +=
          budget.status === "CATEGORY_REVIEW_COMPLETED" ? 1 : 0;
        accumulator.itemsPending += Number(budget.pending_count || 0);
        accumulator.itemsReviewed += Number(budget.reviewed_count || 0);
        accumulator.itemsTotal += Number(budget.item_count || 0);
        accumulator.totalRequested += Number(
          budget.total_requested_quantity || 0,
        );
        accumulator.totalApproved += Number(
          budget.total_approved_quantity || 0,
        );
        return accumulator;
      },
      {
        departmentsInReview: 0,
        departmentsCompleted: 0,
        itemsPending: 0,
        itemsReviewed: 0,
        itemsTotal: 0,
        totalRequested: 0,
        totalApproved: 0,
      },
    );

    result.progress =
      result.itemsTotal > 0
        ? (result.itemsReviewed / result.itemsTotal) * 100
        : 0;

    return result;
  }, [budgets]);

  const filterCounts = useMemo(
    () => ({
      ALL: budgets.length,
      IN_CATEGORY_REVIEW: budgets.filter(
        (budget) => budget.status === "IN_CATEGORY_REVIEW",
      ).length,
      CATEGORY_REVIEW_COMPLETED: budgets.filter(
        (budget) => budget.status === "CATEGORY_REVIEW_COMPLETED",
      ).length,
    }),
    [budgets],
  );

  const filteredBudgets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return budgets
      .filter((budget) => {
        const matchesSearch =
          !normalizedSearch ||
          String(budget.department_name || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(budget.department_code || "")
            .toLowerCase()
            .includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "ALL" || budget.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const leftCompleted = left.status === "CATEGORY_REVIEW_COMPLETED";
        const rightCompleted = right.status === "CATEGORY_REVIEW_COMPLETED";

        if (leftCompleted !== rightCompleted) {
          return leftCompleted ? 1 : -1;
        }

        const pendingDifference =
          Number(right.pending_count || 0) - Number(left.pending_count || 0);

        if (pendingDifference !== 0) return pendingDifference;

        return String(left.department_name || "").localeCompare(
          String(right.department_name || ""),
        );
      });
  }, [budgets, search, statusFilter]);

  const decisionMutation = useMutation({
    mutationFn: saveCategoryReviewItemDecision,
  });

  const completeMutation = useMutation({
    mutationFn: completeDepartmentCategoryReview,

    onSuccess: async (data) => {
      toast.success("Department category review completed");
      setCompleteModalOpen(false);

      queryClient.setQueryData(
        ["category-review", "budget", selectedBudgetIdResolved],
        data,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["category-review", "queue"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["category-packages"],
        }),
      ]);

      const completedItemIds = new Set(
        (data?.items || []).map((item) => String(item.id)),
      );

      setDecisionDrafts((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([itemId]) => !completedItemIds.has(String(itemId)),
          ),
        ),
      );
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to complete review",
      );
    },
  });

  const closeWindowMutation = useMutation({
    mutationFn: closeCategorySubmissionWindow,
    onSuccess: () => {
      toast.success("Category submission window closed");
      setWindowModal(null);
      setCloseReason("");
      queryClient.invalidateQueries({ queryKey: ["category-review", "queue"] });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to close category submission window",
      );
    },
  });

  const reopenWindowMutation = useMutation({
    mutationFn: reopenCategorySubmissionWindow,
    onSuccess: () => {
      toast.success("Category submission window reopened");
      setWindowModal(null);
      setReopenReason("");
      queryClient.invalidateQueries({ queryKey: ["category-review", "queue"] });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to reopen category submission window",
      );
    },
  });

  useEffect(() => {
    const budgetId = selectedBudget?.id;

    if (!budgetId) return;

    if (Number(initializedBudgetIdRef.current) === Number(budgetId)) {
      return;
    }

    initializedBudgetIdRef.current = budgetId;

    const items = selectedBudget?.items || [];
    const firstPending = items.find(
      (item) => item.review_status !== "CATEGORY_REVIEW_COMPLETED",
    );

    setExpandedItemId(firstPending?.id || items[0]?.id || null);
  }, [selectedBudget?.id, selectedBudget?.items]);

  function getBaseDraft(item) {
    return {
      category_approved_quantity:
        item.category_approved_quantity ?? item.requested_quantity,
      review_note: item.review_note || "",
    };
  }

  function getDraft(item) {
    return {
      ...getBaseDraft(item),
      ...(decisionDrafts[item.id] || {}),
    };
  }

  function updateDraft(item, patch) {
    setDecisionDrafts((current) => ({
      ...current,
      [item.id]: {
        ...getBaseDraft(item),
        ...(current[item.id] || {}),
        ...patch,
      },
    }));
  }

  function isDraftDirty(item) {
    const storedDraft = decisionDrafts[item.id];
    if (!storedDraft) return false;

    const baseline = getBaseDraft(item);
    const currentApproved = Number(storedDraft.category_approved_quantity);
    const baselineApproved = Number(baseline.category_approved_quantity);

    return (
      currentApproved !== baselineApproved ||
      String(storedDraft.review_note || "") !==
        String(baseline.review_note || "")
    );
  }

  function removeDecisionDraft(itemId) {
    setDecisionDrafts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }

  async function saveDecision(item, { advance = false } = {}) {
    const draft = getDraft(item);
    const approvedQuantity = Number(draft.category_approved_quantity);

    if (!Number.isFinite(approvedQuantity) || approvedQuantity < 0) {
      toast.error("Approved quantity must be zero or greater");
      return;
    }

    const budgetId =
      item.department_category_budget_id || selectedBudgetIdResolved;

    setSavingItemIds((current) => [...new Set([...current, item.id])]);

    try {
      const data = await decisionMutation.mutateAsync({
        itemId: item.id,
        payload: {
          category_approved_quantity: approvedQuantity,
          review_note: String(draft.review_note || "").trim(),
        },
      });

      toast.success("Review decision saved");
      removeDecisionDraft(item.id);
      queryClient.setQueryData(["category-review", "budget", budgetId], data);
      queryClient.invalidateQueries({ queryKey: ["category-review", "queue"] });

      if (advance) {
        const items = data?.items || [];
        const currentIndex = items.findIndex(
          (currentItem) => Number(currentItem.id) === Number(item.id),
        );
        const nextItem =
          currentIndex >= 0 && currentIndex < items.length - 1
            ? items[currentIndex + 1]
            : null;

        if (nextItem) {
          setExpandedItemId(nextItem.id);
        } else {
          setExpandedItemId(item.id);
          toast.success("This is the last item in the department");
        }
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save review decision",
      );
    } finally {
      setSavingItemIds((current) =>
        current.filter((itemId) => Number(itemId) !== Number(item.id)),
      );
    }
  }

  function openNextPendingItem() {
    const items = selectedBudget?.items || [];
    if (!items.length) return;

    const currentIndex = items.findIndex(
      (item) => Number(item.id) === Number(expandedItemId),
    );
    const orderedCandidates = [
      ...items.slice(currentIndex + 1),
      ...items.slice(0, Math.max(0, currentIndex)),
    ];
    const nextPending = orderedCandidates.find(
      (item) => item.review_status !== "CATEGORY_REVIEW_COMPLETED",
    );

    if (nextPending) {
      setExpandedItemId(nextPending.id);
    } else {
      toast.success("No pending items remain in this department");
    }
  }

  const selectedItemCount = Number(selectedBudget?.summary?.item_count || 0);
  const selectedReviewedCount = Number(
    selectedBudget?.summary?.reviewed_count || 0,
  );
  const selectedPendingCount = Number(
    selectedBudget?.summary?.pending_count || 0,
  );
  const selectedProgress =
    selectedItemCount > 0
      ? (selectedReviewedCount / selectedItemCount) * 100
      : 0;
  const selectedDifference =
    Number(selectedBudget?.summary?.total_approved_quantity || 0) -
    Number(selectedBudget?.summary?.total_requested_quantity || 0);

  const canComplete =
    canReviewItems &&
    selectedItemCount > 0 &&
    selectedReviewedCount === selectedItemCount &&
    selectedBudget?.status === "IN_CATEGORY_REVIEW";

  const selectedBudgetLocked =
    selectedBudget?.status !== "IN_CATEGORY_REVIEW" || !canReviewItems;

  const windowIsOpen = submissionWindow?.status === "OPEN";
  const windowMutationPending =
    closeWindowMutation.isPending || reopenWindowMutation.isPending;
  function reopenSelectedDepartmentReview() {
    if (!selectedBudget?.id || !selectedBudget?.row_version) {
      toast.error(
        "The department review data is incomplete. Refresh the page and try again.",
      );
      return;
    }

    reopenReviewMutation.mutate({
      departmentCategoryBudgetId: selectedBudget.id,

      rowVersion: selectedBudget.row_version,
    });
  }
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                  Category Manager Workspace
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {activeCategoryName} Department Review
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Review submitted department requests, record approved
                  quantities, and complete each department before package
                  preparation.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                FY {financialYear}
              </span>
              <StatusBadge status={submissionWindow?.status || "UNKNOWN"} />
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            <Metric
              icon={Building2}
              label="Departments in review"
              value={overview.departmentsInReview}
              helper={`${overview.departmentsCompleted} completed`}
              tone="amber"
            />
            <Metric
              icon={Clock3}
              label="Pending items"
              value={overview.itemsPending}
              helper={`${overview.itemsTotal} total`}
              tone="amber"
            />
            <Metric
              icon={CheckCircle2}
              label="Reviewed items"
              value={overview.itemsReviewed}
              helper={`${Math.round(overview.progress)}% complete`}
              tone="emerald"
            />
            <Metric
              icon={BarChart3}
              label="Approved demand"
              value={formatNumber(overview.totalApproved)}
              helper={`of ${formatNumber(overview.totalRequested)} requested`}
              tone="blue"
            />
          </div>
          <div className="border-t border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-500">
              <span>Overall category review progress</span>
              <span>{Math.round(overview.progress)}%</span>
            </div>
            <ProgressBar value={overview.progress} className="mt-2" />
          </div>
        </section>

        <section
          className={classNames(
            "rounded-2xl border px-4 py-4 shadow-sm sm:px-5",
            windowIsOpen
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-rose-200 bg-rose-50/70",
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={classNames(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  windowIsOpen
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700",
                )}
              >
                {windowIsOpen ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-950">
                    Category Submission Window
                  </h2>
                  <StatusBadge
                    status={submissionWindow?.status || "UNKNOWN"}
                    compact
                  />
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {windowIsOpen
                    ? `Departments can still submit ${activeCategoryName} category budgets. Reviews may continue while submissions remain open.`
                    : `New ${activeCategoryName} submissions are blocked. Category Manager review of already submitted departments can continue.`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {windowIsOpen
                    ? submissionWindow?.reopened_at
                      ? `Last reopened by ${submissionWindow.reopened_by_name || "—"} on ${formatDateTime(submissionWindow.reopened_at)}`
                      : "The category window has not been reopened during this cycle."
                    : `Closed by ${submissionWindow?.closed_by_name || "—"} on ${formatDateTime(submissionWindow?.closed_at)}`}
                </p>
              </div>
            </div>

            {canControlSubmissionWindow && (
              <button
                type="button"
                disabled={!submissionWindow || windowMutationPending}
                onClick={() =>
                  setWindowModal(windowIsOpen ? "CLOSE" : "REOPEN")
                }
                className={classNames(
                  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white",
                  windowIsOpen
                    ? "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500",
                )}
              >
                {windowIsOpen ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {windowIsOpen ? "Close Submissions" : "Reopen Submissions"}
              </button>
            )}
          </div>
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    Department Queue
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {budgets.length} submitted department
                    {budgets.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {overview.itemsPending} pending
                </span>
              </div>

              <EnterpriseSearch
                className="mt-4"
                value={search}
                onChange={setSearch}
                placeholder="Search departments"
              />

              <div
                className="mt-3 grid grid-cols-3 rounded-xl bg-slate-100 p-1"
                role="group"
                aria-label="Filter departments by status"
              >
                {QUEUE_FILTERS.map((filter) => {
                  const active = statusFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatusFilter(filter.value)}
                      className={classNames(
                        "rounded-lg px-2 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        active
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {filter.label} {filterCounts[filter.value]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-[calc(100vh-300px)] min-h-[300px] overflow-y-auto">
              {queueQuery.isLoading && <LoadingRows count={5} />}

              {queueQuery.isError && (
                <div className="p-5 text-center">
                  <AlertCircle className="mx-auto h-6 w-6 text-rose-500" />
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    Could not load the review queue.
                  </p>
                  <button
                    type="button"
                    onClick={() => queueQuery.refetch()}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {!queueQuery.isLoading &&
                !queueQuery.isError &&
                filteredBudgets.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No departments match the current search and status filter.
                  </div>
                )}

              {!queueQuery.isLoading &&
                !queueQuery.isError &&
                filteredBudgets.map((budget) => (
                  <DepartmentQueueItem
                    key={budget.id}
                    budget={budget}
                    selected={
                      Number(budget.id) === Number(selectedBudgetIdResolved)
                    }
                    onSelect={() => {
                      setSelectedBudgetId(budget.id);
                      setExpandedItemId(null);
                    }}
                  />
                ))}
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!selectedBudgetIdResolved && !queueQuery.isLoading && (
              <EmptyState
                title="No department review selected"
                description="Submitted department category budgets will appear in the queue when they are ready for Category Manager review."
              />
            )}

            {selectedBudgetIdResolved && detailQuery.isLoading && (
              <div>
                <div className="border-b border-slate-200 p-5">
                  <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
                <LoadingRows count={6} />
              </div>
            )}

            {selectedBudgetIdResolved && detailQuery.isError && (
              <EmptyState
                icon={AlertCircle}
                title="Could not load this department review"
                description="Refresh the department details and try again. The queue remains available on the left."
              />
            )}

            {selectedBudget && (
              <>
                <div className="border-b border-slate-200 bg-white px-5 py-5">
                  <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-xl font-bold text-slate-950 sm:text-2xl">
                          {selectedBudget.department_name}
                        </h2>
                        <StatusBadge status={selectedBudget.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedBudget.department_code || "Department"} ·{" "}
                        {selectedBudget.category_name} · FY{" "}
                        {selectedBudget.financial_year}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:min-w-[520px]">
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Items
                        </p>
                        <p className="mt-0.5 text-base font-bold text-slate-950">
                          {selectedItemCount}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                          Reviewed
                        </p>
                        <p className="mt-0.5 text-base font-bold text-emerald-800">
                          {selectedReviewedCount}
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                          Pending
                        </p>
                        <p className="mt-0.5 text-base font-bold text-amber-800">
                          {selectedPendingCount}
                        </p>
                      </div>
                      <div className="rounded-xl bg-blue-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                          Difference
                        </p>
                        <p className="mt-0.5 text-base font-bold text-blue-800">
                          {selectedDifference > 0 ? "+" : ""}
                          {formatNumber(selectedDifference)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                      <span>
                        {selectedReviewedCount} of {selectedItemCount} item
                        decisions completed
                      </span>
                      <span>{Math.round(selectedProgress)}%</span>
                    </div>
                    <ProgressBar value={selectedProgress} className="mt-2" />
                  </div>
                </div>

                {selectedBudget.items?.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Department budget items
                      </p>
                      <button
                        type="button"
                        disabled={expandedItemId === null}
                        onClick={() => setExpandedItemId(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronsUp className="h-3.5 w-3.5" />
                        Collapse all
                      </button>
                    </div>

                    <div className="hidden grid-cols-[minmax(220px,1.7fr)_110px_110px_110px_150px_92px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid">
                      <span>Item</span>
                      <span>Requested</span>
                      <span>Approved</span>
                      <span>Difference</span>
                      <span>Status</span>
                      <span className="text-center">Action</span>
                    </div>

                    <div>
                      {selectedBudget.items.map((item) => (
                        <ReviewItemRow
                          key={item.id}
                          item={item}
                          expanded={Number(expandedItemId) === Number(item.id)}
                          draft={getDraft(item)}
                          dirty={isDraftDirty(item)}
                          locked={selectedBudgetLocked}
                          saving={savingItemIds.some(
                            (itemId) => Number(itemId) === Number(item.id),
                          )}
                          onToggle={() =>
                            setExpandedItemId((current) =>
                              Number(current) === Number(item.id)
                                ? null
                                : item.id,
                            )
                          }
                          onDraftChange={(patch) => updateDraft(item, patch)}
                          onSave={() => saveDecision(item)}
                          onSaveAndNext={() =>
                            saveDecision(item, { advance: true })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No active items"
                    description="This submitted department category budget does not contain any active items to review."
                  />
                )}

                <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={classNames(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          canComplete
                            ? "bg-emerald-100 text-emerald-700"
                            : canReopenDepartmentReview
                              ? "bg-amber-100 text-amber-700"
                              : reviewIsCompleted
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {canComplete ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : canReopenDepartmentReview ? (
                          <RotateCcw className="h-5 w-5" />
                        ) : reviewIsCompleted ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          {canComplete
                            ? "All item decisions are complete"
                            : reviewIsCompleted && canReopenDepartmentReview
                              ? "Department review is complete and can still be reopened"
                              : reviewIsCompleted
                                ? "Department review is locked"
                                : `${selectedPendingCount} item decision${
                                    selectedPendingCount === 1 ? "" : "s"
                                  } remaining`}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {canComplete
                            ? "Complete the department review to lock its Category Manager decisions."
                            : reviewIsCompleted && canReopenDepartmentReview
                              ? "The review is complete. You can return it to In Review and edit the saved decisions until the category package is submitted to CFO."
                              : reviewIsCompleted
                                ? "The category package has moved beyond the editable draft stage. Department decisions are locked."
                                : "Review every active item before completing this department category budget."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {selectedPendingCount > 0 && reviewIsInProgress && (
                        <button
                          type="button"
                          onClick={openNextPendingItem}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          Next Pending Item
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}

                      {reviewIsInProgress && (
                        <button
                          type="button"
                          disabled={!canComplete || completeMutation.isPending}
                          onClick={() => setCompleteModalOpen(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <Send className="h-4 w-4" />
                          Complete Department Review
                        </button>
                      )}

                      {canReopenDepartmentReview && (
                        <button
                          type="button"
                          disabled={reopenReviewMutation.isPending}
                          onClick={reopenSelectedDepartmentReview}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reopenReviewMutation.isPending ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}

                          {reopenReviewMutation.isPending
                            ? "Reopening..."
                            : "Return to In Review"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </section>

        <CategoryPackageWorkbench />
      </div>

      <ConfirmModal
        open={completeModalOpen}
        title="Complete Department Category Review"
        message={`Complete the ${selectedBudget?.category_name || "category"} review for ${selectedBudget?.department_name || "this department"}? The department will move to Review Completed and its current decisions will become read-only.`}
        confirmText="Complete Review"
        cancelText="Cancel"
        loading={completeMutation.isPending}
        onCancel={() => setCompleteModalOpen(false)}
        onConfirm={() => completeMutation.mutate(selectedBudget?.id)}
      >
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Completion summary
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white px-2 py-2">
              <p className="text-lg font-bold text-slate-950">
                {selectedItemCount}
              </p>
              <p className="text-[11px] font-semibold text-slate-500">Items</p>
            </div>
            <div className="rounded-lg bg-white px-2 py-2">
              <p className="text-lg font-bold text-emerald-700">
                {selectedReviewedCount}
              </p>
              <p className="text-[11px] font-semibold text-slate-500">
                Reviewed
              </p>
            </div>
            <div className="rounded-lg bg-white px-2 py-2">
              <p className="text-lg font-bold text-blue-700">
                {formatNumber(
                  selectedBudget?.summary?.total_approved_quantity || 0,
                )}
              </p>
              <p className="text-[11px] font-semibold text-slate-500">
                Approved
              </p>
            </div>
          </div>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={windowModal === "CLOSE"}
        title={`Close ${activeCategoryName} submissions?`}
        message={`Departments will no longer be able to submit ordinary ${activeCategoryName} category budgets for this financial year. Reviews already in progress can continue.`}
        confirmText="Close Submissions"
        cancelText="Cancel"
        danger
        loading={closeWindowMutation.isPending}
        onCancel={() => {
          setWindowModal(null);
          setCloseReason("");
        }}
        onConfirm={() =>
          closeWindowMutation.mutate({ closeReason: closeReason.trim() })
        }
      >
        <label className="mt-3 block text-sm font-bold text-slate-700">
          Close reason{" "}
          <span className="font-medium text-slate-400">optional</span>
        </label>
        <Input
          multiline
          rows={3}
          value={closeReason}
          onChange={(event) => setCloseReason(event.target.value)}
          placeholder="Explain why department submissions are closing"
          className="mt-1.5"
        />
      </ConfirmModal>

      <ConfirmModal
        open={windowModal === "REOPEN"}
        title={`Reopen ${activeCategoryName} submissions?`}
        message={`Departments will be allowed to submit ${activeCategoryName} category budgets again. A reason is required for audit and workflow history.`}
        confirmText="Reopen Submissions"
        cancelText="Cancel"
        loading={reopenWindowMutation.isPending}
        onCancel={() => {
          setWindowModal(null);
          setReopenReason("");
        }}
        onConfirm={() => {
          const reason = reopenReason.trim();

          if (!reason) {
            toast.error("A reopen reason is required");
            return;
          }

          reopenWindowMutation.mutate({ reopenReason: reason });
        }}
      >
        <label className="mt-3 block text-sm font-bold text-slate-700">
          Reopen reason
        </label>
        <Input
          multiline
          rows={4}
          value={reopenReason}
          onChange={(event) => setReopenReason(event.target.value)}
          placeholder="Explain why department submissions are being reopened"
          className="mt-1.5"
        />
      </ConfirmModal>
    </main>
  );
}
