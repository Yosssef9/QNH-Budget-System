import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";

import AnimatedDrawer from "../shared/drawers/AnimatedDrawer";
import CurrencyText from "../../CurrencyText";
import LoadingSpinner from "../../LoadingSpinner";
import SortableHeader from "../../SortableHeader";
import TablePagination from "../../TablePagination";
import useTableSort from "../../../hooks/useTableSort";
import usePagination from "../../../hooks/usePagination";
import usePackageSubItemPriceIntelligence from "../../../hooks/po/usePackageSubItemPriceIntelligence";
import { formatDate } from "../../../utils/dateFormatters";
import { formatQty } from "../../../utils/numberFormatter";
import PriceIntelligenceStatusBadge from "./PriceIntelligenceStatusBadge";

function formatPercent(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "-";
  return `${numberValue > 0 ? "+" : ""}${numberValue.toFixed(1)}%`;
}

function DetailLine({ label, value, tooltip }) {
  return (
    <div title={tooltip} className="flex items-start justify-between gap-4">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="max-w-[62%] text-right text-sm font-bold text-slate-900">
        {value ?? "-"}
      </span>
    </div>
  );
}

function MetricCard({ title, value, description, icon: Icon, tooltip, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div title={tooltip} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <div className="mt-2 min-w-0 break-words text-2xl font-bold text-slate-900">
            {value}
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
          <Icon size={20} />
        </div>
      </div>
      {description && (
        <p className="mt-3 text-sm font-medium text-slate-500">{description}</p>
      )}
    </div>
  );
}

function Section({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-1 text-sm font-medium text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function RecentPurchasesTable({ purchases = [], hasMappings = false }) {
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    purchases,
    "created_at",
    "desc",
  );
  const pagination = usePagination(sortedRows.length, 25);

  const paginatedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [sortedRows, pagination.page, pagination.pageSize]);

  if (!purchases.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-bold text-slate-700">
          {hasMappings ? "No historical purchases found." : "No active PO catalog mappings found."}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          {hasMappings
            ? "Active mappings exist, but no purchase records were available for the mapped PO item codes."
            : "Create an active PO catalog mapping before historical procurement benchmarks can be calculated for this package model."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="enterprise-scrollbar max-h-[460px] overflow-auto">
        <table className="min-w-[1180px] w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
            <tr>
              <SortableHeader label="Date" column="created_at" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Supplier" column="supplier_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Item Code" column="item_code" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Description" column="item_description" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Quantity" column="quantity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right" />
              <SortableHeader label="Unit Cost" column="unit_cost" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right" />
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((purchase) => (
              <tr key={purchase.purchase_invoice_line_id} className="bg-white transition hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                  {formatDate(purchase.created_at)}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <div className="font-bold text-slate-900">
                    {purchase.supplier_name || "-"}
                  </div>
                  {purchase.parent_item_name && (
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {purchase.parent_item_name}
                    </div>
                  )}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-bold text-blue-700">
                  {purchase.item_code || "-"}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <div className="max-w-[320px] truncate font-semibold text-slate-700">
                    {purchase.item_description || "-"}
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-slate-900">
                  {formatQty(purchase.quantity)}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-slate-900">
                  <CurrencyText value={purchase.unit_cost || 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        startRow={pagination.startRow}
        endRow={pagination.endRow}
        totalRows={sortedRows.length}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}

export default function PackageSubItemPriceIntelligenceDrawer({
  open,
  subItem,
  subItems = [],
  onSelectSubItem,
  onClose,
}) {
  const { data, isLoading, isError } = usePackageSubItemPriceIntelligence(
    subItem?.id,
    open,
  );

  const packageSubItem = data?.packageSubItem || subItem;
  const intelligence = data?.priceIntelligence;
  const purchases = data?.historicalPurchases || [];
  const mappedCodes = intelligence?.mapped_item_codes || [];

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Historical Procurement Benchmark
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Explainable price intelligence based on mapped historical QNH procurement records.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Unit metrics compare one package model unit. Line impact multiplies the unit difference by package model quantity.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close price intelligence"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {subItems.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              {subItems.map((model) => (
                <button
                  type="button"
                  key={model.id}
                  onClick={() => onSelectSubItem?.(model)}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-black transition",
                    Number(model.id) === Number(subItem?.id)
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <LoadingSpinner />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              Failed to load price intelligence details.
            </div>
          )}

          {!isLoading && !isError && (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Historical Unit Benchmark"
                  value={
                    intelligence?.historical_benchmark ? (
                      <CurrencyText value={intelligence.historical_benchmark} />
                    ) : (
                      "-"
                    )
                  }
                  description="Median historical unit cost"
                  icon={BarChart3}
                  tone="blue"
                />
                <MetricCard
                  title="Unit Price Variance"
                  value={formatPercent(intelligence?.variance_percent)}
                  description={
                    intelligence?.variance_amount !== null &&
                    intelligence?.variance_amount !== undefined ? (
                      <CurrencyText value={intelligence.variance_amount} />
                    ) : (
                      "No benchmark"
                    )
                  }
                  icon={TrendingUp}
                  tone={Number(intelligence?.variance_amount || 0) > 0 ? "red" : "emerald"}
                />
                <MetricCard
                  title="Estimated Line Overspend"
                  value={<CurrencyText value={intelligence?.potential_overspend || 0} />}
                  description="Positive quantity-adjusted impact only"
                  icon={Activity}
                  tone={Number(intelligence?.potential_overspend || 0) > 0 ? "red" : "emerald"}
                />
                <MetricCard
                  title="Evidence Strength"
                  value={intelligence?.evidence_strength || "NONE"}
                  description={`${intelligence?.purchase_count || 0} purchases, ${intelligence?.supplier_count || 0} suppliers`}
                  icon={ShieldCheck}
                  tone="slate"
                />
              </section>

              <Section
                title="Package Model Information"
                description="Current package model values submitted for package preparation and CFO review."
                icon={ReceiptText}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailLine label="Generic Item" value={packageSubItem?.catalog_item_name} />
                  <DetailLine label="Package Model" value={packageSubItem?.sub_item_name || packageSubItem?.name} />
                  <DetailLine label="Category" value={packageSubItem?.category_name} />
                  <DetailLine label="Financial Year" value={packageSubItem?.financial_year} />
                  <DetailLine label="Package Quantity" value={formatQty(packageSubItem?.quantity)} />
                  <DetailLine label="Current Unit Price" value={<CurrencyText value={packageSubItem?.unit_price || 0} />} />
                  <DetailLine label="Package Model Total" value={<CurrencyText value={packageSubItem?.total_amount || packageSubItem?.line_total || 0} />} />
                </div>
              </Section>

              <Section
                title="Benchmark Summary"
                description="Unit benchmark, unit variance, and quantity-adjusted package-model impact."
                icon={BarChart3}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailLine
                    label="Status"
                    value={
                      <PriceIntelligenceStatusBadge
                        status={intelligence?.status}
                        label={intelligence?.status_label}
                      />
                    }
                  />
                  <DetailLine label="Benchmark Method" value="Median historical unit cost" />
                  <DetailLine
                    label="Historical Unit Benchmark"
                    value={
                      intelligence?.historical_benchmark ? (
                        <CurrencyText value={intelligence.historical_benchmark} />
                      ) : (
                        "-"
                      )
                    }
                  />
                  <DetailLine
                    label="Unit Price Variance Amount"
                    value={
                      intelligence?.variance_amount !== null &&
                      intelligence?.variance_amount !== undefined ? (
                        <CurrencyText value={intelligence.variance_amount} />
                      ) : (
                        "-"
                      )
                    }
                  />
                  <DetailLine label="Unit Price Variance %" value={formatPercent(intelligence?.variance_percent)} />
                  <DetailLine
                    label="Estimated Line Overspend"
                    value={<CurrencyText value={intelligence?.potential_overspend || 0} />}
                  />
                </div>
              </Section>

              <section className="grid gap-6 xl:grid-cols-2">
                <Section
                  title="Historical Procurement Data"
                  description="Mapped PO item codes and evidence volume used by the benchmark."
                  icon={Database}
                >
                  <div className="space-y-4">
                    <DetailLine label="Historical Purchases" value={intelligence?.purchase_count || 0} />
                    <DetailLine label="Suppliers" value={intelligence?.supplier_count || 0} />
                    <DetailLine
                      label="Evidence Window"
                      value={
                        intelligence?.evidence_window_used === "RECENT_24_MONTHS"
                          ? "Last 24 months"
                          : intelligence?.evidence_window_used === "ALL_HISTORY"
                            ? "All available history"
                            : "-"
                      }
                    />
                    <DetailLine
                      label="Mapped PO Item Codes"
                      value={
                        mappedCodes.length ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            {mappedCodes.map((code) => (
                              <span key={code} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )
                      }
                    />
                  </div>
                </Section>

                <Section
                  title="Historical Unit Price Statistics"
                  description="Supporting statistics shown for transparency."
                  icon={CalendarDays}
                >
                  <div className="space-y-4">
                    <DetailLine
                      label="Median Unit Cost"
                      value={
                        intelligence?.historical_benchmark ? (
                          <CurrencyText value={intelligence.historical_benchmark} />
                        ) : (
                          "-"
                        )
                      }
                    />
                    <DetailLine
                      label="Average Unit Cost"
                      value={
                        intelligence?.average_unit_cost ? (
                          <CurrencyText value={intelligence.average_unit_cost} />
                        ) : (
                          "-"
                        )
                      }
                    />
                    <DetailLine label="Minimum Unit Cost" value={intelligence?.min_unit_cost ? <CurrencyText value={intelligence.min_unit_cost} /> : "-"} />
                    <DetailLine label="Maximum Unit Cost" value={intelligence?.max_unit_cost ? <CurrencyText value={intelligence.max_unit_cost} /> : "-"} />
                    <DetailLine label="Last Purchase Unit Cost" value={intelligence?.last_purchase_unit_cost ? <CurrencyText value={intelligence.last_purchase_unit_cost} /> : "-"} />
                    <DetailLine label="Last Purchase Date" value={formatDate(intelligence?.last_purchase_at)} />
                  </div>
                </Section>
              </section>

              <Section
                title="Recent Historical Purchases"
                description="Recent purchase records used as evidence for the benchmark calculation."
                icon={PackageSearch}
              >
                <RecentPurchasesTable purchases={purchases} hasMappings={mappedCodes.length > 0} />
              </Section>
            </div>
          )}
        </div>
      </div>
    </AnimatedDrawer>
  );
}
