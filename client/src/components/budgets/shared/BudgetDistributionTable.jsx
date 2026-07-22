import { MONTHS as months } from "../../../constants/months.constants";
import { memo } from "react";

import BudgetDistributionRow from "./BudgetDistributionRow";
function BudgetDistributionTable({
  paginatedRows,
  rows,

  budgetItemsPage,

  categories,
  typesByCategory,
  methodOptions,

  duplicateTypeRowIds,
  deletingRowIds,

  isBudgetLocked,

  getMonthlyDistribution,
  getQuarterlyDistribution,
  getDistributedQuantity,
  getSelectedType,

  updateRow,
  updateMonthly,
  updateQuarterly,

  setDeleteRowId,
}) {
  return (
    <table className="w-full min-w-[1550px] table-fixed border-collapse text-sm">
      <colgroup>
        <col className="w-[72px]" />
        <col className="w-[220px]" />
        <col className="w-[280px]" />
        <col className="w-[210px]" />
        <col className="w-[130px]" />
        {months.map((month) => (
          <col key={month} className="w-[76px]" />
        ))}
        <col className="w-[110px]" />
      </colgroup>

      <thead className="sticky top-0 z-20 bg-white">
        <tr className="text-slate-700">
          <th
            rowSpan="2"
            className="w-[72px] border border-slate-200 px-3 py-4"
          >
            #
          </th>
          <th
            rowSpan="2"
            className="w-[220px] border border-slate-200 px-4 py-4"
          >
            Category
          </th>
          <th
            rowSpan="2"
            className="w-[280px] border border-slate-200 px-4 py-4"
          >
            Generic Item
          </th>
          <th
            rowSpan="2"
            className="w-[210px] border border-slate-200 px-4 py-4"
          >
            Method
          </th>
          <th
            rowSpan="2"
            className="w-[130px] border border-slate-200 px-4 py-4"
          >
            Requested Quantity
          </th>
          <th
            colSpan="3"
            className="border border-slate-200 bg-blue-50 px-4 py-3"
          >
            QUARTER 1<br />
            <span className="text-xs font-medium">Jan - Mar</span>
          </th>
          <th
            colSpan="3"
            className="border border-slate-200 bg-emerald-50 px-4 py-3"
          >
            QUARTER 2<br />
            <span className="text-xs font-medium">Apr - Jun</span>
          </th>
          <th
            colSpan="3"
            className="border border-slate-200 bg-orange-50 px-4 py-3"
          >
            QUARTER 3<br />
            <span className="text-xs font-medium">Jul - Sep</span>
          </th>
          <th
            colSpan="3"
            className="border border-slate-200 bg-violet-50 px-4 py-3"
          >
            QUARTER 4<br />
            <span className="text-xs font-medium">Oct - Dec</span>
          </th>
          <th
            rowSpan="2"
            className="w-[110px] border border-slate-200 px-4 py-4"
          >
            Actions
          </th>
        </tr>

        <tr>
          {months.map((month) => (
            <th
              key={month}
              className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
            >
              {month}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {paginatedRows.map((row, rowIndex) => (
          <BudgetDistributionRow
            key={row.id}
            row={row}
            rowIndex={rowIndex}
            budgetItemsPage={budgetItemsPage}
            categories={categories}
            typesByCategory={typesByCategory}
            methodOptions={methodOptions}
            duplicateTypeRowIds={duplicateTypeRowIds}
            deletingRowIds={deletingRowIds}
            isBudgetLocked={isBudgetLocked}
            getMonthlyDistribution={getMonthlyDistribution}
            getQuarterlyDistribution={getQuarterlyDistribution}
            getDistributedQuantity={getDistributedQuantity}
            getSelectedType={getSelectedType}
            updateRow={updateRow}
            updateMonthly={updateMonthly}
            updateQuarterly={updateQuarterly}
            setDeleteRowId={setDeleteRowId}
          />
        ))}

        {rows.length === 0 && (
          <tr>
            <td
              colSpan="18"
              className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
            >
              No budget items yet. Click Add Item to start.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
export default memo(BudgetDistributionTable);
