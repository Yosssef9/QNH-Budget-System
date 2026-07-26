import { useEffect, useMemo, useState } from "react";
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
import usePackageItemOverallAveragePriceIntelligence from "../../../hooks/po/usePackageItemOverallAveragePriceIntelligence";
import usePackageSubItemPriceIntelligence from "../../../hooks/po/usePackageSubItemPriceIntelligence";
import { formatDate } from "../../../utils/dateFormatters";
import { formatQty } from "../../../utils/numberFormatter";
import PriceIntelligenceStatusBadge from "./PriceIntelligenceStatusBadge";

function formatPercent(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "-";

  return `${numberValue > 0 ? "+" : ""}${numberValue.toFixed(1)}%`;
}


function formatCoverage(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "0%";
  return `${numberValue.toFixed(1)}%`;
}

function formatEvidenceWindow(value) {
  if (value === "RECENT_24_MONTHS") return "Last 24 months";
  if (value === "ALL_HISTORY") return "All available history";
  if (value === "MIXED") return "Mixed by model";
  return "-";
}

function hasMetricValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value))
  );
}

function hasPositiveMetricValue(value) {
  return hasMetricValue(value) && Number(value) > 0;
}


function formatNumber(value, maximumFractionDigits = 2) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "-";

  return numberValue.toLocaleString(undefined, {
    maximumFractionDigits,
  });
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

function RecentPurchasesTable({
  purchases = [],
  hasMappings = false,
  showModels = false,
}) {
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
        <table className={`${showModels ? "min-w-[1320px]" : "min-w-[1180px]"} w-full border-collapse text-sm`}>
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
            <tr>
              <SortableHeader label="Date" column="created_at" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              {showModels ? (
                <SortableHeader
                  label="Model"
                  column="model_names"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ) : null}
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
                {showModels ? (
                  <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                    {purchase.model_names || "-"}
                  </td>
                ) : null}
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


function PackageItemOverallAverageContent({ data }) {
  const packageItem = data?.packageItem;
  const intelligence = data?.overallAveragePriceIntelligence;
  const models = data?.models || [];
  const purchases = data?.historicalPurchases || [];
  const mappedCodes = intelligence?.mapped_item_codes || [];

  const benchmarkedModels = models.filter((model) =>
    hasPositiveMetricValue(
      model.priceIntelligence?.historical_benchmark,
    ),
  );

  const comparableModels = benchmarkedModels.filter((model) =>
    hasPositiveMetricValue(model.packageSubItem?.unit_price),
  );

  const missingBenchmarkModels = models.filter(
    (model) =>
      !hasPositiveMetricValue(
        model.priceIntelligence?.historical_benchmark,
      ),
  );

  const benchmarkFormula = benchmarkedModels
    .map((model) =>
      formatNumber(
        model.priceIntelligence.historical_benchmark,
        2,
      ),
    )
    .join(" + ");

  const comparableCurrentFormula = comparableModels
    .map((model) =>
      formatNumber(model.packageSubItem.unit_price, 2),
    )
    .join(" + ");

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Overall Average Benchmark"
          value={
            hasMetricValue(
              intelligence?.overall_average_benchmark,
            ) ? (
              <CurrencyText
                value={intelligence.overall_average_benchmark}
              />
            ) : (
              "-"
            )
          }
          description={`Average across ${
            intelligence?.benchmarked_model_count || 0
          } models with valid evidence`}
          icon={BarChart3}
          tone="blue"
        />

        <MetricCard
          title="Average Current Unit Price"
          value={
            hasMetricValue(
              intelligence?.average_current_unit_price,
            ) ? (
              <CurrencyText
                value={intelligence.average_current_unit_price}
              />
            ) : (
              "-"
            )
          }
          description={`Average across ${
            intelligence?.current_price_model_count || 0
          } models with a configured price`}
          icon={ReceiptText}
          tone="slate"
        />

        <MetricCard
          title="Average Price Variance"
          value={formatPercent(intelligence?.variance_percent)}
          description={
            hasMetricValue(intelligence?.variance_amount) ? (
              <span>
                <CurrencyText value={intelligence.variance_amount} />{" "}
                versus the comparable benchmark
              </span>
            ) : (
              "No comparable benchmark"
            )
          }
          icon={TrendingUp}
          tone={
            Number(intelligence?.variance_amount || 0) > 0
              ? "red"
              : "emerald"
          }
        />

        <MetricCard
          title="Benchmark Coverage"
          value={formatCoverage(
            intelligence?.benchmark_coverage_percent,
          )}
          description={`${
            intelligence?.benchmarked_model_count || 0
          } of ${intelligence?.model_count || 0} models`}
          icon={ShieldCheck}
          tone={
            intelligence?.is_partial_coverage
              ? "amber"
              : "emerald"
          }
        />
      </section>

      {intelligence?.is_partial_coverage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          <p className="font-black">Partial benchmark coverage</p>
          <p className="mt-1 leading-6">
            The overall benchmark is based on{" "}
            {intelligence.benchmarked_model_count} of{" "}
            {intelligence.model_count} active models.
            {missingBenchmarkModels.length
              ? ` ${missingBenchmarkModels
                  .map(
                    (model) =>
                      model.packageSubItem?.sub_item_name ||
                      model.packageSubItem?.name,
                  )
                  .filter(Boolean)
                  .join(", ")} ${
                  missingBenchmarkModels.length === 1
                    ? "has"
                    : "have"
                } no usable historical benchmark and ${
                  missingBenchmarkModels.length === 1
                    ? "is"
                    : "are"
                } excluded from benchmark-based averages.`
              : ""}
            {" "}Missing benchmarks are never treated as zero.
          </p>
        </div>
      ) : intelligence?.model_count > 0 &&
        intelligence?.benchmarked_model_count ===
          intelligence?.model_count ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          Full benchmark coverage: all{" "}
          {intelligence.model_count} active models contribute to the
          overall average.
        </div>
      ) : intelligence?.model_count > 0 &&
        intelligence?.benchmarked_model_count === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm font-semibold text-slate-700">
          <p className="font-black">No benchmark available</p>
          <p className="mt-1 leading-6">
            None of the active models has usable historical price
            evidence. Add active PO mappings and matching purchase
            history to calculate the overall average benchmark.
          </p>
        </div>
      ) : null}

      <Section
        title="Generic Item Overview"
        description="The overall average gives every active model equal weight. Model quantities do not affect the average."
        icon={ReceiptText}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailLine
            label="Generic Item"
            value={packageItem?.catalog_item_name}
          />
          <DetailLine
            label="Category"
            value={packageItem?.category_name}
          />
          <DetailLine
            label="Financial Year"
            value={packageItem?.financial_year}
          />
          <DetailLine
            label="Active Models"
            value={intelligence?.model_count || 0}
          />
          <DetailLine
            label="Models with Current Price"
            value={`${intelligence?.current_price_model_count || 0} of ${
              intelligence?.model_count || 0
            }`}
          />
          <DetailLine
            label="Models with Benchmark"
            value={`${intelligence?.benchmarked_model_count || 0} of ${
              intelligence?.model_count || 0
            }`}
          />
          <DetailLine
            label="Current Price Coverage"
            value={formatCoverage(
              intelligence?.current_price_coverage_percent,
            )}
          />
          <DetailLine
            label="Benchmark Coverage"
            value={formatCoverage(
              intelligence?.benchmark_coverage_percent,
            )}
          />
          <DetailLine
            label="Comparable Models"
            value={`${intelligence?.comparable_model_count || 0} of ${
              intelligence?.model_count || 0
            }`}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Package volume context
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <DetailLine
              label="Total Configured Quantity"
              value={formatQty(packageItem?.total_quantity)}
              tooltip="Informational only. Quantity does not weight the overall average."
            />
            <DetailLine
              label="Current Package Total"
              value={
                <CurrencyText value={packageItem?.total_amount || 0} />
              }
              tooltip="Informational only. This sum is not used in the overall average."
            />
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            These package-volume values are shown for context only and
            do not change the equal-weight model average.
          </p>
        </div>
      </Section>

      <Section
        title="Overall Average Analysis"
        description="A like-for-like comparison between equally weighted model prices and their own historical benchmarks."
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
          <DetailLine
            label="Benchmark Method"
            value="Simple average of valid model median unit costs"
          />
          <DetailLine
            label="Weighting Method"
            value="Equal weight per model"
          />
          <DetailLine
            label="All-Model Average Current Price"
            value={
              hasMetricValue(
                intelligence?.average_current_unit_price,
              ) ? (
                <CurrencyText
                  value={intelligence.average_current_unit_price}
                />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Overall Average Benchmark"
            value={
              hasMetricValue(
                intelligence?.overall_average_benchmark,
              ) ? (
                <CurrencyText
                  value={intelligence.overall_average_benchmark}
                />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Comparable Average Current Price"
            value={
              hasMetricValue(
                intelligence?.comparable_average_current_unit_price,
              ) ? (
                <CurrencyText
                  value={
                    intelligence.comparable_average_current_unit_price
                  }
                />
              ) : (
                "-"
              )
            }
            tooltip="Uses only models that have both a current price and a historical benchmark."
          />
          <DetailLine
            label="Comparable Average Benchmark"
            value={
              hasMetricValue(
                intelligence?.comparable_average_benchmark,
              ) ? (
                <CurrencyText
                  value={intelligence.comparable_average_benchmark}
                />
              ) : (
                "-"
              )
            }
            tooltip="Uses the same model population as the comparable current-price average."
          />
          <DetailLine
            label="Average Variance Amount"
            value={
              hasMetricValue(intelligence?.variance_amount) ? (
                <CurrencyText value={intelligence.variance_amount} />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Average Variance %"
            value={formatPercent(intelligence?.variance_percent)}
          />
          <DetailLine
            label="Average Historical Unit Cost"
            value={
              hasMetricValue(
                intelligence?.average_historical_unit_cost,
              ) ? (
                <CurrencyText
                  value={intelligence.average_historical_unit_cost}
                />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Average Minimum Historical Cost"
            value={
              hasMetricValue(
                intelligence?.average_minimum_unit_cost,
              ) ? (
                <CurrencyText
                  value={intelligence.average_minimum_unit_cost}
                />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Average Maximum Historical Cost"
            value={
              hasMetricValue(
                intelligence?.average_maximum_unit_cost,
              ) ? (
                <CurrencyText
                  value={intelligence.average_maximum_unit_cost}
                />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Average Last-Purchase Cost"
            value={
              hasMetricValue(
                intelligence?.average_last_purchase_unit_cost,
              ) ? (
                <CurrencyText
                  value={
                    intelligence.average_last_purchase_unit_cost
                  }
                />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Average Model Potential Impact"
            value={
              hasMetricValue(
                intelligence?.average_model_potential_impact,
              ) ? (
                <CurrencyText
                  value={
                    intelligence.average_model_potential_impact
                  }
                />
              ) : (
                "-"
              )
            }
          />
          <DetailLine
            label="Average Model Potential Overspend"
            value={
              hasMetricValue(
                intelligence?.average_model_potential_overspend,
              ) ? (
                <CurrencyText
                  value={
                    intelligence.average_model_potential_overspend
                  }
                />
              ) : (
                "-"
              )
            }
          />
        </div>
      </Section>

      <Section
        title="Model Contribution"
        description="Every model contributes once. Benchmark-based comparison includes only models with both a current price and a valid benchmark."
        icon={CalendarDays}
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="enterprise-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Model
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">
                    Current Unit Price
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">
                    Benchmark
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right">
                    Variance
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Status
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">
                    Included
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const packageSubItem = model.packageSubItem;
                  const modelIntelligence = model.priceIntelligence;
                  const included =
                    hasPositiveMetricValue(
                      packageSubItem?.unit_price,
                    ) &&
                    hasPositiveMetricValue(
                      modelIntelligence?.historical_benchmark,
                    );

                  return (
                    <tr
                      key={packageSubItem.package_sub_item_id}
                      className="bg-white transition hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-3">
                        <p className="font-black text-slate-900">
                          {packageSubItem.sub_item_name ||
                            packageSubItem.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Quantity {formatQty(packageSubItem.quantity)}
                        </p>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-slate-900">
                        {hasPositiveMetricValue(
                          packageSubItem.unit_price,
                        ) ? (
                          <CurrencyText
                            value={packageSubItem.unit_price}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-slate-900">
                        {hasPositiveMetricValue(
                          modelIntelligence?.historical_benchmark,
                        ) ? (
                          <CurrencyText
                            value={
                              modelIntelligence.historical_benchmark
                            }
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-slate-900">
                        {formatPercent(
                          modelIntelligence?.variance_percent,
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <PriceIntelligenceStatusBadge
                          status={modelIntelligence?.status}
                          label={modelIntelligence?.status_label}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
                            included
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {included ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Overall Benchmark Calculation
            </p>
            <p className="mt-2 break-words text-sm font-bold text-slate-900">
              {benchmarkFormula
                ? `(${benchmarkFormula}) ÷ ${benchmarkedModels.length} = ${formatNumber(
                    intelligence?.overall_average_benchmark,
                    2,
                  )}`
                : "No valid model benchmarks are available."}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Comparable Current Price Calculation
            </p>
            <p className="mt-2 break-words text-sm font-bold text-slate-900">
              {comparableCurrentFormula
                ? `(${comparableCurrentFormula}) ÷ ${comparableModels.length} = ${formatNumber(
                    intelligence?.comparable_average_current_unit_price,
                    2,
                  )}`
                : "No models have both a current price and a benchmark."}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Combined Historical Evidence"
        description="Distinct purchase lines, suppliers, and mapped codes across every active model."
        icon={Database}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailLine
            label="Distinct Historical Purchases"
            value={intelligence?.purchase_count || 0}
          />
          <DetailLine
            label="Distinct Suppliers"
            value={intelligence?.supplier_count || 0}
          />
          <DetailLine
            label="Evidence Strength"
            value={intelligence?.evidence_strength || "NONE"}
          />
          <DetailLine
            label="Evidence Window"
            value={formatEvidenceWindow(
              intelligence?.evidence_window_used,
            )}
          />
          <DetailLine
            label="Last Purchase Date"
            value={formatDate(intelligence?.last_purchase_at)}
          />
          <DetailLine
            label="Mapped PO Item Codes"
            value={
              mappedCodes.length ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {mappedCodes.map((code) => (
                    <span
                      key={code}
                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700"
                    >
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
        title="Combined Recent Historical Purchases"
        description="Distinct recent purchase records across all mapped models in this generic item."
        icon={PackageSearch}
      >
        <RecentPurchasesTable
          purchases={purchases}
          hasMappings={mappedCodes.length > 0}
          showModels
        />
      </Section>
    </div>
  );
}

export default function PackageSubItemPriceIntelligenceDrawer({
  open,
  subItem,
  subItems = [],
  initialView = "MODEL",
  onSelectSubItem,
  onClose,
}) {
  const [activeView, setActiveView] = useState(
    initialView === "OVERALL_AVERAGE"
      ? "OVERALL_AVERAGE"
      : "MODEL",
  );

  const averageAnchorSubItemId =
    subItems[0]?.id || subItem?.id || null;

  useEffect(() => {
    if (!open) return;

    setActiveView(
      initialView === "OVERALL_AVERAGE"
        ? "OVERALL_AVERAGE"
        : "MODEL",
    );
  }, [averageAnchorSubItemId, initialView, open]);

  const modelQuery = usePackageSubItemPriceIntelligence(
    subItem?.id,
    open && activeView === "MODEL",
  );

  const overallAverageQuery =
    usePackageItemOverallAveragePriceIntelligence(
      averageAnchorSubItemId,
      open && activeView === "OVERALL_AVERAGE",
    );

  const data = modelQuery.data;
  const packageSubItem = data?.packageSubItem || subItem;
  const intelligence = data?.priceIntelligence;
  const purchases = data?.historicalPurchases || [];
  const mappedCodes = intelligence?.mapped_item_codes || [];

  const activeQuery =
    activeView === "OVERALL_AVERAGE"
      ? overallAverageQuery
      : modelQuery;

  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              {activeView === "OVERALL_AVERAGE"
                ? "Generic Item Price Context"
                : "Package Model Price Context"}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {activeView === "OVERALL_AVERAGE"
                ? overallAverageQuery.data?.packageItem
                    ?.catalog_item_name ||
                  subItem?.catalog_item_name ||
                  "Overall Average"
                : packageSubItem?.sub_item_name ||
                  packageSubItem?.name ||
                  "Historical Procurement Benchmark"}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {activeView === "OVERALL_AVERAGE"
                ? `Overall price intelligence across ${
                    overallAverageQuery.data
                      ?.overallAveragePriceIntelligence
                      ?.model_count ||
                    subItems.length ||
                    0
                  } active models.`
                : "Explainable price intelligence based on mapped historical QNH procurement records."}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              {activeView === "OVERALL_AVERAGE"
                ? "Every model has equal weight. Quantities do not affect the overall average."
                : "Unit metrics compare one package model unit. Line impact multiplies the unit difference by package model quantity."}
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
          {subItems.length > 0 ? (
            <div
              role="tablist"
              aria-label="Price intelligence context"
              className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3"
            >
              <button
                type="button"
                role="tab"
                aria-selected={
                  activeView === "OVERALL_AVERAGE"
                }
                onClick={() =>
                  setActiveView("OVERALL_AVERAGE")
                }
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black transition",
                  activeView === "OVERALL_AVERAGE"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                Overall Average
              </button>

              {subItems.map((model) => {
                const selected =
                  activeView === "MODEL" &&
                  Number(model.id) === Number(subItem?.id);

                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    key={model.id}
                    onClick={() => {
                      setActiveView("MODEL");
                      onSelectSubItem?.(model);
                    }}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs font-black transition",
                      selected
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {model.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <LoadingSpinner fill />
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                {activeView === "OVERALL_AVERAGE"
                  ? "Could not load overall average price intelligence."
                  : "Failed to load price intelligence details."}
              </p>
              <button
                type="button"
                onClick={() => activeQuery.refetch()}
                className="mt-3 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            activeView === "OVERALL_AVERAGE" ? (
              <div role="tabpanel">
                <PackageItemOverallAverageContent
                  data={overallAverageQuery.data}
                />
              </div>
            ) : (
              <div role="tabpanel">
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
              </div>
            )
          ) : null}
        </div>
      </div>
    </AnimatedDrawer>
  );
}
