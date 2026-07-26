import { X } from "lucide-react";
import { useMemo } from "react";

import CurrencyText from "../CurrencyText";
import SortableHeader from "../SortableHeader";
import TablePagination from "../TablePagination";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function DetailGrid({ fields }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <div
          key={field.label}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            {field.label}
          </p>
          <div className="mt-2 text-sm font-bold text-slate-900">
            {field.currency ? (
              <CurrencyText value={field.value || 0} />
            ) : (
              formatValue(field.value)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BudgetAnalyticsDetailsDrawer({
  open,
  onClose,
  title,
  subtitle,
  fields = [],
  relatedTitle,
  relatedRows = [],
  relatedColumns = [],
}) {
  const visibleRelatedColumns = relatedColumns.filter(Boolean);
  const {
    sortedRows,
    sortColumn,
    sortDirection,
    handleSort,
  } = useTableSort(relatedRows, visibleRelatedColumns[0]?.key, "asc");
  const pagination = usePagination(sortedRows.length, 15);
  const paginatedRelatedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Analytics Details
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Close details"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="enterprise-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          <DetailGrid fields={fields} />

          {visibleRelatedColumns.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">
                {relatedTitle || "Related Records"}
              </h3>
              <div className="enterprise-scrollbar mt-4 overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      {visibleRelatedColumns.map((column) => (
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
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleRelatedColumns.length}
                          className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          No related records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRelatedRows.map((row, index) => (
                        <tr
                          key={row.id || `${pagination.page}-${index}`}
                          className="border-b border-slate-100 transition hover:bg-blue-50/40"
                        >
                          {visibleRelatedColumns.map((column) => (
                            <td
                              key={column.key}
                              className={[
                                "border border-slate-100 px-4 py-3 align-top font-semibold text-slate-700",
                                column.tdClassName || "",
                              ].join(" ")}
                            >
                              {column.currency ? (
                                <CurrencyText value={row[column.key] || 0} />
                              ) : (
                                formatValue(row[column.key])
                              )}
                            </td>
                          ))}
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
                pageSizes={[15, 25, 50]}
              />
            </section>
          )}
        </div>
      </div>
    </AnimatedDrawer>
  );
}
