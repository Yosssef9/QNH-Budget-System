import { useMemo } from "react";

import SortableHeader from "../SortableHeader";
import TablePagination from "../TablePagination";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";

function cellValue(row, column) {
  if (typeof column.render === "function") {
    return column.render(row);
  }

  const value = row[column.key];
  return value === null || value === undefined || value === "" ? "-" : value;
}

export default function BudgetAnalyticsTable({
  rows = [],
  columns = [],
  tableKey,
  defaultSort,
  defaultDirection = "desc",
  rowKey,
  onView,
}) {
  const visibleColumns = columns.filter(Boolean);
  const showDetailsColumn = typeof onView === "function";
  const tableColumnCount =
    visibleColumns.length + (showDetailsColumn ? 1 : 0);
  const {
    sortedRows,
    sortColumn,
    sortDirection,
    handleSort,
  } = useTableSort(
    rows,
    defaultSort || visibleColumns[0]?.key,
    defaultDirection,
  );
  const pagination = usePagination(sortedRows.length, 25);

  const pageRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  function getRowKey(row, index) {
    if (typeof rowKey === "function") {
      return rowKey(row, index);
    }

    return `${tableKey || "analytics"}-${index}`;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="enterprise-scrollbar overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              {visibleColumns.map((column) => (
                <SortableHeader
                  key={column.key}
                  label={column.label}
                  column={column.key}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className={column.className}
                />
              ))}
              {showDetailsColumn && (
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Details
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(tableColumnCount, 1)}
                  className="px-6 py-12 text-center text-sm font-semibold text-slate-500"
                >
                  No analytics rows match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  className="border-b border-slate-100 transition hover:bg-blue-50/40"
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`border border-slate-100 px-4 py-3 align-top font-semibold text-slate-700 ${column.tdClassName || ""}`}
                    >
                      {cellValue(row, column)}
                    </td>
                  ))}
                  {showDetailsColumn && (
                    <td className="border border-slate-100 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onView(row)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        View
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
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
