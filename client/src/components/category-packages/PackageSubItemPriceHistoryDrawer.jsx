import { ArrowRight, History, X } from "lucide-react";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CurrencyText from "../CurrencyText";
import LoadingSpinner from "../LoadingSpinner";
import PurchasingPriceStatusBadge from "../purchasing-price-review/PurchasingPriceStatusBadge";

function Comparison({ label, before, after, currency = false }) {
  const renderValue = (value, firstLabel = false) => {
    if (value === null || value === undefined) {
      return firstLabel ? "First review" : "Not recorded";
    }
    return currency ? <CurrencyText value={value} /> : value;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-3 text-base font-black text-slate-950">
        <span className="min-w-0">{renderValue(before, true)}</span>
        <ArrowRight size={16} className="shrink-0 text-slate-400" />
        <span className="min-w-0 text-violet-700">
          {renderValue(after)}
        </span>
      </div>
    </div>
  );
}

export default function PackageSubItemPriceHistoryDrawer({
  open,
  onClose,
  subItem,
  query,
}) {
  const rounds = query.data || [];

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <header className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-violet-700">
              <History size={18} />
              <span className="text-xs font-black uppercase">
                Price review history
              </span>
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {subItem?.name || "Package model"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Quantity and price snapshots recorded for each Purchasing review round.
            </p>
          </div>
          <button
            type="button"
            title="Close history"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {query.isLoading ? (
            <LoadingSpinner fill />
          ) : query.isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 font-bold text-rose-700">
              {query.error?.response?.data?.message ||
                "Failed to load price history"}
            </div>
          ) : rounds.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
              <History className="mx-auto text-slate-400" size={32} />
              <p className="mt-3 font-black text-slate-900">
                No price-review history yet
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                History will appear after this model enters its first Purchasing review round.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {rounds.map((round) => (
                <section
                  key={round.id}
                  className="rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div>
                      <h3 className="font-black text-slate-950">
                        Review round {round.review_round}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {round.reviewed_by_name || "Decision pending"}
                        {round.reviewed_at
                          ? ` · ${new Date(round.reviewed_at).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <PurchasingPriceStatusBadge status={round.status} />
                      <PurchasingPriceStatusBadge
                        status={round.decision_source}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 p-5 md:grid-cols-3">
                    <Comparison
                      label="Quantity"
                      before={round.quantity.before}
                      after={round.quantity.after}
                    />
                    <Comparison
                      label="Manager proposed price"
                      before={round.category_manager_price.before}
                      after={round.category_manager_price.after}
                      currency
                    />
                    <Comparison
                      label="Purchasing price"
                      before={round.purchasing_price.before}
                      after={round.purchasing_price.after}
                      currency
                    />
                  </div>
                  <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                    <p>
                      Category Manager submission: {round.manager_submitted_by_name || "Not recorded"}
                      {round.manager_submitted_at
                        ? ` · ${new Date(round.manager_submitted_at).toLocaleString()}`
                        : ""}
                    </p>
                    <p className="sm:text-right">
                      Purchasing decision: {round.reviewed_by_name || "Pending"}
                      {round.reviewed_at
                        ? ` · ${new Date(round.reviewed_at).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </AnimatedDrawer>
  );
}
