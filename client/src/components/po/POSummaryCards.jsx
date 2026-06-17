import { CheckCircle2, Clock3, FileText, PackageSearch } from "lucide-react";
import { toNumber } from "../../utils/number";

function POStatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}) {
  const styles = {
    default: {
      card: "border-slate-200 bg-white",
      icon: "bg-slate-100 text-slate-700",
      value: "text-slate-900",
    },
    pending: {
      card: "border-amber-200 bg-amber-50/50",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-700",
    },
    success: {
      card: "border-emerald-200 bg-emerald-50/50",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-700",
    },
    danger: {
      card: "border-rose-200 bg-rose-50/50",
      icon: "bg-rose-100 text-rose-700",
      value: "text-rose-700",
    },
  };

  return (
    <div
      className={`
        rounded-xl border
        px-4 py-3
        transition-all
        hover:shadow-sm
        ${styles[variant].card}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
            ${styles[variant].icon}
          `}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
              {title}
            </p>

            {variant === "pending" && value > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Action
              </span>
            )}
          </div>

          <div className="mt-1 flex items-end justify-between gap-2">
            <span
              className={`text-2xl font-bold leading-none ${styles[variant].value}`}
            >
              {value}
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function POSummaryCards({ availablePOs = [], myLinks = [] }) {
  const pendingLinks = myLinks.filter((item) => item.status === "PENDING");

  const approvedLinks = myLinks.filter((item) => item.status === "APPROVED");

  const rejectedLinks = myLinks.filter((item) => item.status === "REJECTED");

  const totalAvailableQty = availablePOs.reduce(
    (sum, item) => sum + toNumber(item.available_qty),
    0,
  );

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <POStatCard
        title="Available PO Records"
        value={availablePOs.length}
        description={`${totalAvailableQty} available quantity`}
        icon={PackageSearch}
      />

      <POStatCard
        title="Pending Requests"
        value={pendingLinks.length}
        description="Waiting for purchasing approval"
        icon={Clock3}
        variant="pending"
      />

      <POStatCard
        title="Approved Requests"
        value={approvedLinks.length}
        description="Linked to budget items"
        icon={CheckCircle2}
        variant="success"
      />

      <POStatCard
        title="Rejected Requests"
        value={rejectedLinks.length}
        description="Can be recreated later"
        icon={FileText}
        variant="danger"
      />
    </div>
  );
}
