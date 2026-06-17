import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Filter } from "lucide-react";

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
import DatePicker from "../../components/DatePicker";

const EMPTY_FILTERS = {
  departmentIds: [],
  financialYears: [],
  budgetStatuses: [],
  financialYearStatuses: [],
  createdByIds: [],
  submittedByIds: [],
  approvedByIds: [],
  createdFrom: "",
  createdTo: "",
  submittedFrom: "",
  submittedTo: "",
  approvedFrom: "",
  approvedTo: "",
};
const DATE_FILTERS = [
  {
    label: "Created From",
    key: "createdFrom",
    maxKey: "createdTo",
  },
  {
    label: "Created To",
    key: "createdTo",
    minKey: "createdFrom",
  },
  {
    label: "Submitted From",
    key: "submittedFrom",
    maxKey: "submittedTo",
  },
  {
    label: "Submitted To",
    key: "submittedTo",
    minKey: "submittedFrom",
  },
  {
    label: "Approved From",
    key: "approvedFrom",
    maxKey: "approvedTo",
  },
  {
    label: "Approved To",
    key: "approvedTo",
    minKey: "approvedFrom",
  },
];
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

function dateInRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (date < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59`);
    if (date > toDate) return false;
  }

  return true;
}

function userName(row, nameKey, idKey) {
  return row[nameKey] || row[idKey] || "-";
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
  const createdByOptions = useMemo(
    () =>
      uniqueOptions(
        data,
        (row) => row.created_by,
        (row) => userName(row, "created_by_name", "created_by"),
      ),
    [data],
  );
  const submittedByOptions = useMemo(
    () =>
      uniqueOptions(
        data,
        (row) => row.submitted_by,
        (row) => userName(row, "submitted_by_name", "submitted_by"),
      ),
    [data],
  );

  const approvedByOptions = useMemo(
    () =>
      uniqueOptions(
        data,
        (row) => row.approved_by,
        (row) => userName(row, "approved_by_name", "approved_by"),
      ),
    [data],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((budget) => {
      const searchMatch =
        !query ||
        [
          budget.department_name,
          budget.financial_year,
          getBudgetStatusLabel(budget.status),
          getFinancialYearStatusLabel(budget.financial_year_status),
          budget.created_by_name,
          budget.submitted_by_name,
          budget.approved_by_name,
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
      const createdByMatch =
        filters.createdByIds.length === 0 ||
        filters.createdByIds.includes(budget.created_by);
      const submittedByMatch =
        filters.submittedByIds.length === 0 ||
        filters.submittedByIds.includes(budget.submitted_by);

      const approvedByMatch =
        filters.approvedByIds.length === 0 ||
        filters.approvedByIds.includes(budget.approved_by);

      const createdDateMatch = dateInRange(
        budget.created_at,
        filters.createdFrom,
        filters.createdTo,
      );

      const submittedDateMatch = dateInRange(
        budget.submitted_at,
        filters.submittedFrom,
        filters.submittedTo,
      );

      const approvedDateMatch = dateInRange(
        budget.approved_at,
        filters.approvedFrom,
        filters.approvedTo,
      );

      return (
        searchMatch &&
        departmentMatch &&
        financialYearMatch &&
        budgetStatusMatch &&
        financialYearStatusMatch &&
        createdByMatch &&
        submittedByMatch &&
        approvedByMatch &&
        createdDateMatch &&
        submittedDateMatch &&
        approvedDateMatch
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

      <section className="rounded-2xl border border-enterprise-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary-700">
              Budget Review Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-enterprise-text">
              All Budgets
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-enterprise-muted">
              Review submitted and historical budgets across departments,
              financial years, approvers, and workflow statuses.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-enterprise-border bg-enterprise-soft text-center">
            <div className="border-r border-enterprise-border px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                Total
              </p>
              <p className="mt-1 text-lg font-bold text-enterprise-text">
                {data.length}
              </p>
            </div>

            <div className="border-r border-enterprise-border px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                Showing
              </p>
              <p className="mt-1 text-lg font-bold text-enterprise-text">
                {filteredRows.length}
              </p>
            </div>

            <div className="px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                Departments
              </p>
              <p className="mt-1 text-lg font-bold text-enterprise-text">
                {departmentOptions.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-enterprise-border bg-white shadow-card">
        <div className="border-b border-enterprise-border bg-slate-50/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <Filter size={18} />
              </span>

              <div>
                <h2 className="text-lg font-bold text-enterprise-text">
                  Search & Filters
                </h2>
                <p className="mt-1 text-sm text-enterprise-muted">
                  Narrow the budget list by department, year, status, user, or
                  workflow dates.
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

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <EnterpriseSearch
              value={search}
              onChange={(value) => {
                setSearch(value);
                pagination.resetPage();
              }}
              placeholder="Search budgets..."
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
              placeholder="Budget Status"
              onChange={(e) => updateFilter("budgetStatuses", e.target.value)}
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
            <SearchableMultiSelect
              multiple
              values={filters.createdByIds}
              options={createdByOptions}
              placeholder="Created By"
              onChange={(e) => updateFilter("createdByIds", e.target.value)}
            />
            <SearchableMultiSelect
              multiple
              values={filters.submittedByIds}
              options={submittedByOptions}
              placeholder="Submitted By"
              onChange={(e) => updateFilter("submittedByIds", e.target.value)}
            />

            <SearchableMultiSelect
              multiple
              values={filters.approvedByIds}
              options={approvedByOptions}
              placeholder="Approved By"
              onChange={(e) => updateFilter("approvedByIds", e.target.value)}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {DATE_FILTERS.map(({ label, key, minKey, maxKey }) => (
              <div key={key}>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </span>

                <DatePicker
                  value={filters[key]}
                  onChange={(e) => updateFilter(key, e.target.value)}
                  placeholder={label}
                  minDate={minKey ? filters[minKey] : undefined}
                  maxDate={maxKey ? filters[maxKey] : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <SortableHeader
                  label="Department"
                  column="department_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Financial Year"
                  column="financial_year"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Budget Status"
                  column="status"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="FY Status"
                  column="financial_year_status"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Items"
                  column="items_count"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Total Amount"
                  column="total_amount"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Created By"
                  column="created_by_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />

                <SortableHeader
                  label="Created"
                  column="created_at"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Submitted By"
                  column="submitted_by_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Submitted"
                  column="submitted_at"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Approved By"
                  column="approved_by_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Approved"
                  column="approved_at"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <th className="border border-slate-200 px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="13" className="p-8 text-center text-slate-500">
                    Loading budgets...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-500">
                    No budgets found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((budget) => (
                  <tr
                    key={budget.id}
                    onClick={() => navigate(`/budgets/view/${budget.id}`)}
                    className="cursor-pointer border-t border-slate-200 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {budget.department_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {budget.financial_year}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${
                          getBudgetStatusStyle(budget.status).badge
                        }`}
                      >
                        {getBudgetStatusLabel(budget.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${
                          getFinancialYearStatusStyle(
                            budget.financial_year_status,
                          ).badge
                        }`}
                      >
                        {getFinancialYearStatusLabel(
                          budget.financial_year_status,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                      {budget.items_count}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary-700">
                      <CurrencyText value={budget.total_amount} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {userName(budget, "created_by_name", "created_by")}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(budget.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {userName(budget, "submitted_by_name", "submitted_by")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(budget.submitted_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {userName(budget, "approved_by_name", "approved_by")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(budget.approved_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/budgets/view/${budget.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
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
