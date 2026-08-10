import { Building2, CheckCircle2, Clock3 } from "lucide-react";
import EnterpriseSearch from "../EnterpriseSearch";
import PurchasingPriceStatusBadge from "./PurchasingPriceStatusBadge";

export default function PurchasingPackageQueue({
  packages,
  selectedPackageId,
  search,
  onSearchChange,
  onSelect,
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <p className="text-xs font-black uppercase text-violet-600">Category queue</p>
        <h2 className="mt-1 text-lg font-black text-slate-950">Submitted packages</h2>
        <EnterpriseSearch
          value={search}
          onChange={onSearchChange}
          placeholder="Search categories"
          className="mt-3"
          size="sm"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {packages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm font-semibold text-slate-500">
            No submitted category packages match the current filters.
          </div>
        ) : (
          packages.map((pkg) => {
            const selected = Number(pkg.id) === Number(selectedPackageId);
            const complete = Number(pkg.pending_price_count) === 0;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelect(pkg.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selected
                    ? "border-violet-400 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="shrink-0 text-violet-600" />
                      <span className="truncate font-black text-slate-900">
                        {pkg.category_name}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      FY {pkg.financial_year} | Round {pkg.purchasing_review_round}
                    </p>
                  </div>
                  {complete ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                  ) : (
                    <Clock3 size={18} className="shrink-0 text-amber-600" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <PurchasingPriceStatusBadge status={pkg.status} />
                  <span className="text-xs font-black text-slate-600">
                    {pkg.accepted_price_count} / {pkg.total_price_count} accepted
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        pkg.total_price_count
                          ? (Number(pkg.accepted_price_count) /
                              Number(pkg.total_price_count)) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
