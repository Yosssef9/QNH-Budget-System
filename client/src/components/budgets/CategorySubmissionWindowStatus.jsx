import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
} from "lucide-react";

import { formatDateTime } from "../../utils/dateFormatters";

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function formatWorkflowStatus(value) {
  return normalizeStatus(value).replaceAll("_", " ") || "UNKNOWN";
}

export function getCategorySubmissionWindowState(
  categoryBudget,
  financialYearStatus,
) {
  const yearStatus = normalizeStatus(financialYearStatus);
  const windowStatus = normalizeStatus(
    categoryBudget?.submission_window_status ||
      categoryBudget?.submission_window?.status ||
      "NOT_CONFIGURED",
  );

  if (yearStatus !== "OPEN") {
    return {
      key: "FINANCIAL_YEAR_NOT_OPEN",
      canSubmit: false,
      shortLabel: "Window Closed",
      title: "Standard submissions are closed",
      description:
        yearStatus === "PRE_CLOSING"
          ? "The financial year is in PRE_CLOSING. You can review the saved budget, but ordinary category submission is no longer available. Use Request Adjustment when a post-closing change is required."
          : `The financial year is ${formatWorkflowStatus(
              yearStatus,
            )}. Ordinary category submission is not available.`,
      blockedMessage:
        "This category cannot be submitted because the financial year is not OPEN.",
      Icon: Clock3,
      badgeClassName:
        "border-amber-200 bg-amber-50 text-amber-800",
      bannerClassName:
        "border-amber-200 bg-amber-50 text-amber-950",
      iconClassName: "bg-amber-100 text-amber-700",
    };
  }

  if (windowStatus === "OPEN") {
    return {
      key: "OPEN",
      canSubmit: true,
      shortLabel: "Window Open",
      title: "Submission window is open",
      description:
        "You can add or update items, save the draft, and submit this category budget to the Category Manager.",
      blockedMessage: "",
      Icon: CheckCircle2,
      badgeClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      bannerClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-950",
      iconClassName: "bg-emerald-100 text-emerald-700",
    };
  }

  if (windowStatus === "CLOSED") {
    return {
      key: "CLOSED",
      canSubmit: false,
      shortLabel: "Window Closed",
      title: "Submission window is closed",
      description:
        "You can continue editing and saving this draft, but you cannot submit it until the Category Manager reopens the category submission window.",
      blockedMessage:
        "This category submission window is closed. Save your draft and submit it after the Category Manager reopens the window.",
      Icon: LockKeyhole,
      badgeClassName: "border-red-200 bg-red-50 text-red-700",
      bannerClassName: "border-red-200 bg-red-50 text-red-950",
      iconClassName: "bg-red-100 text-red-700",
    };
  }

  return {
    key: "NOT_CONFIGURED",
    canSubmit: false,
    shortLabel: "Window Unavailable",
    title: "Submission window is unavailable",
    description:
      "No submission window is configured for this category and financial year. You can save a draft, but submission is unavailable until the budget administrator configures the window.",
    blockedMessage:
      "No submission window is configured for this category and financial year.",
    Icon: AlertTriangle,
    badgeClassName:
      "border-slate-300 bg-slate-100 text-slate-700",
    bannerClassName:
      "border-slate-300 bg-slate-100 text-slate-900",
    iconClassName: "bg-slate-200 text-slate-700",
  };
}

export function CategorySubmissionWindowBadge({
  categoryBudget,
  financialYearStatus,
}) {
  const state = getCategorySubmissionWindowState(
    categoryBudget,
    financialYearStatus,
  );
  const StatusIcon = state.Icon;

  return (
    <span
      title={state.title}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${state.badgeClassName}`}
    >
      <StatusIcon size={13} aria-hidden="true" />
      {state.shortLabel}
    </span>
  );
}

function getWindowActivityText(categoryBudget, state) {
  const windowInfo = categoryBudget?.submission_window;

  if (!windowInfo) {
    return null;
  }

  if (state.key === "CLOSED" && windowInfo.closed_at) {
    return `Closed by ${
      windowInfo.closed_by_name || "Category Manager"
    } on ${formatDateTime(windowInfo.closed_at)}`;
  }

  if (state.key === "OPEN" && windowInfo.reopened_at) {
    return `Last reopened by ${
      windowInfo.reopened_by_name || "Category Manager"
    } on ${formatDateTime(windowInfo.reopened_at)}`;
  }

  return null;
}

export function CategorySubmissionWindowBanner({
  categoryBudget,
  financialYearStatus,
}) {
  if (!categoryBudget) {
    return null;
  }

  const state = getCategorySubmissionWindowState(
    categoryBudget,
    financialYearStatus,
  );
  const StatusIcon = state.Icon;
  const activityText = getWindowActivityText(categoryBudget, state);
  const closeReason =
    state.key === "CLOSED"
      ? categoryBudget?.submission_window?.close_reason
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`mb-4 rounded-2xl border p-4 ${state.bannerClassName}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${state.iconClassName}`}
          >
            <StatusIcon size={20} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black">{state.title}</h3>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${state.badgeClassName}`}
              >
                <StatusIcon size={12} aria-hidden="true" />
                {state.shortLabel}
              </span>
            </div>

            <p className="mt-1 text-sm font-medium leading-6 opacity-80">
              <span className="font-black">
                {categoryBudget.category_name}:
              </span>{" "}
              {state.description}
            </p>

            {activityText && (
              <p className="mt-2 text-xs font-bold opacity-70">
                {activityText}
              </p>
            )}

            {closeReason && (
              <div className="mt-3 rounded-xl border border-red-200 bg-white/70 px-3 py-2 text-sm">
                <span className="font-black">Close reason:</span>{" "}
                {closeReason}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
