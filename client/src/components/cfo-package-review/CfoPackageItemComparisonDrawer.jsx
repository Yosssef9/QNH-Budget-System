import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ArrowUp, Calculator, X } from "lucide-react";

import { getCfoPackageItemComparison } from "../../api/cfoPackageReview.api";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CurrencyText from "../CurrencyText";
import CfoReviewStatusBadge from "./CfoReviewStatusBadge";
import { formatDateTime } from "../../utils/dateFormatters";

function formatQuantity(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
  }).format(Number(value || 0));
}

function DirectionBadge({ direction, value, currency = false }) {
  const normalized = direction || "SAME";
  const styles = {
    INCREASED: "border-blue-200 bg-blue-50 text-blue-700",
    DECREASED: "border-amber-200 bg-amber-50 text-amber-700",
    SAME: "border-slate-200 bg-slate-50 text-slate-600",
  };
  const icons = {
    INCREASED: ArrowUp,
    DECREASED: ArrowDown,
    SAME: ArrowRight,
  };
  const labels = {
    INCREASED: "Increased",
    DECREASED: "Decreased",
    SAME: "Same",
  };
  const Icon = icons[normalized] || ArrowRight;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${styles[normalized]}`}
    >
      <Icon size={13} />
      {labels[normalized]}
      {normalized !== "SAME" ? (
        <>
          {" "}
          {currency ? (
            <CurrencyText compact value={Math.abs(Number(value || 0))} />
          ) : (
            formatQuantity(Math.abs(Number(value || 0)))
          )}
        </>
      ) : null}
    </span>
  );
}

function ChangeStatusBadge({ status }) {
  const normalized = status || "UNCHANGED";
  const styles = {
    NEW: "border-blue-200 bg-blue-50 text-blue-700",
    REMOVED: "border-rose-200 bg-rose-50 text-rose-700",
    CHANGED: "border-amber-200 bg-amber-50 text-amber-700",
    UNCHANGED: "border-slate-200 bg-slate-50 text-slate-600",
  };
  const labels = {
    NEW: "New model",
    REMOVED: "Removed",
    CHANGED: "Changed",
    UNCHANGED: "Unchanged",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${styles[normalized] || styles.UNCHANGED}`}
    >
      {labels[normalized] || labels.UNCHANGED}
    </span>
  );
}

function ComparisonCard({
  label,
  before,
  after,
  change,
  direction,
  currency = false,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase text-slate-500">
                Before
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {currency ? <CurrencyText compact value={before} /> : formatQuantity(before)}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase text-blue-600">
                After
              </p>
              <p className="mt-1 text-2xl font-black text-blue-950">
                {currency ? <CurrencyText compact value={after} /> : formatQuantity(after)}
              </p>
            </div>
          </div>
        </div>
        <DirectionBadge direction={direction} value={change} currency={currency} />
      </div>
    </div>
  );
}

function ValueCell({ before, after, change, direction, currency = false }) {
  return (
    <div className="space-y-2 text-right">
      <div className="flex items-center justify-end gap-2 text-sm font-black text-slate-900">
        <span className="text-slate-500">
          {currency ? <CurrencyText compact value={before} /> : formatQuantity(before)}
        </span>
        <ArrowRight size={14} className="text-slate-400" />
        <span>
          {currency ? <CurrencyText compact value={after} /> : formatQuantity(after)}
        </span>
      </div>
      <DirectionBadge direction={direction} value={change} currency={currency} />
    </div>
  );
}

export default function CfoPackageItemComparisonDrawer({
  open,
  onClose,
  packageId,
  packageItem,
}) {
  const query = useQuery({
    queryKey: [
      "cfo-package-review",
      "package-item-comparison",
      packageId,
      packageItem?.id,
    ],
    queryFn: () =>
      getCfoPackageItemComparison({
        packageId,
        packageItemId: packageItem.id,
      }),
    enabled: open && Boolean(packageId) && Boolean(packageItem?.id),
  });

  const data = query.data || {};
  const summary = data.summary || {};
  const item = data.item || {};
  const subItems = data.sub_items || [];
  const hasNoReturnSnapshot =
    data.comparison_available === false && data.reason === "NO_RETURN_SNAPSHOT";

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-6 py-6 text-white">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                CFO item changes
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {summary.package_item_name ||
                  packageItem?.catalog_item_name ||
                  "Package item"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-white/10 px-3 py-1 text-blue-100">
                  {summary.category_name || "Category"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-blue-100">
                  FY {summary.financial_year || "-"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-blue-100">
                  {summary.package_item_code ||
                    packageItem?.catalog_item_code ||
                    "-"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/15"
              aria-label="Close CFO package item changes"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          {query.isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">
              Loading item changes...
            </div>
          ) : query.isError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm font-bold text-rose-700">
              Failed to load item changes.
            </div>
          ) : hasNoReturnSnapshot ? (
            <div className="rounded-3xl border border-blue-200 bg-white p-8 shadow-sm">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Calculator size={24} />
                </div>
                <h3 className="mt-5 text-2xl font-black text-slate-950">
                  No returned changes yet
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  This item has not been returned to the Category Manager, so
                  there are no before/after changes to compare yet.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-black">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {summary.category_name || "Category"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    FY {summary.financial_year || "-"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {summary.cfo_review_status || "CFO review"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                      Current CFO status
                    </p>
                    <div className="mt-2">
                      <CfoReviewStatusBadge
                        status={
                          summary.cfo_review_status ||
                          packageItem?.cfo_review_status
                        }
                      />
                    </div>
                  </div>
                  {summary.comparison_marker_at ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-[11px] font-black uppercase text-slate-500">
                        Compared since
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatDateTime(summary.comparison_marker_at)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {summary.cfo_review_note || summary.package_return_reason ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                      CFO note
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-950">
                      {summary.cfo_review_note || summary.package_return_reason}
                    </p>
                  </div>
                ) : null}
              </section>

              <div className="grid gap-4 xl:grid-cols-2">
                <ComparisonCard
                  label="Approved quantity"
                  before={item.approved_quantity_before}
                  after={item.approved_quantity_after}
                  change={item.approved_quantity_change}
                  direction={item.approved_quantity_direction}
                />
                <ComparisonCard
                  label="Item total amount"
                  before={item.total_amount_before}
                  after={item.total_amount_after}
                  change={item.total_amount_change}
                  direction={item.total_amount_direction}
                  currency
                />
              </div>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <Calculator size={20} />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Sub-item comparison
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Quantity, unit price, and total amount before and after
                        the Category Manager updates.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="enterprise-scrollbar overflow-x-auto">
                  <table className="min-w-[1120px] w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Model</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-right">Unit price</th>
                        <th className="px-4 py-3 text-right">Total amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subItems.length ? (
                        subItems.map((subItem) => (
                          <tr key={subItem.package_sub_item_id}>
                            <td className="px-4 py-4">
                              <p className="font-black text-slate-950">
                                {subItem.name}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <ChangeStatusBadge
                                status={subItem.change_status}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <ValueCell
                                before={subItem.quantity_before}
                                after={subItem.quantity_after}
                                change={subItem.quantity_change}
                                direction={subItem.quantity_direction}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <ValueCell
                                before={subItem.unit_price_before}
                                after={subItem.unit_price_after}
                                change={subItem.unit_price_change}
                                direction={subItem.unit_price_direction}
                                currency
                              />
                            </td>
                            <td className="px-4 py-4">
                              <ValueCell
                                before={subItem.total_before}
                                after={subItem.total_after}
                                change={subItem.total_change}
                                direction={subItem.total_direction}
                                currency
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                          >
                            No package sub-item comparison is available for
                            this item.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </AnimatedDrawer>
  );
}
