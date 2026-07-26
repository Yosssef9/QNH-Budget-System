import {
  ClipboardCheck,
  DoorOpen,
  PackageCheck,
} from "lucide-react";

import { createFinancialYearCard } from "./commonCards";

function formatWindowValue(windowStats) {
  return windowStats?.status || "No window";
}

function renderWindowStatusBadge(windowStats) {
  const status = formatWindowValue(windowStats);

  if (status === "OPEN") {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">
        Open
      </span>
    );
  }

  if (status === "CLOSED") {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-bold uppercase tracking-[0.12em] text-red-700">
        Closed
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600">
      {status}
    </span>
  );
}

function renderPackageStatusBadge(status) {
  const normalizedStatus = status || "DRAFT";

  const statusConfig = {
    DRAFT: {
      label: "Draft",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    },
    IN_CFO_REVIEW: {
      label: "Waiting for CFO",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    RETURNED_BY_CFO: {
      label: "Returned by CFO",
      className: "border-amber-300 bg-amber-50 text-amber-800",
    },
    CFO_REVIEW_COMPLETED: {
      label: "CFO Completed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
  };

  const config = statusConfig[normalizedStatus] || {
    label: normalizedStatus.replaceAll("_", " "),
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-[0.12em]",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}

function getPackageAction(packageStats) {
  const status = packageStats?.status || "DRAFT";
  const reconciliationCount = Number(
    packageStats?.items_needing_reconciliation || 0,
  );
  const modificationCount = Number(packageStats?.items_needing_modification || 0);

  if (status === "RETURNED_BY_CFO" || modificationCount > 0) {
    return {
      value: renderPackageStatusBadge(status),
      description:
        modificationCount > 0
          ? `${modificationCount} package item(s) need CFO-requested modification`
          : "CFO returned this package to your category workspace",
      highlight: "pending",
    };
  }

  if (reconciliationCount > 0) {
    return {
      value: renderPackageStatusBadge(status),
      description: `${reconciliationCount} package item(s) need reconciliation before CFO submission`,
      highlight: "pending",
    };
  }

  if (status === "DRAFT") {
    return {
      value: renderPackageStatusBadge(status),
      description: "Package is still being prepared by the Category Manager",
      highlight: null,
    };
  }

  if (status === "IN_CFO_REVIEW") {
    return {
      value: renderPackageStatusBadge(status),
      description: "Package has been submitted and is waiting for CFO review",
      highlight: null,
    };
  }

  if (status === "CFO_REVIEW_COMPLETED") {
    return {
      value: renderPackageStatusBadge(status),
      description: "CFO review is completed for this category package",
      highlight: null,
    };
  }

  return {
    value: renderPackageStatusBadge(status),
    description: "Current category package state",
    highlight: null,
  };
}

export function getCategoryManagerCards(_budgetAccess, dashboardData) {
  const categoryStats = dashboardData.dashboardStats?.categoryManager || {};
  const reviewStats = categoryStats.departmentReviews || {};
  const windowStats = categoryStats.submissionWindow || {};
  const packageStats = categoryStats.packageAction || {};
  const pendingReviews = Number(reviewStats.pending_department_reviews || 0);
  const pendingItems = Number(reviewStats.pending_item_decisions || 0);
  const packageAction = getPackageAction(packageStats);
  const submittedDepartments = Number(windowStats.submitted_departments || 0);
  const notSubmittedDepartments = Number(
    windowStats.not_submitted_departments || 0,
  );

  return [
    createFinancialYearCard(dashboardData.activeYear),
    {
      title: "Department Reviews",
      value: pendingReviews,
      description:
        pendingReviews > 0
          ? `${pendingItems} item decision(s) still need review`
          : "No submitted department category budgets are waiting for review",
      icon: ClipboardCheck,
      route: "/category-review",
      highlight: pendingReviews > 0 ? "pending" : null,
      show: true,
    },
    {
      title: "Submission Window",
      value: renderWindowStatusBadge(windowStats),
      description:
        windowStats?.status === "OPEN"
          ? `${submittedDepartments} submitted, ${notSubmittedDepartments} not submitted`
          : `${submittedDepartments} submitted before closure`,
      icon: DoorOpen,
      route: "/category-review",
      highlight: null,
      show: true,
    },
    {
      title: "Category Package Status",
      value: packageAction.value,
      description: packageAction.description,
      icon: PackageCheck,
      route: "/category-review",
      highlight: packageAction.highlight,
      show: true,
    },
  ].filter((item) => item.show);
}
