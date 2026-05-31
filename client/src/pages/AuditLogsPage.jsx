import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Filter,
  History,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import DatePicker from "../components/DatePicker";
import { getAuditLogs, getAuditLogUsers } from "../api/budget.api";
import { formatDateTime } from "../utils/dateFormatters";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
const emptyFilters = {
  search: "",
  user: "",
  action: "",
  entityType: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  pageSize: 50,
};

const actionOptions = [
  "CREATE_FINANCIAL_YEAR",
  "PRE_CLOSE_FINANCIAL_YEAR",
  "CLOSE_FINANCIAL_YEAR",
  "CREATE_CATEGORY",
  "UPDATE_CATEGORY",
  "DEACTIVATE_CATEGORY",
  "CREATE_TYPE",
  "UPDATE_TYPE",
  "DEACTIVATE_TYPE",
  "SUBMIT_BUDGET",
  "SAVE_BUDGET",
  "APPROVE_BUDGET",
  "RETURN_BUDGET",
];

const entityTypeOptions = [
  "FINANCIAL_YEAR",
  "BUDGET",
  "BUDGET_CATEGORY",
  "BUDGET_TYPE",
  "BUDGET_ITEM",
  "USER_ACCESS",
];
const actionDropdownOptions = actionOptions.map((action) => ({
  value: action,
  label: action,
}));

const entityTypeDropdownOptions = entityTypeOptions.map((entityType) => ({
  value: entityType,
  label: entityType,
}));

const pageSizeOptions = [
  { value: 25, label: "25 rows" },
  { value: 50, label: "50 rows" },
  { value: 100, label: "100 rows" },
];
function hasAdvancedFilters(filters) {
  return Boolean(
    filters.user ||
    filters.action ||
    filters.entityType ||
    filters.dateFrom ||
    filters.dateTo,
  );
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState(emptyFilters);

  const queryParams = useMemo(() => filters, [filters]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", queryParams],
    queryFn: () => getAuditLogs(queryParams),
  });

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const { data: auditUsers = [] } = useQuery({
    queryKey: ["audit-log-users"],
    queryFn: getAuditLogUsers,
  });
  const userDropdownOptions = useMemo(() => {
    return auditUsers.map((user) => ({
      value: String(user.user_id),
      label: user.user_code
        ? `${user.user_name || "Unknown User"} (${user.user_code})`
        : user.user_name || "Unknown User",
    }));
  }, [auditUsers]);
  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === "page" ? value : 1,
    }));
  }

  function resetFilters() {
    setFilters(emptyFilters);
  }

  return (
    <div className="space-y-5 p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <History size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
              <p className="mt-1 text-sm text-slate-500">
                Track user activity, system changes, approvals, and setup
                updates.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            Total Logs: <span className="text-slate-950">{total}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Search action, user, entity, description, IP..."
              className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="relative lg:col-span-3">
            <User
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <div className="lg:col-span-3">
              <SearchableMultiSelect
                options={userDropdownOptions}
                value={filters.user}
                onChange={(e) => updateFilter("user", e.target.value || "")}
                placeholder="All users"
                multiple={false}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <SearchableMultiSelect
              options={pageSizeOptions}
              value={filters.pageSize}
              onChange={(e) => updateFilter("pageSize", Number(e.target.value))}
              placeholder="Rows"
              multiple={false}
              disableClear
            />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!filters.search && !hasAdvancedFilters(filters)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Filter size={16} />
            Advanced Filters
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <CalendarDays size={14} />
                Date From
              </span>
              <DatePicker
                value={filters.dateFrom}
                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                placeholder="From date"
              />
            </label>

            <label className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <CalendarDays size={14} />
                Date To
              </span>
              <DatePicker
                value={filters.dateTo}
                onChange={(e) => updateFilter("dateTo", e.target.value)}
                placeholder="To date"
              />
            </label>

            <label className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <ShieldCheck size={14} />
                Action
              </span>
              <SearchableMultiSelect
                options={actionDropdownOptions}
                value={filters.action}
                onChange={(e) => updateFilter("action", e.target.value || "")}
                placeholder="All actions"
                multiple={false}
              />
            </label>

            <label className="space-y-1">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Filter size={14} />
                Entity Type
              </span>
              <SearchableMultiSelect
                options={entityTypeDropdownOptions}
                value={filters.entityType}
                onChange={(e) =>
                  updateFilter("entityType", e.target.value || "")
                }
                placeholder="All entities"
                multiple={false}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-10 text-sm font-semibold text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={18} />
            Loading audit logs...
          </div>
        ) : isError ? (
          <div className="p-6 text-sm font-semibold text-red-600">
            Failed to load audit logs.
          </div>
        ) : (
          <>
            <div className="enterprise-scrollbar max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[1300px] border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="border border-slate-200 px-4 py-3 text-left">
                      Date
                    </th>
                    <th className="border border-slate-200 px-4 py-3 text-left">
                      User
                    </th>
                    <th className="border border-slate-200 px-4 py-3 text-left">
                      Action
                    </th>
                    <th className="border border-slate-200 px-4 py-3 text-left">
                      Entity
                    </th>
                    <th className="border border-slate-200 px-4 py-3 text-left">
                      Description
                    </th>
                    <th className="border border-slate-200 px-4 py-3 text-left">
                      IP
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-4 py-3 font-semibold text-slate-700">
                        {formatDateTime(row.created_at)}
                      </td>

                      <td className="border border-slate-200 px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {row.user_name || "-"}
                          </p>
                          {row.user_code && (
                            <p className="mt-1 text-xs text-slate-500">
                              {row.user_code}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="border border-slate-200 px-4 py-3">
                        <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {row.action}
                        </span>
                      </td>

                      <td className="border border-slate-200 px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {row.entity_name || row.entity_type}
                          </p>

                          {row.entity_id && (
                            <p className="mt-1 text-xs text-slate-500">
                              {row.entity_type} #{row.entity_id}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="border border-slate-200 px-4 py-3 text-slate-600">
                        {row.description || "-"}
                      </td>

                      <td className="border border-slate-200 px-4 py-3 text-slate-600">
                        {row.ip_address || "-"}
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        No audit logs found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold text-slate-500">
                Showing page{" "}
                <span className="text-slate-900">{filters.page}</span> of{" "}
                <span className="text-slate-900">{totalPages}</span> — Total:{" "}
                <span className="text-slate-900">{total}</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => updateFilter("page", filters.page - 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold">
                  Page {filters.page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={filters.page >= totalPages}
                  onClick={() => updateFilter("page", filters.page + 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
