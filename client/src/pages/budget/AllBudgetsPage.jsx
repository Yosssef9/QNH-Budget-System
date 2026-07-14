import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Building2, Eye, Filter, Layers3 } from "lucide-react";

import Breadcrumbs from "../../components/Breadcrumbs";
import CurrencyText from "../../components/CurrencyText";
import EnterpriseSearch from "../../components/EnterpriseSearch";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import SortableHeader from "../../components/SortableHeader";
import TablePagination from "../../components/TablePagination";
import { getAllBudgets } from "../../api/budget.api";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";
import { formatDateTime } from "../../utils/dateFormatters";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
  getFinancialYearStatusLabel,
  getFinancialYearStatusStyle,
} from "../../theme/statusStyles";

const EMPTY_FILTERS = {
  departmentIds: [],
  financialYears: [],
  budgetStatuses: [],
  financialYearStatuses: [],
  categoryStatuses: [],
};

const CATEGORY_LABELS = {
  IT: "IT",
  BIOMEDICAL: "Biomedical",
  GENERAL: "General",
};

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function uniqueOptions(rows, valueGetter, labelGetter = valueGetter) {
  const map = new Map();

  rows.forEach((row) => {
    const value = valueGetter(row);
    if (value === null || value === undefined || value === "") return;

    if (!map.has(value)) {
      map.set(value, {
        value,
        label: String(labelGetter(row) ?? value),
      });
    }
  });

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function toSearchValue(value) {
  return String(value ?? "").toLowerCase();
}

function StatusPill({ status, type = "budget" }) {
  const style =
    type === "financialYear"
      ? getFinancialYearStatusStyle(status).badge
      : getBudgetStatusStyle(status).badge;
  const label =
    type === "financialYear"
      ? getFinancialYearStatusLabel(status)
      : getBudgetStatusLabel(status);

  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}

function CategoryProgress({ statuses = {} }) {
  return (
    <div className="flex min-w-[260px] flex-col gap-2">
      {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
        <div key={code} className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </span>
          <StatusPill status={statuses[code] || "DRAFT"} />
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, children }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {Icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={17} />
          </span>
        ) : null}
      </div>
      <div className="mt-2 min-w-0 break-words text-2xl font-black text-slate-950">
        {children || value}
      </div>
    </article>
  );
}

export default function AllBudgetsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const { data = [], isLoading } = useQuery({
    queryKey: ["all-budgets"],
    queryFn: getAllBudgets,
  });

  const departmentOptions = useMemo(
    () =>
      uniqueOptions(
        data,
        (row) => row.department_id,
        (row) => row.department_name,
      ),
    [data],
  );

  const financialYearOptions = useMemo(
    () => uniqueOptions(data, (row) => row.financial_year),
    [data],
  );

  const budgetStatusOptions = useMemo(
    () =>
      uniqueOptions(
        data,
        (row) => row.status,
        (row) => getBudgetStatusLabel(row.status),
      ),
    [data],
  );

  const financialYearStatusOptions = useMemo(
    () =>
      uniqueOptions(
        data,
        (row) => row.financial_year_status,
        (row) => getFinancialYearStatusLabel(row.financial_year_status),
      ),
    [data],
  );

  const categoryStatusOptions = useMemo(() => {
    const statuses = new Set();
    data.forEach((row) => {
      Object.values(row.category_statuses || {}).forEach((status) => {
        if (status) statuses.add(status);
      });
    });

    return [...statuses].sort().map((status) => ({
      value: status,
      label: getBudgetStatusLabel(status),
    }));
  }, [data]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((budget) => {
      const categoryStatuses = Object.values(budget.category_statuses || {});
      const searchMatch =
        !query ||
        [
          budget.department_name,
          budget.department_code,
          budget.financial_year,
          getBudgetStatusLabel(budget.status),
          getFinancialYearStatusLabel(budget.financial_year_status),
          ...categoryStatuses.map(getBudgetStatusLabel),
        ].some((value) => toSearchValue(value).includes(query));

      const departmentMatch =
        filters.departmentIds.length === 0 ||
        filters.departmentIds.includes(budget.department_id);

      const financialYearMatch =
        filters.financialYears.length === 0 ||
        filters.financialYears.includes(budget.financial_year);

      const budgetStatusMatch =
        filters.budgetStatuses.length === 0 ||
        filters.budgetStatuses.includes(budget.status);

      const financialYearStatusMatch =
        filters.financialYearStatuses.length === 0 ||
        filters.financialYearStatuses.includes(budget.financial_year_status);

      const categoryStatusMatch =
        filters.categoryStatuses.length === 0 ||
        categoryStatuses.some((status) =>
          filters.categoryStatuses.includes(status),
        );

      return (
        searchMatch &&
        departmentMatch &&
        financialYearMatch &&
        budgetStatusMatch &&
        financialYearStatusMatch &&
        categoryStatusMatch
      );
    });
  }, [data, filters, search]);

  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    filteredRows,
    "financial_year",
    "desc",
  );

  const pagination = usePagination(sortedRows.length, 25);

  const paginatedRows = useMemo(
    () =>
      sortedRows.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize,
      ),
    [pagination.page, pagination.pageSize, sortedRows],
  );

  const totals = useMemo(
    () =>
      data.reduce(
        (summary, budget) => {
          summary.requestedQuantity += Number(
            budget.total_requested_quantity || 0,
          );
          summary.approvedQuantity += Number(budget.total_approved_quantity || 0);
          summary.approvedAmount += Number(budget.total_approved_amount || 0);
          if (budget.status === "CATEGORY_REVIEW_COMPLETED") {
            summary.completedBudgets += 1;
          }
          return summary;
        },
        {
          requestedQuantity: 0,
          approvedQuantity: 0,
          approvedAmount: 0,
          completedBudgets: 0,
        },
      ),
    [data],
  );

  function updateFilter(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    pagination.resetPage();
  }

  function clearFilters() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    pagination.resetPage();
  }

  const hasFilters =
    search ||
    Object.values(filters).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value),
    );

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[{ label: "Dashboard", path: "/" }, { label: "All Budgets" }]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <Building2 size={14} />
              Department Annual Budgets
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              All Budgets
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Each row is one full department annual budget. Category progress
              summarizes IT, Biomedical, and General, while amounts come from
              package sub-item pricing and department allocations.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Budgets" value={data.length} icon={Building2} />
        <MetricCard
          label="Fully Reviewed"
          value={totals.completedBudgets}
          icon={Layers3}
        />
        <MetricCard
          label="Approved Quantity"
          value={formatQuantity(totals.approvedQuantity)}
          icon={BarChart3}
        />
        <MetricCard label="Approved Amount" icon={BarChart3}>
          <CurrencyText compact value={totals.approvedAmount} />
        </MetricCard>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Filter size={18} />
              </span>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Search & Filters
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Filter by department, financial year, overall status, or any
                  category review state.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <EnterpriseSearch
              value={search}
              onChange={(value) => {
                setSearch(value);
                pagination.resetPage();
              }}
              placeholder="Search department, year, status..."
            />

            <SearchableMultiSelect
              multiple
              values={filters.departmentIds}
              options={departmentOptions}
              placeholder="Departments"
              onChange={(e) => updateFilter("departmentIds", e.target.value)}
            />

            <SearchableMultiSelect
              multiple
              values={filters.financialYears}
              options={financialYearOptions}
              placeholder="Financial Years"
              onChange={(e) => updateFilter("financialYears", e.target.value)}
            />

            <SearchableMultiSelect
              multiple
              values={filters.budgetStatuses}
              options={budgetStatusOptions}
              placeholder="Overall Status"
              onChange={(e) => updateFilter("budgetStatuses", e.target.value)}
            />

            <SearchableMultiSelect
              multiple
              values={filters.categoryStatuses}
              options={categoryStatusOptions}
              placeholder="Category Status"
              onChange={(e) => updateFilter("categoryStatuses", e.target.value)}
            />

            <SearchableMultiSelect
              multiple
              values={filters.financialYearStatuses}
              options={financialYearStatusOptions}
              placeholder="Financial Year Status"
              onChange={(e) =>
                updateFilter("financialYearStatuses", e.target.value)
              }
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <SortableHeader
                  label="Department"
                  column="department_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[230px]"
                />
                <SortableHeader
                  label="Financial Year"
                  column="financial_year"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[150px]"
                />
                <SortableHeader
                  label="FY Status"
                  column="financial_year_status"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[150px]"
                />
                <SortableHeader
                  label="Overall Status"
                  column="status"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[180px]"
                />
                <th className="w-[300px] border border-slate-200 px-4 py-3">
                  Category Progress
                </th>
                <SortableHeader
                  label="Submitted"
                  column="submitted_category_count"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[130px] text-center"
                />
                <SortableHeader
                  label="Reviewed"
                  column="completed_category_count"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[130px] text-center"
                />
                <SortableHeader
                  label="Items"
                  column="items_count"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[110px] text-right"
                />
                <SortableHeader
                  label="Requested Qty"
                  column="total_requested_quantity"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[160px] text-right"
                />
                <SortableHeader
                  label="Approved Qty"
                  column="total_approved_quantity"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[160px] text-right"
                />
                <SortableHeader
                  label="Approved Amount"
                  column="total_approved_amount"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[180px] text-right"
                />
                <SortableHeader
                  label="Last Submitted"
                  column="last_submitted_at"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[180px]"
                />
                <SortableHeader
                  label="Last Reviewed"
                  column="last_reviewed_at"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[180px]"
                />
                <th className="w-[120px] border border-slate-200 px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="14" className="p-8 text-center text-slate-500">
                    Loading budgets...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="14" className="p-8 text-center text-slate-500">
                    No budgets found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((budget) => (
                  <tr
                    key={budget.id}
                    onClick={() => navigate(`/budgets/view/${budget.id}`)}
                    className="cursor-pointer border-t border-slate-200 transition hover:bg-blue-50/50"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/budgets/view/${budget.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-black text-slate-950">
                        {budget.department_name}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {budget.department_code || "Department"}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top font-bold text-slate-700">
                      FY {budget.financial_year}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <StatusPill
                        status={budget.financial_year_status}
                        type="financialYear"
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <StatusPill status={budget.status} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <CategoryProgress statuses={budget.category_statuses} />
                    </td>
                    <td className="px-4 py-4 text-center align-top font-black text-blue-700">
                      {budget.submitted_category_count || 0} /{" "}
                      {budget.category_count || 3}
                    </td>
                    <td className="px-4 py-4 text-center align-top font-black text-emerald-700">
                      {budget.completed_category_count || 0} /{" "}
                      {budget.category_count || 3}
                    </td>
                    <td className="px-4 py-4 text-right align-top font-semibold text-slate-700">
                      {budget.items_count || 0}
                    </td>
                    <td className="px-4 py-4 text-right align-top font-semibold text-slate-700">
                      {formatQuantity(budget.total_requested_quantity)}
                    </td>
                    <td className="px-4 py-4 text-right align-top font-bold text-blue-700">
                      {formatQuantity(budget.total_approved_quantity)}
                    </td>
                    <td className="px-4 py-4 text-right align-top font-black text-blue-700">
                      <CurrencyText compact value={budget.total_approved_amount} />
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">
                      {budget.last_submitted_at
                        ? formatDateTime(budget.last_submitted_at)
                        : "-"}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">
                      {budget.last_reviewed_at
                        ? formatDateTime(budget.last_reviewed_at)
                        : "-"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Link
                        to={`/budgets/view/${budget.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    </td>
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
      </section>
    </div>
  );
}
