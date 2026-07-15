import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  HardDrive,
  Loader2,
  Mail,
  RefreshCcw,
  Server,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { getSystemHealthSummary } from "../api/systemHealth.api";
import CollapsibleSection from "../components/CollapsibleSection";
import EnterpriseSearch from "../components/EnterpriseSearch";
import SortableHeader from "../components/SortableHeader";
import TablePagination from "../components/TablePagination";
import AnimatedDrawer from "../components/budgets/shared/drawers/AnimatedDrawer";
import useTableSort from "../hooks/useTableSort";
import { formatDateTime } from "../utils/dateFormatters";

const STATUS_STYLE = {
  HEALTHY: {
    label: "Healthy",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  DEGRADED: {
    label: "Degraded",
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CRITICAL: {
    label: "Critical",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  NOT_CONFIGURED: {
    label: "Not configured",
    icon: Clock3,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatDuration(seconds) {
  const total = Number(seconds || 0);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function HealthBadge({ status }) {
  const config = STATUS_STYLE[status] || STATUS_STYLE.NOT_CONFIGURED;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${config.className}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, helper, status }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-2 min-w-0 text-2xl font-black text-slate-950">
            {value}
          </div>
          {helper && (
            <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
          )}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
          <Icon size={22} />
        </div>
      </div>
      {status && (
        <div className="mt-4">
          <HealthBadge status={status} />
        </div>
      )}
    </div>
  );
}

function DetailDrawer({ open, onClose, title, subtitle, data }) {
  if (!open) return null;

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              System Health Details
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-sm font-medium text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close details"
          >
            <X size={20} />
          </button>
        </header>

        <main className="enterprise-scrollbar flex-1 overflow-auto p-6">
          <pre className="whitespace-pre-wrap break-words rounded-3xl border border-slate-200 bg-slate-950 p-5 text-sm leading-6 text-slate-100 shadow-sm">
            {JSON.stringify(data || {}, null, 2)}
          </pre>
        </main>
      </div>
    </AnimatedDrawer>
  );
}

function QueueTable({ items = [], onView }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    items,
    "created_at",
    "asc",
  );
  const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
        No pending, processing, or failed notifications were found.
      </div>
    );
  }

  return (
    <>
      <div className="enterprise-scrollbar overflow-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <SortableHeader
                label="Notification"
                column="notification_type"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Recipient"
                column="recipient_email"
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
                label="Attempts"
                column="attempts"
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
              <SortableHeader
                label="Error"
                column="error_message"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <th className="border border-slate-200 px-4 py-3 text-right">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-3">
                  <p className="font-bold text-slate-900">
                    {item.notification_type}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.entity_type || "Entity"} #{item.entity_id || "-"}
                  </p>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {item.recipient_email}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {item.status}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                  {item.attempts} / {item.max_attempts}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {formatDateTime(item.created_at)}
                </td>
                <td className="max-w-[320px] truncate border-b border-slate-100 px-4 py-3 text-slate-600">
                  {item.error_message || "-"}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onView(item)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Eye size={14} />
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
        startRow={sortedRows.length === 0 ? 0 : (page - 1) * pageSize + 1}
        endRow={Math.min(page * pageSize, sortedRows.length)}
        totalRows={sortedRows.length}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
        pageSizes={[10]}
      />
    </>
  );
}

function ErrorTable({ rows = [], onView }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const rowsWithSortFields = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        health_time: row.lastSeenAt,
        health_context: row.contexts?.join(", ") || "-",
        health_user: row.users?.join(", ") || "System",
        health_message: row.sampleMessage || "-",
        source_label: row.sources?.join(", ") || "-",
      })),
    [rows],
  );
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    rowsWithSortFields,
    "health_time",
    "desc",
  );
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
        No recent matching errors were found.
      </div>
    );
  }

  return (
    <>
      <div className="enterprise-scrollbar overflow-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <SortableHeader
                label="Last Seen"
                column="health_time"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Count"
                column="count"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Source"
                column="source_label"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Context / Users"
                column="health_context"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Message"
                column="health_message"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => (
              <tr key={row.fingerprint || index} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                  <p>{formatDateTime(row.lastSeenAt)}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    First: {formatDateTime(row.firstSeenAt)}
                  </p>
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                    {row.count}x
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(row.sources || []).map((source) => (
                      <span
                        key={source}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <p className="font-bold text-slate-800">
                    {row.contexts?.slice(0, 2).join(", ") || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Users: {row.users?.slice(0, 3).join(", ") || "-"}
                  </p>
                </td>
                <td className="max-w-[460px] border-b border-slate-100 px-4 py-3 text-slate-600">
                  <p className="line-clamp-2">
                    {row.sampleMessage || "-"}
                  </p>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onView(row)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Eye size={14} />
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
        startRow={sortedRows.length === 0 ? 0 : (page - 1) * pageSize + 1}
        endRow={Math.min(page * pageSize, sortedRows.length)}
        totalRows={sortedRows.length}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
        pageSizes={[10]}
      />
    </>
  );
}

function getStatusLabel(status) {
  return STATUS_STYLE[status]?.label || status || "-";
}

function getTimelineDotClass(status) {
  if (status === "HEALTHY") return "bg-emerald-500";
  if (status === "DEGRADED") return "bg-amber-500";
  if (status === "CRITICAL") return "bg-red-500";
  return "bg-slate-300";
}

function TimelineTable({ snapshots = [], onView }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const rows = useMemo(
    () =>
      snapshots.map((snapshot) => ({
        ...snapshot,
        created_at: snapshot.createdAt,
        overall_status: snapshot.overallStatus,
        database_status: snapshot.databaseStatus,
        notifications_status: snapshot.notificationsStatus,
        errors_status: snapshot.errorsStatus,
        storage_status: snapshot.storageStatus,
        backups_status: snapshot.backupsStatus,
      })),
    [snapshots],
  );
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    rows,
    "created_at",
    "desc",
  );
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  if (!snapshots.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
        No timeline snapshots have been recorded yet.
      </div>
    );
  }

  return (
    <>
      <div className="enterprise-scrollbar overflow-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <SortableHeader
                label="Time"
                column="created_at"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Overall"
                column="overall_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Database"
                column="database_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Notifications"
                column="notifications_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Errors"
                column="errors_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Storage"
                column="storage_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Backups"
                column="backups_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-left"
              />
              <th className="border-b border-slate-200 px-4 py-3 text-right">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((snapshot) => (
              <tr key={snapshot.id} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                  {formatDateTime(snapshot.createdAt)}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <HealthBadge status={snapshot.overallStatus} />
                </td>
                {[
                  snapshot.databaseStatus,
                  snapshot.notificationsStatus,
                  snapshot.errorsStatus,
                  snapshot.storageStatus,
                  snapshot.backupsStatus,
                ].map((status, index) => (
                  <td
                    key={`${snapshot.id}-${index}`}
                    className="border-b border-slate-100 px-4 py-3"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${getTimelineDotClass(
                          status,
                        )}`}
                      />
                      {getStatusLabel(status)}
                    </span>
                  </td>
                ))}
                <td className="border-b border-slate-100 px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onView(snapshot)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Eye size={14} />
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
        startRow={sortedRows.length === 0 ? 0 : (page - 1) * pageSize + 1}
        endRow={Math.min(page * pageSize, sortedRows.length)}
        totalRows={sortedRows.length}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
        pageSizes={[10]}
      />
    </>
  );
}

export default function SystemHealthPage() {
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState(null);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["system-health-summary"],
    queryFn: getSystemHealthSummary,
    refetchInterval: 60000,
  });

  const checksByKey = useMemo(() => {
    return Object.fromEntries((data?.checks || []).map((check) => [check.key, check]));
  }, [data]);

  const database = checksByKey.database;
  const notifications = checksByKey.notifications;
  const errors = checksByKey.errors;
  const storage = checksByKey.storage;
  const backups = checksByKey.backups;
  const timeline = data?.timeline;
  const queueItems = notifications?.meta?.recentQueueItems || [];
  const notificationWorker = notifications?.meta?.worker;
  const timelineSnapshots = timeline?.snapshots || [];
  const timelineStatuses = [...timelineSnapshots].reverse().slice(-48);
  const timelineCounts = timeline?.statusCounts || {};
  const errorRows = useMemo(() => {
    const rows = errors?.meta?.groupedErrors || [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [
        row.sampleMessage,
        row.normalizedMessage,
        ...(row.sources || []),
        ...(row.contexts || []),
        ...(row.users || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [errors, search]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={18} />
        Loading system health...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="text-lg font-black">System health failed to load.</p>
          <p className="mt-2 text-sm font-semibold">
            Verify that the API is running and your workspace has the System
            Health permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-6 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <Activity size={28} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-200">
                  Administration
                </p>
                <h1 className="mt-2 text-3xl font-black">System Health</h1>
                <p className="mt-2 max-w-3xl text-sm font-medium text-blue-100">
                  Operational status for SQL Server, notification delivery,
                  user-facing errors, runtime process health, and backup
                  readiness.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <HealthBadge status={data?.status} />
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCcw
                  size={16}
                  className={isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">
                Last checked
              </p>
              <p className="mt-1 font-bold">{formatDateTime(data?.checkedAt)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">
                API uptime
              </p>
              <p className="mt-1 font-bold">
                {formatDuration(data?.uptimeSeconds)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">
                Environment
              </p>
              <p className="mt-1 font-bold">
                {data?.environment || "development"} · PID {data?.processId}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={Database}
          label="Database"
          value={
            database?.meta?.latencyMs !== undefined
              ? `${database.meta.latencyMs} ms`
              : "-"
          }
          helper={database?.meta?.databaseName || database?.description}
          status={database?.status}
        />
        <MetricCard
          icon={Mail}
          label="Notification Queue"
          value={`${formatNumber(notifications?.meta?.pendingCount)} pending`}
          helper={`${formatNumber(notifications?.meta?.failedCount)} failed · ${formatNumber(
            notifications?.meta?.processingCount,
          )} processing`}
          status={notifications?.status}
        />
        <MetricCard
          icon={Activity}
          label="Email Worker"
          value={
            notificationWorker?.record?.last_seen_at
              ? formatDateTime(notificationWorker.record.last_seen_at)
              : notificationWorker?.configured === false
                ? "Not configured"
                : "No heartbeat"
          }
          helper={
            notificationWorker?.description ||
            "Notification worker heartbeat is not available."
          }
          status={notificationWorker?.status}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Recent Errors"
          value={`${formatNumber(errorRows.length)} group(s)`}
          helper={`${formatNumber(errors?.meta?.errorOccurrenceCount)} occurrence(s) · ${formatNumber(errors?.meta?.failedLast24Hours)} failed audit event(s) in 24h`}
          status={errors?.status}
        />
        <MetricCard
          icon={HardDrive}
          label="Storage"
          value={
            storage?.meta
              ? `${formatNumber(storage.meta.missingFileCount)} missing`
              : "-"
          }
          helper={`${formatNumber(storage?.meta?.activeAttachmentCount)} active file(s) · ${formatBytes(storage?.meta?.activeAttachmentBytes)}`}
          status={storage?.status}
        />
        <MetricCard
          icon={HardDrive}
          label="Backups"
          value={STATUS_STYLE[backups?.status]?.label || "Not configured"}
          helper={backups?.description}
          status={backups?.status}
        />
      </section>

      <CollapsibleSection
        title="Health Timeline"
        description="Recent system-health snapshots, status changes, and recurring operational issues over the last 24 hours."
        icon={<Activity size={22} />}
        defaultOpen
        action={<HealthBadge status={data?.status} />}
      >
        {!timeline?.configured ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                  Timeline not configured
                </p>
                <h3 className="mt-1 text-lg font-black text-amber-950">
                  Health snapshots are not being persisted yet.
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-amber-800">
                  {timeline?.message ||
                    "Run server/scripts/add-system-health-timeline.sql to enable the 24-hour timeline."}
                </p>
              </div>
              <HealthBadge status="NOT_CONFIGURED" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status trend
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      Last {timeline?.hours || 24} hours
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Each marker is one persisted health snapshot. New rows are
                      throttled when status stays unchanged.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {formatNumber(timelineSnapshots.length)} snapshot(s)
                  </span>
                </div>

                <div className="enterprise-scrollbar mt-5 flex gap-1 overflow-x-auto rounded-2xl bg-white p-3">
                  {timelineStatuses.length === 0 ? (
                    <p className="text-sm font-semibold text-slate-500">
                      No snapshots recorded yet.
                    </p>
                  ) : (
                    timelineStatuses.map((snapshot) => (
                      <button
                        key={snapshot.id}
                        type="button"
                        title={`${formatDateTime(snapshot.createdAt)} - ${getStatusLabel(
                          snapshot.overallStatus,
                        )}`}
                        onClick={() =>
                          setDetails({
                            title: `Health snapshot #${snapshot.id}`,
                            subtitle: formatDateTime(snapshot.createdAt),
                            data: snapshot,
                          })
                        }
                        className={`h-9 min-w-3 rounded-full transition hover:scale-y-110 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getTimelineDotClass(
                          snapshot.overallStatus,
                        )}`}
                        aria-label={`View ${getStatusLabel(
                          snapshot.overallStatus,
                        )} health snapshot from ${formatDateTime(
                          snapshot.createdAt,
                        )}`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {["HEALTHY", "DEGRADED", "CRITICAL", "NOT_CONFIGURED"].map(
                  (status) => (
                    <div
                      key={status}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <HealthBadge status={status} />
                        <p className="text-2xl font-black text-slate-950">
                          {formatNumber(timelineCounts[status])}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <TimelineTable
              snapshots={timelineSnapshots}
              onView={(snapshot) =>
                setDetails({
                  title: `Health snapshot #${snapshot.id}`,
                  subtitle: formatDateTime(snapshot.createdAt),
                  data: snapshot,
                })
              }
            />
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Database and Runtime"
        description="Connectivity, SQL latency, current financial year, and process metadata."
        icon={<Server size={22} />}
        defaultOpen
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-900">SQL Server</h3>
              <HealthBadge status={database?.status} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-bold text-slate-500">Database</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {database?.meta?.databaseName || "-"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Server</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {database?.meta?.serverName || "-"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Latency</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {database?.meta?.latencyMs ?? "-"} ms
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Server time</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {formatDateTime(database?.meta?.serverTime)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-900">
              Current Financial Year
            </h3>
            {database?.meta?.currentFinancialYear ? (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-slate-500">Year</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {database.meta.currentFinancialYear.year}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">Status</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {database.meta.currentFinancialYear.status}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-500">
                No active financial year was found.
              </p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Email and Notification Queue"
        description="Pending, failed, and processing notifications derived from the durable queue."
        icon={<Mail size={22} />}
        defaultOpen
        action={<HealthBadge status={notifications?.status} />}
      >
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <MetricCard
            icon={Clock3}
            label="Pending"
            value={formatNumber(notifications?.meta?.pendingCount)}
            helper={
              notifications?.meta?.oldestPendingMinutes
                ? `Oldest ${notifications.meta.oldestPendingMinutes} minutes`
                : "No stale pending work"
            }
          />
          <MetricCard
            icon={Loader2}
            label="Processing"
            value={formatNumber(notifications?.meta?.processingCount)}
            helper={
              notifications?.meta?.oldestProcessingMinutes
                ? `Oldest ${notifications.meta.oldestProcessingMinutes} minutes`
                : "No stuck processing rows"
            }
          />
          <MetricCard
            icon={XCircle}
            label="Failed"
            value={formatNumber(notifications?.meta?.failedCount)}
            helper="Requires investigation"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Last Sent"
            value={formatDateTime(notifications?.meta?.lastSentAt) || "-"}
            helper="Most recent successful email"
          />
        </div>

        <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Notification Worker Heartbeat
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950">
                Email queue processor
              </h3>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
                {notificationWorker?.description ||
                  "Heartbeat status has not been reported."}
              </p>
            </div>
            <HealthBadge status={notificationWorker?.status} />
          </div>

          <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <dt className="font-bold text-slate-500">Last seen</dt>
              <dd className="mt-1 font-black text-slate-900">
                {formatDateTime(notificationWorker?.record?.last_seen_at)}
              </dd>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <dt className="font-bold text-slate-500">Last success</dt>
              <dd className="mt-1 font-black text-slate-900">
                {formatDateTime(notificationWorker?.record?.last_success_at)}
              </dd>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <dt className="font-bold text-slate-500">Last failure</dt>
              <dd className="mt-1 font-black text-slate-900">
                {formatDateTime(notificationWorker?.record?.last_failure_at)}
              </dd>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <dt className="font-bold text-slate-500">Worker process</dt>
              <dd className="mt-1 font-black text-slate-900">
                {notificationWorker?.record?.process_id
                  ? `PID ${notificationWorker.record.process_id}`
                  : "-"}
              </dd>
            </div>
          </dl>

          {notificationWorker?.record?.last_error_message && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              {notificationWorker.record.last_error_message}
            </div>
          )}
        </div>

        <QueueTable
          items={queueItems}
          onView={(item) =>
            setDetails({
              title: `Notification #${item.id}`,
              subtitle: item.notification_type,
              data: item,
            })
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Attachment Storage"
        description="Read/write health and sampled package attachment file presence."
        icon={<HardDrive size={22} />}
        defaultOpen
        action={<HealthBadge status={storage?.status} />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Storage access
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Package attachment storage
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Physical paths are intentionally hidden from the browser.
                </p>
              </div>
              <HealthBadge status={storage?.status} />
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Root exists", storage?.meta?.rootExists],
                ["Readable", storage?.meta?.readable],
                ["Writable", storage?.meta?.writable],
                ["Delete test", storage?.meta?.removable],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white p-4">
                  <dt className="font-bold text-slate-500">{label}</dt>
                  <dd
                    className={`mt-1 font-black ${
                      value ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {value ? "Passed" : "Failed"}
                  </dd>
                </div>
              ))}
            </dl>

            {storage?.meta?.error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {storage.meta.error}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Attachment records
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={HardDrive}
                label="Active Files"
                value={formatNumber(storage?.meta?.activeAttachmentCount)}
                helper={formatBytes(storage?.meta?.activeAttachmentBytes)}
              />
              <MetricCard
                icon={Eye}
                label="Sampled"
                value={formatNumber(storage?.meta?.sampledAttachmentCount)}
                helper={`Latest ${formatNumber(storage?.meta?.sampleLimit)} checked`}
              />
              <MetricCard
                icon={XCircle}
                label="Missing Files"
                value={formatNumber(storage?.meta?.missingFileCount)}
                helper="Rows whose file was not found"
              />
              <MetricCard
                icon={AlertTriangle}
                label="Invalid Keys"
                value={formatNumber(storage?.meta?.invalidStorageKeyCount)}
                helper="Blocked unsafe storage keys"
              />
            </div>
          </div>
        </div>

        {(storage?.meta?.missingFiles?.length > 0 ||
          storage?.meta?.invalidStorageKeys?.length > 0) && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-sm font-black uppercase tracking-wide text-amber-900">
                Missing sampled files
              </h3>
              <div className="mt-3 space-y-2">
                {(storage?.meta?.missingFiles || []).map((file) => (
                  <div
                    key={file.id}
                    className="rounded-2xl bg-white px-4 py-3 text-sm"
                  >
                    <p className="font-bold text-slate-900">
                      #{file.id} · {file.originalFileName}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Uploaded {formatDateTime(file.uploadedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
              <h3 className="text-sm font-black uppercase tracking-wide text-red-900">
                Invalid storage keys
              </h3>
              <div className="mt-3 space-y-2">
                {(storage?.meta?.invalidStorageKeys || []).map((file) => (
                  <div
                    key={file.id}
                    className="rounded-2xl bg-white px-4 py-3 text-sm"
                  >
                    <p className="font-bold text-slate-900">
                      #{file.id} · {file.originalFileName}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {file.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Recent Errors"
        description="Grouped sanitized server error log entries and audit events that indicate failures or denied operations."
        icon={<ShieldAlert size={22} />}
        defaultOpen
        action={<HealthBadge status={errors?.status} />}
      >
        <div className="mb-4 max-w-xl">
          <EnterpriseSearch
            value={search}
            onChange={setSearch}
            placeholder="Search errors, actions, users, modules..."
            debounceMs={250}
            showClear
          />
        </div>
        <ErrorTable
          rows={errorRows}
          onView={(row) =>
            setDetails({
              title: `Grouped Error (${row.count} occurrence${row.count === 1 ? "" : "s"})`,
              subtitle: row.sampleMessage,
              data: row,
            })
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Backups"
        description="Backup tracking is ready for display when a backup source is configured."
        icon={<HardDrive size={22} />}
        defaultOpen={false}
        action={<HealthBadge status={backups?.status} />}
      >
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-black text-slate-900">
            Backup Tracking
          </h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
            {backups?.description ||
              "No backup tracking source is configured yet."}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            When SQL Server backup jobs or a backup log table are connected, this
            section should show last successful backup, backup age, size,
            location label, last failure, and next scheduled backup.
          </p>
        </div>
      </CollapsibleSection>

      <DetailDrawer
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details?.title}
        subtitle={details?.subtitle}
        data={details?.data}
      />
    </div>
  );
}
