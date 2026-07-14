export default function AnalyticsMetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <div className="mt-2 min-w-0 text-2xl font-black tracking-tight text-slate-950">
            <span className="block break-words">{value}</span>
          </div>
        </div>

        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={18} />
          </div>
        )}
      </div>

      {hint && (
        <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
