import { Search } from "lucide-react";
import EnterpriseSearch from "../EnterpriseSearch";
import CfoReviewStatusBadge from "./CfoReviewStatusBadge";
import CurrencyText from "../CurrencyText";

export default function CfoPackageQueue({
  packages,
  selectedPackageId,
  search,
  onSearchChange,
  onSelectPackage,
}) {
  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Search size={16} />
          CFO package queue
        </div>
        <div className="mt-3">
          <EnterpriseSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Search packages"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No category packages match the current search.
          </div>
        ) : (
          packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelectPackage(pkg.id)}
              className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                Number(selectedPackageId) === Number(pkg.id)
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {pkg.category_name}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    FY {pkg.financial_year}
                  </div>
                </div>
                <CfoReviewStatusBadge status={pkg.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-500">Items</span>
                  <div className="font-bold text-slate-900">
                    {pkg.summary.package_items}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Value</span>
                  <div className="font-bold text-slate-900">
                    <CurrencyText compact value={pkg.summary.estimated_total} />
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Accepted</span>
                  <div className="font-bold text-emerald-700">
                    {pkg.summary.accepted_items}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Needs work</span>
                  <div className="font-bold text-amber-700">
                    {pkg.summary.needs_modification_items}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
