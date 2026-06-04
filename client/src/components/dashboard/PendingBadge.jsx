export default function PendingBadge({ count, label = "Pending Request" }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />

      <span className="text-xs font-bold text-amber-700">
        {count} {label}
        {count > 1 ? "s" : ""}
      </span>
    </div>
  );
}
