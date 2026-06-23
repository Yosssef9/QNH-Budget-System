import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Eye, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { getCurrentFinancialYear } from "../../api/financialYears.api";
import Breadcrumbs from "../../components/Breadcrumbs";
import CurrencyText from "../../components/CurrencyText";
import EnterpriseSearch from "../../components/EnterpriseSearch";
import SortableHeader from "../../components/SortableHeader";
import TablePagination from "../../components/TablePagination";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";
import {
  useProjectFilterOptions,
  useProjects,
} from "../../hooks/projects/useProjects";
import { formatDateTime } from "../../utils/dateFormatters";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
  getFinancialYearStatusLabel,
  getFinancialYearStatusStyle,
} from "../../theme/statusStyles";

import SearchableMultiSelect from "../../components/SearchableMultiSelect";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "RETURNED", label: "Returned" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    financialYearId: "",
    status: "",
    departmentId: "",
    budgetId: "",
    search: "",
  });

  const { data: currentFinancialYear } = useQuery({
    queryKey: ["current-financial-year"],
    queryFn: getCurrentFinancialYear,
  });

  const { data: filterOptions = {} } = useProjectFilterOptions();

  useEffect(() => {
    if (!currentFinancialYear?.id) return;

    setFilters((prev) =>
      prev.financialYearId
        ? prev
        : { ...prev, financialYearId: String(currentFinancialYear.id) },
    );
  }, [currentFinancialYear]);

  const apiFilters = useMemo(
    () => ({
      financialYearId: filters.financialYearId || undefined,
      status: filters.status || undefined,
      departmentId: filters.departmentId || undefined,
      budgetId: filters.budgetId || undefined,
      search: filters.search.trim() || undefined,
    }),
    [filters],
  );

  const { data: projects = [], isLoading } = useProjects(apiFilters);

  const financialYearOptions = filterOptions.financialYears || [];
  const departmentOptions = useMemo(() => {
    const departments = filterOptions.departments || [];
    const budgets = filterOptions.budgets || [];

    if (!filters.financialYearId) return departments;

    const allowedDepartmentIds = new Set(
      budgets
        .filter(
          (budget) =>
            String(budget.financial_year_id) ===
            String(filters.financialYearId),
        )
        .map((budget) => Number(budget.department_id)),
    );

    return departments.filter((department) =>
      allowedDepartmentIds.has(Number(department.id)),
    );
  }, [filterOptions, filters.financialYearId]);
  const budgetOptions = useMemo(() => {
    const budgets = filterOptions.budgets || [];

    return budgets.filter((budget) => {
      const yearMatch =
        !filters.financialYearId ||
        String(budget.financial_year_id) === String(filters.financialYearId);
      const departmentMatch =
        !filters.departmentId ||
        String(budget.department_id) === String(filters.departmentId);

      return yearMatch && departmentMatch;
    });
  }, [filterOptions, filters.departmentId, filters.financialYearId]);

  useEffect(() => {
    setFilters((prev) => {
      const departmentStillAvailable =
        !prev.departmentId ||
        departmentOptions.some(
          (department) => String(department.id) === String(prev.departmentId),
        );
      const budgetStillAvailable =
        !prev.budgetId ||
        budgetOptions.some(
          (budget) => String(budget.id) === String(prev.budgetId),
        );

      if (departmentStillAvailable && budgetStillAvailable) {
        return prev;
      }

      return {
        ...prev,
        departmentId: departmentStillAvailable ? prev.departmentId : "",
        budgetId: budgetStillAvailable ? prev.budgetId : "",
      };
    });
  }, [budgetOptions, departmentOptions]);

  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    projects,
    "total_amount",
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
    setFilters({
      financialYearId: currentFinancialYear?.id
        ? String(currentFinancialYear.id)
        : "",
      status: "",
      departmentId: "",
      budgetId: "",
      search: "",
    });
    pagination.resetPage();
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[{ label: "Dashboard", path: "/" }, { label: "Projects" }]}
      />

      <section className="rounded-2xl border border-enterprise-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <BriefcaseBusiness size={24} />
            </span>

            <div>
              <p className="text-sm font-semibold tracking-wide text-violet-700">
                Project Budget Items
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-enterprise-text">
                Projects
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-enterprise-muted">
                Review budget items marked for project-level visibility across
                departments, budgets, financial years, and approval statuses.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-enterprise-border bg-enterprise-soft text-center">
            <div className="border-r border-enterprise-border px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                Projects
              </p>
              <p className="mt-1 text-lg font-bold text-enterprise-text">
                {projects.length}
              </p>
            </div>

            <div className="px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                Total Amount
              </p>
              <p className="mt-1 text-lg font-bold text-primary-700">
                <CurrencyText
                  value={projects.reduce(
                    (sum, row) => sum + Number(row.total_amount || 0),
                    0,
                  )}
                />
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
                  Filter project budget items by year, department, budget,
                  status, or project name.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Reset
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <EnterpriseSearch
              value={filters.search}
              onChange={(value) => updateFilter("search", value)}
              placeholder="Search projects..."
            />

            <SearchableMultiSelect
              multiple={false}
              value={filters.financialYearId}
              onChange={(e) =>
                updateFilter("financialYearId", String(e.target.value || ""))
              }
              placeholder="Open Financial Year"
              options={[
                {
                  value: "",
                  label: "Open Financial Year",
                },
                ...financialYearOptions.map((year) => ({
                  value: String(year.id),
                  label: `${year.year} (${getFinancialYearStatusLabel(year.status)})`,
                })),
              ]}
            />

            <SearchableMultiSelect
              multiple={false}
              value={filters.status}
              onChange={(e) =>
                updateFilter("status", String(e.target.value || ""))
              }
              placeholder="All Statuses"
              options={STATUS_OPTIONS.map((status) => ({
                value: status.value,
                label: status.label,
              }))}
            />

            <SearchableMultiSelect
              multiple={false}
              value={filters.departmentId}
              onChange={(e) =>
                updateFilter("departmentId", String(e.target.value || ""))
              }
              placeholder="All Departments"
              options={[
                {
                  value: "",
                  label: "All Departments",
                },
                ...departmentOptions.map((department) => ({
                  value: String(department.id),
                  label: department.name,
                })),
              ]}
            />

            <SearchableMultiSelect
              multiple={false}
              value={filters.budgetId}
              onChange={(e) =>
                updateFilter("budgetId", String(e.target.value || ""))
              }
              placeholder="All Budgets"
              options={[
                {
                  value: "",
                  label: "All Budgets",
                },
                ...budgetOptions.map((budget) => ({
                  value: String(budget.id),
                  label: `${budget.department_name} Budget ${budget.financial_year}`,
                })),
              ]}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <SortableHeader
                  label="Project Name"
                  column="project_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Department"
                  column="department_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Budget"
                  column="budget_id"
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
                  label="Amount"
                  column="total_amount"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Status"
                  column="budget_status"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Created By"
                  column="created_by_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Created Date"
                  column="created_at"
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
                  <td colSpan="9" className="p-8 text-center text-slate-500">
                    Loading projects...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500">
                    No project budget items found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((project) => (
                  <tr
                    key={project.budget_item_id}
                    onClick={() =>
                      navigate(`/projects/${project.budget_item_id}`)
                    }
                    className="cursor-pointer border-t border-slate-200 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {project.project_name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {project.category_name || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {project.department_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Budget #{project.budget_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-700">
                          {project.financial_year}
                        </span>
                        <span
                          className={`inline-flex w-fit rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                            getFinancialYearStatusStyle(
                              project.financial_year_status,
                            ).badge
                          }`}
                        >
                          {getFinancialYearStatusLabel(
                            project.financial_year_status,
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary-700">
                      <CurrencyText value={project.total_amount} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${
                          getBudgetStatusStyle(project.budget_status).badge
                        }`}
                      >
                        {getBudgetStatusLabel(project.budget_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {project.created_by_name || project.created_by || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(project.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${project.budget_item_id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
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
