import { useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Layers3,
  Maximize2,
  Palette,
  PieChart,
  TrendingUp,
  X,
} from "lucide-react";

import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CollapsibleSection from "../CollapsibleSection";
import CurrencyText from "../CurrencyText";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PERIOD_VIEWS = [
  { value: "monthly", label: "Monthly", helper: "Jan to Dec" },
  { value: "quarterly", label: "Quarterly", helper: "Q1 to Q4" },
  { value: "annual", label: "Annual", helper: "Full year" },
];

const GROUP_VIEWS = [
  { value: "total", label: "Overview", helper: "One total trend" },
  { value: "byCategory", label: "Categories", helper: "IT, Biomedical, General" },
  { value: "byDepartment", label: "Departments", helper: "Demand by department" },
  { value: "byModel", label: "Models", helper: "Shared package sub-items" },
  { value: "byItem", label: "Items", helper: "Generic requested items" },
];

const CHART_COLORS = [
  "rgba(37, 99, 235, 0.82)",
  "rgba(5, 150, 105, 0.82)",
  "rgba(217, 119, 6, 0.82)",
  "rgba(124, 58, 237, 0.82)",
  "rgba(220, 38, 38, 0.78)",
  "rgba(8, 145, 178, 0.82)",
  "rgba(79, 70, 229, 0.82)",
  "rgba(234, 88, 12, 0.78)",
  "rgba(15, 118, 110, 0.82)",
  "rgba(190, 24, 93, 0.78)",
];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatQuantity(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
  }).format(toNumber(value));
}

function formatCompact(value) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function getPeriodValue(row, periodView, periodKey) {
  return toNumber(row?.periods?.[periodView]?.[periodKey]);
}

function getPeriodTotal(row, periodView) {
  return Object.values(row?.periods?.[periodView] || {}).reduce(
    (sum, value) => sum + toNumber(value),
    0,
  );
}

function getRowContext(row) {
  return (
    row?.meta?.categoryName ||
    row?.meta?.itemName ||
    row?.meta?.departmentCode ||
    row?.meta?.unitOfMeasureName ||
    row?.type ||
    ""
  );
}

function getPeriodTotals(rows, periodDefinitions, periodView) {
  return periodDefinitions.map((period) =>
    rows.reduce(
      (sum, row) => sum + getPeriodValue(row, periodView, period.key),
      0,
    ),
  );
}

function getPeakPeriod(periodDefinitions, totals) {
  if (!periodDefinitions.length) return { label: "-", value: 0 };
  const peak = periodDefinitions.reduce(
    (current, period, index) =>
      totals[index] > current.value
        ? { label: period.label, value: totals[index] }
        : current,
    { label: periodDefinitions[0].label, value: totals[0] || 0 },
  );
  return peak;
}

function getHeatCellClass(value, maxValue) {
  const numeric = toNumber(value);
  if (numeric <= 0) return "bg-slate-50 text-slate-400";
  const ratio = maxValue > 0 ? numeric / maxValue : 0;
  if (ratio >= 0.75) return "bg-blue-600 text-white";
  if (ratio >= 0.45) return "bg-blue-100 text-blue-900";
  return "bg-emerald-50 text-emerald-800";
}

function SummaryMetric({ icon: Icon, label, value, helper, currency = false, tone = "blue" }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 min-w-0 break-words text-2xl font-black text-slate-950">
            {currency ? <CurrencyText compact value={value} /> : value}
          </p>
          {helper ? (
            <p className="mt-1 text-xs font-bold text-slate-500">{helper}</p>
          ) : null}
        </div>
        <span className={`rounded-2xl border p-3 ${tones[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

function SegmentButton({ active, label, helper, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-w-[130px] rounded-2xl px-4 py-3 text-left transition",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="block text-sm font-black">{label}</span>
      <span
        className={[
          "mt-0.5 block text-xs font-semibold",
          active ? "text-blue-100" : "text-slate-500",
        ].join(" ")}
      >
        {helper}
      </span>
    </button>
  );
}

function DistributionChart({ rows, periodDefinitions, periodView }) {
  const datasets = rows.slice(0, 10).map((row, index) => ({
    label: row.label,
    data: periodDefinitions.map((period) =>
      getPeriodValue(row, periodView, period.key),
    ),
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
    borderRadius: 8,
    borderSkipped: false,
  }));

  const chartData = {
    labels: periodDefinitions.map((period) => period.label),
    datasets,
  };

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              font: { weight: "bold" },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: SAR ${formatCompact(
                  context.parsed.y,
                )}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { weight: "bold" } },
          },
          y: {
            stacked: true,
            ticks: {
              callback: (value) => `SAR ${formatCompact(value)}`,
            },
          },
        },
      }}
    />
  );
}

function RowDetailsPanel({ row, periodDefinitions, periodView, onClose }) {
  if (!row) return null;

  const isModelRow = row.type === "MODEL";
  const distributedValue = getPeriodTotal(row, periodView);

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Selected row
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {row.label}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {getRowContext(row)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-blue-200 bg-white p-2 text-blue-700 hover:bg-blue-50"
          aria-label="Close selected distribution row details"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {isModelRow ? (
          <SummaryMetric
            icon={Layers3}
            label="Allocated quantity"
            value={formatQuantity(row.allocated_quantity)}
            tone="emerald"
          />
        ) : (
          <SummaryMetric
            icon={Activity}
            label="Approved quantity"
            value={formatQuantity(row.approved_quantity)}
            tone="blue"
          />
        )}
        <SummaryMetric
          icon={TrendingUp}
          label="Distributed value"
          value={distributedValue}
          currency
          tone="violet"
        />
        {isModelRow ? (
          <SummaryMetric
            icon={Activity}
            label="Unit price"
            value={row.meta?.unitPrice || 0}
            currency
            tone="blue"
          />
        ) : (
          <SummaryMetric
            icon={Layers3}
            label="Allocated quantity"
            value={formatQuantity(row.allocated_quantity)}
            tone="emerald"
          />
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-right">Distributed value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {periodDefinitions.map((period) => {
              const value = getPeriodValue(row, periodView, period.key);
              return (
                <tr key={period.key}>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {period.label}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-950">
                    <CurrencyText compact value={value} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColorLegend() {
  const items = [
    {
      label: "No value",
      className: "bg-slate-50 text-slate-400",
      description: "Nothing is distributed in this period.",
    },
    {
      label: "Low value",
      className: "bg-emerald-50 text-emerald-800",
      description: "A smaller share of the visible period total.",
    },
    {
      label: "Medium value",
      className: "bg-blue-100 text-blue-900",
      description: "A meaningful share of the visible period total.",
    },
    {
      label: "High value",
      className: "bg-blue-600 text-white",
      description: "One of the largest values in the current table view.",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <span
            className={[
              "inline-flex rounded-xl px-3 py-2 text-xs font-black",
              item.className,
            ].join(" ")}
          >
            {item.label}
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function DistributionRules() {
  const rules = [
    "The drawer is read-only. It explains how approved package value is distributed across the year.",
    "Monthly distributions use the exact monthly values from the department request.",
    "Quarterly distributions place each quarter value in the first month of that quarter.",
    "Annual distributions place the full annual value in the first month of the year.",
    "Values are calculated from approved quantity, package allocation, and package sub-item unit price.",
    "Changing the period or breakdown view changes the display only; it does not change budget records.",
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rules.map((rule, index) => (
        <div
          key={rule}
          className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
            {index + 1}
          </span>
          <p className="text-sm font-semibold text-slate-600">{rule}</p>
        </div>
      ))}
    </div>
  );
}

export default function PackageDistributionDrawer({
  open,
  onClose,
  title,
  subtitle,
  data,
  loading = false,
  error = null,
}) {
  const [periodView, setPeriodView] = useState("monthly");
  const [groupView, setGroupView] = useState("total");
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  const periodDefinitions = data?.periodDefinitions?.[periodView] || [];
  const categoryRows = data?.rows?.byCategory || [];
  const availableGroupViews = GROUP_VIEWS.filter(
    (option) => {
      if (option.value === "total") return true;
      if (option.value === "byCategory") {
        return data?.scope?.type === "FINANCIAL_YEAR" || categoryRows.length > 1;
      }
      return (data?.rows?.[option.value]?.length || 0) > 0;
    },
  );
  const rows = useMemo(
    () => data?.rows?.[groupView] || [],
    [data?.rows, groupView],
  );
  const selectedRow = rows.find((row) => row.key === selectedRowKey) || null;
  const totals = data?.totals || {};
  const scope = data?.scope || {};
  const periodTotals = getPeriodTotals(rows, periodDefinitions, periodView);
  const peak = getPeakPeriod(periodDefinitions, periodTotals);
  const activePeriods = periodTotals.filter((value) => value > 0).length;
  const maxCellValue = Math.max(...periodTotals, 0);
  const isModelBreakdown = groupView === "byModel";

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-6 py-6 text-white">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                Distribution Analysis
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {title || scope.label || "Package distribution"}
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-semibold text-blue-100">
                {subtitle ||
                  "Read-only distribution of approved package value across the financial year."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/15"
              aria-label="Close distribution drawer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-3 border-t border-slate-100 px-6 py-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryMetric
              icon={TrendingUp}
              label="Distributed value"
              value={totals.estimated_total}
              currency
              tone="blue"
            />
            <SummaryMetric
              icon={Maximize2}
              label="Peak period"
              value={peak.label}
              helper={`SAR ${formatCompact(peak.value)}`}
              tone="amber"
            />
            <SummaryMetric
              icon={CalendarDays}
              label="Active periods"
              value={`${activePeriods}/${periodDefinitions.length || 0}`}
              tone="emerald"
            />
            <SummaryMetric
              icon={Activity}
              label="Approved quantity"
              value={formatQuantity(totals.approved_quantity)}
              tone="violet"
            />
            <SummaryMetric
              icon={Layers3}
              label="Allocated quantity"
              value={formatQuantity(totals.allocated_quantity)}
              tone="emerald"
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="h-[420px] animate-pulse rounded-3xl bg-white" />
              <div className="h-[420px] animate-pulse rounded-3xl bg-white" />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
              Failed to load distribution analysis.
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <PieChart size={28} />
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                No distribution data yet
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Reviewed package demand with allocations and prices will appear
                here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.55fr)]">
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                        <CalendarDays size={22} />
                      </span>
                      <div>
                        <h3 className="text-lg font-black text-slate-950">
                          Period view
                        </h3>
                        <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">
                          Annual distributions appear in the first month.
                          Quarterly distributions appear in the first month of
                          each quarter.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 rounded-3xl bg-slate-100 p-2">
                      {PERIOD_VIEWS.map((option) => (
                        <SegmentButton
                          key={option.value}
                          active={periodView === option.value}
                          label={option.label}
                          helper={option.helper}
                          onClick={() => setPeriodView(option.value)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-950">
                      Breakdown
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {availableGroupViews.map((option) => (
                        <SegmentButton
                          key={option.value}
                          active={groupView === option.value}
                          label={option.label}
                          helper={option.helper}
                          onClick={() => {
                            setGroupView(option.value);
                            setSelectedRowKey(null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      Distribution chart
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Stacked values show where the approved package amount is
                      expected across the selected period view.
                    </p>
                  </div>
                  {rows.length > 10 ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      Showing top 10 chart series
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 h-[360px]">
                  <DistributionChart
                    rows={rows}
                    periodDefinitions={periodDefinitions}
                    periodView={periodView}
                  />
                </div>
              </section>

              <CollapsibleSection
                title="Exact distribution values"
                description="Click a row to inspect its period breakdown below the table."
                icon={<Layers3 size={20} />}
                defaultOpen
                openText="Collapse"
                closedText="Expand"
                className="rounded-3xl border-slate-200"
                headerClassName="bg-white hover:bg-slate-50"
                bodyClassName="p-0"
                iconClassName="border-slate-200 text-slate-600"
              >
                <div className="enterprise-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left">
                          Name
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-right">
                          {isModelBreakdown ? "Unit price" : "Approved"}
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-right">
                          Allocated
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-right">
                          Total value
                        </th>
                        {periodDefinitions.map((period) => (
                          <th
                            key={period.key}
                            className="border-b border-slate-200 px-4 py-3 text-right"
                          >
                            {period.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr
                          key={row.key}
                          onClick={() => setSelectedRowKey(row.key)}
                          className={[
                            "cursor-pointer transition hover:bg-blue-50/50",
                            selectedRow?.key === row.key ? "bg-blue-50/60" : "",
                          ].join(" ")}
                        >
                          <td className="sticky left-0 z-10 max-w-[280px] bg-white px-4 py-3">
                            <p className="font-black text-slate-950">
                              {row.label}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {getRowContext(row)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">
                            {isModelBreakdown ? (
                              <CurrencyText compact value={row.meta?.unitPrice || 0} />
                            ) : (
                              formatQuantity(row.approved_quantity)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">
                            {formatQuantity(row.allocated_quantity)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-950">
                            <CurrencyText compact value={getPeriodTotal(row, periodView)} />
                          </td>
                          {periodDefinitions.map((period) => {
                            const value = getPeriodValue(
                              row,
                              periodView,
                              period.key,
                            );
                            return (
                              <td key={period.key} className="px-2 py-2 text-right">
                                <span
                                  className={[
                                    "inline-flex min-w-[84px] justify-end rounded-xl px-3 py-2 text-xs font-black",
                                    getHeatCellClass(value, maxCellValue),
                                  ].join(" ")}
                                >
                                  <CurrencyText compact value={value} />
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>

              {selectedRow ? (
                <CollapsibleSection
                  title="Selected row"
                  description={`${selectedRow.label} period breakdown and totals.`}
                  icon={<Activity size={20} />}
                  defaultOpen
                  openText="Collapse"
                  closedText="Expand"
                  className="rounded-3xl border-blue-200"
                  headerClassName="bg-blue-50/50"
                  bodyClassName="bg-blue-50/20"
                >
                  <RowDetailsPanel
                    row={selectedRow}
                    periodDefinitions={periodDefinitions}
                    periodView={periodView}
                    onClose={() => setSelectedRowKey(null)}
                  />
                </CollapsibleSection>
              ) : null}

              <CollapsibleSection
                title="Table color meaning"
                description="Use the color intensity to quickly find larger distributed values in the current table."
                icon={<Palette size={20} />}
                defaultOpen={false}
                openText="Collapse"
                closedText="Show legend"
                className="rounded-3xl border-slate-200"
                headerClassName="bg-white hover:bg-slate-50"
                iconClassName="border-slate-200 text-slate-600"
              >
                <ColorLegend />
              </CollapsibleSection>

              <CollapsibleSection
                title="Distribution rules"
                description="How monthly, quarterly, and annual distributions are displayed in this drawer."
                icon={<BookOpen size={20} />}
                defaultOpen={false}
                openText="Collapse"
                closedText="Show rules"
                className="rounded-3xl border-slate-200"
                headerClassName="bg-white hover:bg-slate-50"
                iconClassName="border-slate-200 text-slate-600"
              >
                <DistributionRules />
              </CollapsibleSection>
            </div>
          )}
        </main>
      </div>
    </AnimatedDrawer>
  );
}
