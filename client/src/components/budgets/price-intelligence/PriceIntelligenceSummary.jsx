import {
  AlertTriangle,
  BarChart3,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

import CurrencyText from "../../CurrencyText";

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tooltip,
  tone = "blue",
  prominent = false,
}) {
  const tones = {
    blue: {
      card: "border-blue-100 bg-blue-50/60",
      icon: "bg-blue-600 text-white",
      value: "text-blue-700",
    },
    red: {
      card: "border-red-100 bg-red-50/70",
      icon: "bg-red-600 text-white",
      value: "text-red-700",
    },
    amber: {
      card: "border-amber-100 bg-amber-50/70",
      icon: "bg-amber-500 text-white",
      value: "text-amber-700",
    },
    slate: {
      card: "border-slate-200 bg-white",
      icon: "bg-slate-700 text-white",
      value: "text-slate-900",
    },
  };

  const style = tones[tone] || tones.blue;

  return (
    <article
      title={tooltip}
      className={[
        "rounded-2xl border p-5 shadow-sm transition hover:shadow-md",
        style.card,
        prominent ? "xl:col-span-1" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-600">{title}</p>
          <div
            className={[
              "mt-2 font-extrabold tracking-tight",
              prominent ? "text-3xl" : "text-2xl",
              style.value,
            ].join(" ")}
          >
            {value}
          </div>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm",
            style.icon,
          ].join(" ")}
        >
          <Icon size={21} />
        </div>
      </div>

      {description && (
        <p className="mt-4 text-sm font-medium leading-5 text-slate-500">
          {description}
        </p>
      )}
    </article>
  );
}

export default function PriceIntelligenceSummary({ summary }) {
  const itemsAnalyzed = Number(summary?.items_analyzed || 0);
  const highRiskItems = Number(summary?.high_risk_items || 0);
  const potentialOverspend = Number(summary?.potential_overspend || 0);
  const missingBenchmarks = Number(summary?.missing_benchmarks || 0);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Price Intelligence Summary
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Historical procurement benchmark overview for this budget review.
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Historical Procurement Benchmark
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Items Analyzed"
          value={itemsAnalyzed}
          description="Budget items with a historical unit benchmark."
          tooltip="Number of budget items with enough mapped historical purchase data to calculate a unit benchmark."
          icon={BarChart3}
          tone="blue"
        />

        <SummaryCard
          title="High Risk Items"
          value={highRiskItems}
          description="Items with unit prices more than 30% above benchmark."
          tooltip="Number of items where the budget unit price is more than 30% above the historical unit benchmark."
          icon={AlertTriangle}
          tone={highRiskItems > 0 ? "red" : "slate"}
        />

        <SummaryCard
          title="Total Estimated Overspend"
          value={<CurrencyText value={potentialOverspend} />}
          description="Across all benchmarked items in this budget review."
          tooltip="Sum of positive estimated overspend across all benchmarked items in this budget review."
          icon={TrendingUp}
          tone={potentialOverspend > 0 ? "red" : "slate"}
          prominent
        />

        <SummaryCard
          title="Missing Benchmarks"
          value={missingBenchmarks}
          description="Items without enough mapped procurement history."
          tooltip="Number of budget items where no benchmark could be calculated due to missing mappings or historical purchase data."
          icon={HelpCircle}
          tone={missingBenchmarks > 0 ? "amber" : "slate"}
        />
      </div>
    </section>
  );
}
