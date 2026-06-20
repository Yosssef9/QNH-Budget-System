const statusStyles = {
  WITHIN_BENCHMARK: {
    label: "Within Benchmark",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REVIEW_PRICE: {
    label: "Review Price",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  SIGNIFICANT_VARIANCE: {
    label: "Significant Variance",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  HIGH_OVERSPEND_RISK: {
    label: "High Overspend Risk",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  NO_BENCHMARK_AVAILABLE: {
    label: "No Benchmark Available",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

export default function PriceIntelligenceStatusBadge({ status, label }) {
  const style = statusStyles[status] || statusStyles.NO_BENCHMARK_AVAILABLE;

  return (
    <span
      className={[
        "inline-flex max-w-[180px] items-center justify-center rounded-full border px-2.5 py-1 text-center text-[11px] font-bold leading-4",
        style.className,
      ].join(" ")}
    >
      {label || style.label}
    </span>
  );
}
