import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

export function normalizeQuantity(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function formatQuantity(value) {
  const number = normalizeQuantity(value);

  if (number === null) {
    return "-";
  }

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

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

  if (reviewStatus !== "CATEGORY_REVIEW_COMPLETED" || approved === null) {
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

export function formatDifference(value) {
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
