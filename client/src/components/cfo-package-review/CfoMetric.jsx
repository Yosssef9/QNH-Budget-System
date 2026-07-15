import CurrencyText from "../CurrencyText";

export default function CfoMetric({ label, value, currency = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-slate-900">
        {currency ? <CurrencyText value={value || 0} /> : value}
      </div>
    </div>
  );
}
