import { useMemo } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";

import CurrencyText from "../CurrencyText";
import SortableHeader from "../SortableHeader";
import TablePagination from "../TablePagination";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";
import { formatDateTime } from "../../utils/dateFormatters";
import { formatQty } from "../../utils/numberFormatter";

function StatusBadge({ value, type = "year" }) {
  const normalized = String(value || "UNKNOWN").toUpperCase();
  const styles =
    type === "year"
      ? {
          OPEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
          PRE_CLOSING: "border-amber-200 bg-amber-50 text-amber-800",
          CLOSED: "border-slate-200 bg-slate-100 text-slate-700",
        }
      : {
          DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
          IN_CFO_REVIEW: "border-blue-200 bg-blue-50 text-blue-700",
          RETURNED_BY_CFO: "border-amber-200 bg-amber-50 text-amber-800",
          CFO_REVIEW_COMPLETED:
            "border-emerald-200 bg-emerald-50 text-emerald-700",
        };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        styles[normalized] || "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

export default function CategoryBudgetYearsTable({
  years = [],
  isLoading = false,
  onSelect,
}) {
  const rows = useMemo(
    () =>
      years.map((year) => ({
        ...year,
        year: Number(year.financial_year || 0),
        yearStatus: year.financial_year_status,
        packageStatus: year.package_status,
        departments: Number(year.department_count || 0),
        approvedQuantity: Number(year.approved_quantity || 0),
        packageValue: Number(year.package_value || 0),
        updatedAt: year.updated_at,
      })),
    [years],
  );
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    rows,
    "year",
    "desc",
  );
  const pagination = usePagination(sortedRows.length, 10);

  const handleYearSort = (column) => {
    pagination.resetPage();
    handleSort(column);
  };

  const pagedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <CalendarDays size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Category Budget Years
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Select a financial year to view its balances and department demand.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-slate-50">
            <tr>
              <SortableHeader
                label="Financial Year"
                column="year"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleYearSort}
              />
              <SortableHeader
                label="Year Status"
                column="yearStatus"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleYearSort}
              />
              <SortableHeader
                label="Package Status"
                column="packageStatus"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleYearSort}
              />
              <SortableHeader
                label="Departments"
                column="departments"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleYearSort}
              />
              <SortableHeader
                label="Approved Quantity"
                column="approvedQuantity"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleYearSort}
              />
              <SortableHeader
                label="Package Value"
                column="packageValue"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleYearSort}
              />
              <SortableHeader
                label="Updated"
                column="updatedAt"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleYearSort}
              />
              <th className="w-28 px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  Loading category budget years...
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  No category budgets were found for this workspace.
                </td>
              </tr>
            ) : (
              pagedRows.map((year) => {
                const isCurrent = year.yearStatus !== "CLOSED";

                return (
                  <tr
                    key={year.financial_year_id}
                    className="cursor-pointer border-t border-slate-200 transition hover:bg-blue-50/60 focus-within:bg-blue-50/60"
                    onClick={() => onSelect?.(year)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect?.(year);
                      }
                    }}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-950">
                          FY {year.year}
                        </span>
                        {isCurrent ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                            Current
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge value={year.yearStatus} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge value={year.packageStatus} type="package" />
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-700">
                      {formatQty(year.departments)}
                    </td>
                    <td className="px-4 py-4 font-bold text-blue-700">
                      {formatQty(year.approvedQuantity)}
                    </td>
                    <td className="px-4 py-4 font-black text-slate-900">
                      <CurrencyText compact value={year.packageValue} />
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {year.updatedAt ? formatDateTime(year.updatedAt) : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect?.(year);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        View
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && sortedRows.length > 0 ? (
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
      ) : null}
    </section>
  );
}
