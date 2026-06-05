import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Download,
  PackageSearch,
  TrendingUp,
} from "lucide-react";
import CurrencyText from "../../components/CurrencyText";
import { formatNumber } from "../../utils/formatters";
import CollapsibleSection from "../../components/CollapsibleSection";
const LIMIT_OPTIONS = [10, 25, 50, 100];

export default function BudgetComparisonInsights({
  topCostItems,
  duplicateItems,
  varianceItems,
  departmentRanking,
  onExport,
  onFilterItem,
  onFilterDepartment,
}) {
  return (
    <section className="grid items-start gap-4 xl:grid-cols-2">
      <InsightCard
        title="Highest-Cost Items"
        icon={<TrendingUp size={18} />}
        // action={
        //   <button
        //     type="button"
        //     onClick={onExport}
        //     className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
        //   >
        //     <Download size={14} />
        //     Export Current View
        //   </button>
        // }
      >
        {(limit) =>
          topCostItems
            .slice(0, limit)
            .map((item, index) => (
              <InsightRow
                key={item.type_id}
                index={index + 1}
                title={item.type_name}
                subtitle={`${item.category_name} · ${item.departments.length} department(s)`}
                value={<CurrencyText value={item.currentAmount} />}
                onClick={() => onFilterItem(item.type_id)}
              />
            ))
        }
      </InsightCard>

      <InsightCard
        title="Department Total Ranking"
        icon={<Building2 size={18} />}
      >
        {(limit) =>
          departmentRanking
            .slice(0, limit)
            .map((department, index) => (
              <InsightRow
                key={department.department_id}
                index={index + 1}
                title={department.department_name}
                subtitle={`${formatNumber(department.itemsCount)} item row(s)`}
                value={<CurrencyText value={department.totalAmount} />}
                onClick={() => onFilterDepartment(department.department_id)}
              />
            ))
        }
      </InsightCard>

      <InsightCard
        title="Duplicate Items Across Departments"
        icon={<PackageSearch size={18} />}
      >
        {(limit) =>
          duplicateItems
            .slice(0, limit)
            .map((item, index) => (
              <InsightRow
                key={item.type_id}
                index={index + 1}
                title={item.type_name}
                subtitle={`Requested by ${item.departments.length} departments`}
                value={<CurrencyText value={item.currentAmount} />}
                onClick={() => onFilterItem(item.type_id)}
              />
            ))
        }
      </InsightCard>

      <InsightCard
        title="Unit Price Variance Warnings"
        icon={<AlertTriangle size={18} />}
      >
        {(limit) =>
          varianceItems.slice(0, limit).map((item, index) => (
            <InsightRow
              key={item.type_id}
              index={index + 1}
              title={item.type_name}
              subtitle={
                <>
                  Low <CurrencyText value={item.minPrice} /> · High{" "}
                  <CurrencyText value={item.maxPrice} />
                </>
              }
              value={<CurrencyText value={item.variance} />}
              danger
              onClick={() => onFilterItem(item.type_id)}
            />
          ))
        }
      </InsightCard>
    </section>
  );
}

function InsightCard({ title, icon, action, children }) {
  const [limit, setLimit] = useState(10);

  const renderedChildren = children(limit);

  return (
    <div className="min-w-0">
      {" "}
      <CollapsibleSection
        title={title}
        icon={icon}
        defaultOpen={false}
        openText="Hide"
        closedText="Show"
        action={action}
        bodyClassName="p-0"
      >
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Show</span>

            {LIMIT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLimit(option)}
                className={[
                  "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                  limit === option
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                Top {option}
              </button>
            ))}
          </div>
        </div>

        <div className="enterprise-scrollbar h-[360px] space-y-3 overflow-y-auto p-4">
          {renderedChildren.length > 0 ? (
            renderedChildren
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
              No insights found.
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function InsightRow({ index, title, subtitle, value, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-500 shadow-sm">
          {index}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div
        className={`shrink-0 text-sm font-bold ${
          danger ? "text-red-600" : "text-blue-600"
        }`}
      >
        {value}
      </div>
    </button>
  );
}
