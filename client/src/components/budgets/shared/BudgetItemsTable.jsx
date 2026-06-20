
  import { memo, useMemo } from "react";
  import { formatNumber } from "../../../utils/formatters";
  import CurrencyText from "../../../components/CurrencyText";
  import BudgetMethodBadge from "../../../components/budgets/shared/BudgetMethodBadge";
  import CreatedFromTransferBadge from "../../CreatedFromTransferBadge";
  import SortableHeader from "../../SortableHeader";
  import useTableSort from "../../../hooks/useTableSort";
  import PriceIntelligenceStatusBadge from "../price-intelligence/PriceIntelligenceStatusBadge";
 

  function formatPercent(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) return "-";

    return `${numberValue > 0 ? "+" : ""}${numberValue.toFixed(1)}%`;
  }

  function PriceVarianceCell({ intelligence }) {
    if (!intelligence?.historical_benchmark) {
      return <span className="text-slate-400">-</span>;
    }

    return (
      <div className="text-center">
        <p
          className={[
            "font-bold",
            Number(intelligence.variance_amount || 0) > 0
              ? "text-red-600"
              : "text-emerald-600",
          ].join(" ")}
        >
          {formatPercent(intelligence.variance_percent)}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          <CurrencyText value={intelligence.variance_amount || 0} />
        </p>
      </div>
    );
  }

  function PotentialImpactCell({ intelligence }) {
    if (!intelligence?.historical_benchmark) {
      return <span className="text-slate-400">-</span>;
    }

    const impact = Number(intelligence.potential_impact || 0);
    const impactClass =
      impact > 0
        ? "text-red-600"
        : impact < 0
          ? "text-emerald-600"
          : "text-slate-600";
    const impactLabel =
      impact > 0
        ? "Estimated overspend"
        : impact < 0
          ? "Below benchmark"
          : "No line impact";

    return (
      <div className="text-center">
        <p className={["font-bold", impactClass].join(" ")}>
          {impact > 0 && <span>+</span>}
          {impact < 0 && <span>-</span>}
          <CurrencyText value={Math.abs(impact)} />
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{impactLabel}</p>
      </div>
    );
  }

  function BudgetItemsTable({
    items = [],
    showNotes = false,
    itemNotes = {},
    onItemNoteChange,
    showPriceIntelligence = false,
    onViewPriceIntelligence,
    readOnly = true,
  }) {
    const sortableItems = useMemo(
      () =>
        items.map((item) => ({
          ...item,
          price_intelligence_historical_benchmark:
            item.price_intelligence?.historical_benchmark,
          price_intelligence_variance_percent:
            item.price_intelligence?.variance_percent,
          price_intelligence_potential_impact:
            item.price_intelligence?.potential_impact,
          price_intelligence_status: item.price_intelligence?.status_label,
        })),
      [items],
    );

  const { sortedRows, sortColumn, sortDirection, handleSort } =
    useTableSort(
      sortableItems,
      "total_amount",
      "desc",
    );

  const stickyHeaderCell = "sticky bg-white";
  const stickyBodyCell = "sticky bg-white";
  const tableWidthClass = showPriceIntelligence
    ? showNotes
      ? "w-[2310px]"
      : "w-[2010px]"
    : showNotes
      ? "w-[1620px]"
      : "w-[1320px]";

    return (
      <div
        className="
          h-full
          min-h-0
          overflow-auto
          isolate

          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm

          scrollbar-thin
          scrollbar-thumb-slate-300
          scrollbar-track-slate-100
        "
      >
        <table
          className={[
            "table-fixed border-collapse bg-white text-sm",
            tableWidthClass,
          ].join(" ")}
        >
          <colgroup>
            <col className="w-[70px]" />
            <col className="w-[220px]" />
            <col className="w-[260px]" />
            <col className="w-[140px]" />
            <col className="w-[160px]" />
            <col className="w-[140px]" />
            <col className="w-[160px]" />
            <col className="w-[170px]" />
            {showPriceIntelligence && (
              <>
                <col className="w-[210px]" />
                <col className="w-[170px]" />
                <col className="w-[200px]" />
                <col className="w-[110px]" />
              </>
            )}
            {showNotes && <col className="w-[300px]" />}
          </colgroup>
          <thead
            className="
    sticky
    top-0
    z-20
    bg-white
    border-b
    border-slate-300
  "
        >
            <tr className="text-slate-700">
              <th
              className={[
                stickyHeaderCell,
                "left-0 z-30 w-[70px] border border-slate-200 px-3 py-4",
              ].join(" ")}
              >
                #
              </th>

              <SortableHeader
                label="Category"
                column="category_name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              className={[
                stickyHeaderCell,
                "left-[70px] z-30 w-[220px] border border-slate-200",
              ].join(" ")}
              />

              <SortableHeader
                label="Item / Type"
                column="type_name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
              onSort={handleSort}
              className={[
                stickyHeaderCell,
                "left-[290px] z-30 w-[260px] border border-slate-200",
              ].join(" ")}
            />

              <SortableHeader
                label="Expense"
                column="expense_type"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[140px]"
              />

              <SortableHeader
                label="Method"
                column="distribution_method"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[160px]"
              />

              <SortableHeader
                label="Quantity"
                column="quantity"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[140px]"
              />

              <SortableHeader
                label="Budget Unit Price"
                column="unit_price"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[160px]"
              />

              <SortableHeader
                label="Budget Line Total"
                column="total_amount"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[170px]"
              />

              {showPriceIntelligence && (
                <>
                  <SortableHeader
                    label="Historical Unit Benchmark"
                    column="price_intelligence_historical_benchmark"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="w-[210px]"
                  />

                  <SortableHeader
                    label="Unit Price Variance"
                    column="price_intelligence_variance_percent"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="w-[170px]"
                  />

                  <SortableHeader
                    label="Estimated Line Impact"
                    column="price_intelligence_potential_impact"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="w-[200px]"
                  />

                  <th className="w-[110px] border border-slate-200 px-4 py-4">
                    Details
                  </th>
                </>
              )}

              {showNotes && (
                <th className="w-[300px] border border-slate-200 px-4 py-4">
                  Approver Note
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((item, index) => (
              <tr
                key={item.id}
                id={`budget-item-row-${item.id}`}
                className="group relative hover:bg-slate-50"
              >
                <td
                className={[
                  stickyBodyCell,
                  "left-0 z-20 w-[70px] border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600",
                ].join(" ")}
                >
                  {index + 1}
                </td>

                <td
                className={[
                  stickyBodyCell,
                  "left-[70px] z-20 w-[220px] border border-slate-200 px-3 py-4 font-semibold text-slate-800",
                ].join(" ")}
                >
                  {item.category_name}
                </td>

                <td
                className={[
                  stickyBodyCell,
                  "left-[290px] z-20 w-[260px] border border-slate-200 px-3 py-4",
                ].join(" ")}
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-slate-800">
                      {item.type_name}
                    </div>

                    {Boolean(item.created_from_transfer) && (
                      <CreatedFromTransferBadge />
                    )}
                  </div>
                </td>

                <td className="border border-slate-200 px-3 py-4 text-center">
                  {item.expense_type && (
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${
                        item.expense_type === "CAPEX"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {item.expense_type}
                    </span>
                  )}
                </td>

                <td className="border border-slate-200 px-3 py-4">
                  <BudgetMethodBadge
                    method={item.distribution_method}
                    level={item.distribution_level}
                  />
                </td>

                <td className="border border-slate-200 px-3 py-4 text-center font-bold">
                  {formatNumber(item.quantity)}
                </td>

                <td className="border border-slate-200 px-3 py-4 text-center">
                  <CurrencyText value={item.unit_price} />
                </td>

                <td className="border border-slate-200 px-3 py-4 text-center font-bold text-blue-600">
                  <CurrencyText value={item.total_amount} />
                </td>

                {showPriceIntelligence && (
                  <>
                    <td className="border border-slate-200 px-3 py-4 text-center">
                      {item.price_intelligence?.historical_benchmark ? (
                        <div>
                          <p className="font-bold text-slate-900">
                            <CurrencyText
                              value={item.price_intelligence.historical_benchmark}
                            />
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {item.price_intelligence.evidence_strength}
                            evidence
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">
                          No benchmark
                        </span>
                      )}
                    </td>

                    <td className="border border-slate-200 px-3 py-4">
                      <PriceVarianceCell
                      intelligence={item.price_intelligence} />
                    </td>

                    <td className="border border-slate-200 px-3 py-4">
                      <PotentialImpactCell
                        intelligence={item.price_intelligence}
                      />
                    </td>

                    <td className="border border-slate-200 px-3 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => onViewPriceIntelligence?.(item)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        View
                      </button>
                    </td>
                  </>
                )}

                {showNotes && (
                  <td className="border border-slate-200 px-3 py-4">
                    <input
                      value={itemNotes[item.id] || ""}
                      onChange={(e) =>
                        onItemNoteChange?.(item.id, e.target.value)
                      }
                      placeholder="Optional item note"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        px-3
                        py-2
                        text-sm
                        outline-none
                        transition
                        focus:border-blue-300
                        focus:ring-2
                        focus:ring-blue-100
                      "
                    />
                  </td>
                )}
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td
                  colSpan={
                    8 + (showPriceIntelligence ? 4 : 0) + (showNotes ? 1 :
                    0)
                  }
                  className="
                    border
                    border-slate-200
                    px-4
                    py-10
                    text-center
                    text-sm
                    font-semibold
                    text-slate-500
                  "
                >
                  No budget items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  export default memo(BudgetItemsTable);
