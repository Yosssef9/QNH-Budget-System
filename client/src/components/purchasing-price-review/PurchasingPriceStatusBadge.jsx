const STATUS_STYLES = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CARRIED_FORWARD: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PURCHASING_REVIEW: "border-violet-200 bg-violet-50 text-violet-700",
  IN_CFO_REVIEW: "border-indigo-200 bg-indigo-50 text-indigo-700",
  CFO_REVIEW_COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RETURNED_BY_CFO: "border-amber-200 bg-amber-50 text-amber-800",
  NEEDS_MODIFICATION: "border-amber-200 bg-amber-50 text-amber-800",
  CFO_ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING_CFO_REVIEW: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export default function PurchasingPriceStatusBadge({ status, label }) {
  const value = String(status || "PENDING").toUpperCase();
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${
        STATUS_STYLES[value] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {label || value.replaceAll("_", " ")}
    </span>
  );
}
