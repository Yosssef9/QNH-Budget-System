import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import EnterpriseSearch from "../EnterpriseSearch";
import SearchableMultiSelect from "../SearchableMultiSelect";
import TablePagination from "../TablePagination";
import RequestedDemandDetailsDrawer from "./RequestedDemandDetailsDrawer";

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormatter.format(number) : "—";
}

function ProgressCell({ reviewed, total }) {
  const progress = total > 0 ? (reviewed / total) * 100 : 0;
  const complete = total > 0 && reviewed === total;

  return (
    <div className="min-w-[145px]">
      <div className="flex items-center justify-between gap-3 text-xs font-bold">
        <span className={complete ? "text-emerald-700" : "text-slate-600"}>
          {reviewed} / {total}
        </span>
        <span className="text-slate-400">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={[
            "h-full rounded-full transition-[width]",
            complete ? "bg-emerald-500" : "bg-blue-600",
          ].join(" ")}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

export default function RequestedDemandView({
  loading,
  error,
  onRetry,
  data,
  onGoToDepartmentReview,
}) {
  const [search, setSearch] = useState("");
  const [expenseType, setExpenseType] = useState("ALL");
  const [reviewStatus, setReviewStatus] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const items = data?.items || [];

  const expenseTypes = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.expense_type)
            .filter(Boolean),
        ),
      ).sort(),
    [items],
  );

  const expenseTypeOptions = useMemo(
    () => [
      { value: "ALL", label: "All expense types" },
      ...expenseTypes.map((value) => ({ value, label: value })),
    ],
    [expenseTypes],
  );

  const reviewStatusOptions = useMemo(
    () => [
      { value: "ALL", label: "All review statuses" },
      { value: "PENDING", label: "Needs review" },
      { value: "COMPLETED", label: "Fully reviewed" },
    ],
    [],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesSearch =
          !normalizedSearch ||
          String(item.catalog_item_name || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(item.unit_name || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(item.unit_code || "")
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesExpense =
          expenseType === "ALL" || item.expense_type === expenseType;

        const fullyReviewed =
          Number(item.department_count || 0) > 0 &&
          Number(item.reviewed_department_count || 0) ===
            Number(item.department_count || 0);

        const matchesReview =
          reviewStatus === "ALL" ||
          (reviewStatus === "COMPLETED" && fullyReviewed) ||
          (reviewStatus === "PENDING" && !fullyReviewed);

        return matchesSearch && matchesExpense && matchesReview;
      })
      .sort((left, right) => {
        const quantityDifference =
          Number(right.total_requested_quantity || 0) -
          Number(left.total_requested_quantity || 0);

        if (quantityDifference !== 0) return quantityDifference;

        return String(left.catalog_item_name || "").localeCompare(
          String(right.catalog_item_name || ""),
        );
      });
  }, [expenseType, items, reviewStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, expenseType, reviewStatus, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startIndex = (page - 1) * pageSize;
  const visibleItems = filteredItems.slice(
    startIndex,
    startIndex + pageSize,
  );

  function handleGoToDepartmentReview(departmentCategoryBudgetId, departmentBudgetItemId) {
    setSelectedItem(null);
    onGoToDepartmentReview(departmentCategoryBudgetId, departmentBudgetItemId);
  }

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-5">
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
        <h2 className="mt-3 text-lg font-black text-slate-900">
          Could not load requested demand
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The department review queue could not be loaded.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Requested Demand
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Consolidated original demand from all submitted departments in this category.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[700px]">
              <EnterpriseSearch
                value={search}
                onChange={setSearch}
                placeholder="Search item..."
                showClear
              />

              <SearchableMultiSelect
                multiple={false}
                disableClear
                value={expenseType}
                onChange={(event) => setExpenseType(event.target.value || "ALL")}
                options={expenseTypeOptions}
                placeholder="All expense types"
                searchPlaceholder="Search expense types..."
              />

              <SearchableMultiSelect
                multiple={false}
                disableClear
                value={reviewStatus}
                onChange={(event) => setReviewStatus(event.target.value || "ALL")}
                options={reviewStatusOptions}
                placeholder="All review statuses"
                searchPlaceholder="Search review statuses..."
              />
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-slate-300" />
            <h3 className="mt-3 text-base font-black text-slate-900">
              No submitted demand yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Requested demand will appear here as departments submit this category.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm font-semibold text-slate-500">
            No requested items match the current filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Item</th>
                    <th className="px-5 py-3">Expense Type</th>
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Departments</th>
                    <th className="px-5 py-3">Total Requested</th>
                    <th className="px-5 py-3">Review Progress</th>
                    <th className="px-5 py-3">Approved So Far</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((item) => (
                    <tr
                      key={item.catalog_item_id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-950">
                            {item.catalog_item_name}
                          </p>
                          {item.is_project ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                              Project
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                          {item.expense_type || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600">
                        {item.unit_name || item.unit_code || "Unit"}
                      </td>
                      <td className="px-5 py-4 font-black text-slate-950">
                        {formatNumber(item.department_count)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-lg font-black text-blue-700">
                          {formatNumber(item.total_requested_quantity)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <ProgressCell
                          reviewed={Number(item.reviewed_department_count || 0)}
                          total={Number(item.department_count || 0)}
                        />
                      </td>
                      <td className="px-5 py-4 font-black text-emerald-700">
                        {formatNumber(item.approved_so_far)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              startRow={filteredItems.length ? startIndex + 1 : 0}
              endRow={Math.min(startIndex + pageSize, filteredItems.length)}
              totalRows={filteredItems.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizes={[10, 25, 50]}
            />
          </>
        )}
      </section>

      <RequestedDemandDetailsDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onGoToDepartmentReview={handleGoToDepartmentReview}
      />
    </>
  );
}

