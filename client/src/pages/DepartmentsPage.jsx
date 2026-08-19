import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import EnterpriseSearch from "../components/EnterpriseSearch";
import LoadingSpinner from "../components/LoadingSpinner";
import SortableHeader from "../components/SortableHeader";
import TablePagination from "../components/TablePagination";
import DepartmentFormDrawer from "../components/departments/DepartmentFormDrawer";
import usePagination from "../hooks/usePagination";
import { useActiveFinancialYear } from "../hooks/financial-years/useFinancialYears";
import {
  useCreateDepartment,
  useDepartments,
  useUpdateDepartmentDescription,
  useUpdateDepartmentStatus,
} from "../hooks/departments/useDepartments";
import { formatDateTime } from "../utils/dateFormatters";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function compareValues(left, right, direction) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (typeof left === "number" || typeof right === "number") {
    return (Number(left || 0) - Number(right || 0)) * multiplier;
  }

  return String(left || "").localeCompare(String(right || "")) * multiplier;
}

function SummaryMetric({ icon: Icon, label, value, colorClass }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="truncate text-xs font-semibold uppercase text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const departmentsQuery = useDepartments();
  const financialYearQuery = useActiveFinancialYear();
  const createMutation = useCreateDepartment();
  const updateDescriptionMutation = useUpdateDepartmentDescription();
  const updateStatusMutation = useUpdateDepartmentStatus();
  const departments = departmentsQuery.data || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [drawer, setDrawer] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const summary = useMemo(
    () => ({
      total: departments.length,
      active: departments.filter((item) => item.is_active).length,
      inactive: departments.filter((item) => !item.is_active).length,
      assigned: departments.filter(
        (item) => Number(item.active_user_role_count || 0) > 0,
      ).length,
    }),
    [departments],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return departments.filter((department) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && department.is_active) ||
        (statusFilter === "INACTIVE" && !department.is_active);
      const matchesSearch =
        !normalizedSearch ||
        department.name?.toLowerCase().includes(normalizedSearch) ||
        department.department_code?.toLowerCase().includes(normalizedSearch) ||
        department.description?.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [departments, search, statusFilter]);

  const sortedRows = useMemo(() => {
    const getSortValue = (row) => {
      if (sortColumn === "status") return row.is_active ? 1 : 0;
      if (sortColumn === "assignments") return row.active_user_role_count;
      if (sortColumn === "budgets") return row.budget_count;
      return row[sortColumn];
    };

    return [...filteredRows].sort((left, right) =>
      compareValues(
        getSortValue(left),
        getSortValue(right),
        sortDirection,
      ),
    );
  }, [filteredRows, sortColumn, sortDirection]);

  const pagination = usePagination(sortedRows.length, 25);
  const visibleRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  }

  async function handleDrawerSubmit(payload) {
    if (drawer?.mode === "edit") {
      try {
        await updateDescriptionMutation.mutateAsync({
          departmentId: drawer.department.id,
          description: payload.description,
        });
        toast.success("Department description updated");
        setDrawer(null);
      } catch (error) {
        toast.error(errorMessage(error, "Failed to update department"));
      }
      return;
    }

    try {
      const created = await createMutation.mutateAsync(payload);
      const provisioning = created?.provisioning;
      toast.success(
        provisioning
          ? `Department added with ${provisioning.category_budget_count} category budgets for ${provisioning.financial_year}`
          : "Department added successfully",
      );
      setDrawer(null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to add department"));
    }
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;

    try {
      const updated = await updateStatusMutation.mutateAsync({
        departmentId: statusTarget.id,
        isActive: !statusTarget.is_active,
      });
      toast.success(
        updated.is_active
          ? updated.provisioning
            ? `Department activated and added to financial year ${updated.provisioning.financial_year}`
            : "Department activated"
          : "Department deactivated",
      );
      setStatusTarget(null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update department status"));
    }
  }

  const saving =
    createMutation.isPending || updateDescriptionMutation.isPending;

  return (
    <div className="space-y-5 p-4 text-slate-800 sm:p-6">
      <Breadcrumbs />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Departments</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Maintain the hospital department directory and control which
            departments participate in future budget cycles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ mode: "create", department: null })}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Department
        </button>
      </header>

      <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-slate-200">
        <SummaryMetric
          icon={Building2}
          label="Total Departments"
          value={summary.total}
          colorClass="bg-blue-50 text-blue-700"
        />
        <SummaryMetric
          icon={ShieldCheck}
          label="Active"
          value={summary.active}
          colorClass="bg-emerald-50 text-emerald-700"
        />
        <SummaryMetric
          icon={Power}
          label="Inactive"
          value={summary.inactive}
          colorClass="bg-slate-100 text-slate-600"
        />
        <SummaryMetric
          icon={Users}
          label="With Assignments"
          value={summary.assigned}
          colorClass="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <EnterpriseSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              pagination.resetPage();
            }}
            placeholder="Search department name, code, or description"
            className="max-w-xl"
          />

          <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 lg:w-auto">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value);
                  pagination.resetPage();
                }}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition lg:flex-none ${
                  statusFilter === filter.value
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {departmentsQuery.isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : departmentsQuery.isError ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="font-semibold text-red-700">
              {errorMessage(
                departmentsQuery.error,
                "Failed to load departments",
              )}
            </p>
            <button
              type="button"
              onClick={() => departmentsQuery.refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[24%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <SortableHeader
                      label="Department"
                      column="name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-left"
                    />
                    <SortableHeader
                      label="Description"
                      column="description"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-left"
                    />
                    <SortableHeader
                      label="Status"
                      column="status"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-left"
                    />
                    <SortableHeader
                      label="Assignments"
                      column="assignments"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-left"
                    />
                    <SortableHeader
                      label="Budgets"
                      column="budgets"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-left"
                    />
                    <SortableHeader
                      label="Created"
                      column="created_at"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-left"
                    />
                    <th className="border border-slate-200 px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((department) => (
                    <tr
                      key={department.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Building2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <p
                              title={department.name}
                              className="truncate font-bold text-slate-900"
                            >
                              {department.name}
                            </p>
                            <p
                              title={department.department_code}
                              className="mt-1 truncate font-mono text-xs text-slate-500"
                            >
                              {department.department_code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <p
                          title={department.description || undefined}
                          className="line-clamp-2 break-words"
                        >
                          {department.description || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            department.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {department.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top font-semibold text-slate-700">
                        {department.active_user_role_count}
                      </td>
                      <td className="px-4 py-4 align-top font-semibold text-slate-700">
                        {department.budget_count}
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-slate-600">
                        <p>{formatDateTime(department.created_at)}</p>
                        <p
                          className="mt-1 truncate"
                          title={department.created_by_name || undefined}
                        >
                          {department.created_by_name || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            title="Edit description"
                            onClick={() =>
                              setDrawer({ mode: "edit", department })
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 transition hover:bg-blue-100"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            title={
                              department.is_active
                                ? "Deactivate department"
                                : "Activate department"
                            }
                            onClick={() => setStatusTarget(department)}
                            className={`rounded-lg border p-2 transition ${
                              department.is_active
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {visibleRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-16 text-center text-sm font-semibold text-slate-500"
                      >
                        No departments match the current search and status filter.
                      </td>
                    </tr>
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
          </>
        )}
      </section>

      <DepartmentFormDrawer
        open={Boolean(drawer)}
        mode={drawer?.mode}
        department={drawer?.department}
        financialYear={financialYearQuery.data}
        saving={saving}
        onClose={() => setDrawer(null)}
        onSubmit={handleDrawerSubmit}
      />

      <ConfirmModal
        open={Boolean(statusTarget)}
        title={`${statusTarget?.is_active ? "Deactivate" : "Activate"} Department?`}
        message={
          statusTarget?.is_active ? (
            <>
              <p>
                Deactivate <strong>{statusTarget?.name}</strong> for future
                budget cycles?
              </p>
              <p className="mt-2">
                Historical budgets remain unchanged. Active assignments or a
                current financial-year budget may prevent this action.
              </p>
            </>
          ) : (
            <>
              <p>
                Activate <strong>{statusTarget?.name}</strong>?
              </p>
              <p className="mt-2">
                If the open financial year still accepts department onboarding,
                the three category budgets will be created automatically.
              </p>
            </>
          )
        }
        confirmText={statusTarget?.is_active ? "Deactivate" : "Activate"}
        danger={Boolean(statusTarget?.is_active)}
        loading={updateStatusMutation.isPending}
        onCancel={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
