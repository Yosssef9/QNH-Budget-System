const STATUS_STYLES = {
  IN_CFO_REVIEW: "border-blue-200 bg-blue-50 text-blue-700",
  RETURNED_BY_CFO: "border-amber-200 bg-amber-50 text-amber-700",
  CFO_REVIEW_COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING_CFO_REVIEW: "border-slate-200 bg-slate-50 text-slate-700",
  CFO_ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEEDS_MODIFICATION: "border-amber-200 bg-amber-50 text-amber-700",
  RECONCILED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SHORT: "border-amber-200 bg-amber-50 text-amber-700",
  EXCESS: "border-red-200 bg-red-50 text-red-700",
  NEEDS_RECONCILIATION: "border-amber-200 bg-amber-50 text-amber-700",
  NOT_CONFIGURED: "border-slate-200 bg-slate-50 text-slate-700",
};

const STATUS_LABELS = {
  IN_CFO_REVIEW: "In CFO review",
  RETURNED_BY_CFO: "Returned to Category Manager",
  CFO_REVIEW_COMPLETED: "CFO review completed",
  PENDING_CFO_REVIEW: "Pending CFO review",
  CFO_ACCEPTED: "Accepted",
  NEEDS_MODIFICATION: "Needs modification",
  RECONCILED: "Reconciled",
  SHORT: "Short",
  EXCESS: "Excess",
  NEEDS_RECONCILIATION: "Needs reconciliation",
  NOT_CONFIGURED: "Not configured",
};

export default function CfoReviewStatusBadge({ status }) {
  const normalized = status || "PENDING_CFO_REVIEW";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
        STATUS_STYLES[normalized] || "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {STATUS_LABELS[normalized] || String(normalized).replaceAll("_", " ")}
    </span>
  );
}
