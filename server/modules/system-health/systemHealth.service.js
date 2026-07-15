import {
  HEALTH_STATUS,
  NOTIFICATION_STALE_PENDING_MINUTES,
  NOTIFICATION_STUCK_PROCESSING_MINUTES,
  NOTIFICATION_WORKER_STALE_MINUTES,
} from "./systemHealth.constants.js";
import {
  buildHealthCheck,
  combineHealthStatuses,
  sanitizeErrorMessage,
} from "./systemHealth.mapper.js";
import {
  getAuditLogVolumeRepo,
  getCurrentFinancialYearHealthRepo,
  getDatabaseProbeRepo,
  getNotificationHealthRepo,
  getRecentAuditErrorsRepo,
  getRecentFileErrorsRepo,
} from "./systemHealth.repository.js";
import {
  getWorkerHeartbeatRepo,
  SYSTEM_HEALTH_WORKERS,
} from "./systemHealthHeartbeat.repository.js";
import {
  checkMissingAttachmentFilesRepo,
  checkPackageAttachmentStorageRepo,
  getAttachmentStorageRowsRepo,
} from "./systemHealthStorage.repository.js";
import {
  getSystemHealthTimelineRepo,
  recordSystemHealthSnapshotRepo,
} from "./systemHealthTimeline.repository.js";

function minutesSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

function toNumber(value) {
  return Number(value || 0);
}

function normalizeErrorText(value) {
  return sanitizeErrorMessage(value || "")
    .toLowerCase()
    .replace(/\b\d+\b/g, "{number}")
    .replace(/#[a-z0-9_-]+/gi, "#{id}")
    .replace(/\s+/g, " ")
    .trim();
}

function getErrorTimestamp(row) {
  const value = row.created_at || row.timestamp;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoOrNull(value) {
  const date = value instanceof Date ? value : getErrorTimestamp({ created_at: value });
  return date ? date.toISOString() : null;
}

function buildErrorGroups({ auditErrors = [], fileErrors = [] }) {
  const occurrences = [
    ...fileErrors.map((row) => ({
      ...row,
      source: "Server Log",
      message: row.message || row.stack || "Server log error",
      context: row.level || "Server",
      user: "System",
      occurredAt: toIsoOrNull(row.timestamp),
    })),
    ...auditErrors.map((row) => ({
      ...row,
      source: "Audit",
      message: row.description || row.action || "Audit failure",
      context: row.workspace_label || row.action || row.entity_type || "Audit",
      user: row.user_name || row.user_code || "Unknown user",
      occurredAt: toIsoOrNull(row.created_at),
    })),
  ];

  const groups = new Map();

  for (const occurrence of occurrences) {
    const normalizedMessage = normalizeErrorText(occurrence.message);
    const fingerprint = [
      occurrence.source,
      occurrence.context || "",
      normalizedMessage || "unknown-error",
    ].join("|");

    const existing = groups.get(fingerprint) || {
      fingerprint,
      sampleMessage: sanitizeErrorMessage(occurrence.message),
      normalizedMessage,
      count: 0,
      firstSeenAt: null,
      lastSeenAt: null,
      sources: new Set(),
      users: new Set(),
      contexts: new Set(),
      occurrences: [],
    };

    const occurredAt = getErrorTimestamp({
      created_at: occurrence.occurredAt,
    });

    existing.count += 1;
    existing.sources.add(occurrence.source);
    if (occurrence.user) existing.users.add(occurrence.user);
    if (occurrence.context) existing.contexts.add(occurrence.context);
    existing.occurrences.push(occurrence);

    if (occurredAt) {
      if (!existing.firstSeenAt || occurredAt < new Date(existing.firstSeenAt)) {
        existing.firstSeenAt = occurredAt.toISOString();
      }
      if (!existing.lastSeenAt || occurredAt > new Date(existing.lastSeenAt)) {
        existing.lastSeenAt = occurredAt.toISOString();
      }
    }

    groups.set(fingerprint, existing);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sources: Array.from(group.sources),
      users: Array.from(group.users),
      contexts: Array.from(group.contexts),
      occurrences: group.occurrences
        .sort((a, b) => {
          const aTime = getErrorTimestamp({ created_at: a.occurredAt });
          const bTime = getErrorTimestamp({ created_at: b.occurredAt });
          return (bTime?.getTime() || 0) - (aTime?.getTime() || 0);
        })
        .slice(0, 20),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (
        (new Date(b.lastSeenAt).getTime() || 0) -
        (new Date(a.lastSeenAt).getTime() || 0)
      );
    });
}

function buildTimelineResponse(timelineResult) {
  if (!timelineResult?.configured) {
    return {
      configured: false,
      hours: 24,
      snapshots: [],
      transitions: [],
      statusCounts: {},
      message:
        timelineResult?.message ||
        "Health timeline tracking is not configured.",
    };
  }

  const snapshots = timelineResult.snapshots || [];
  const chronological = [...snapshots].reverse();
  const statusCounts = snapshots.reduce((counts, snapshot) => {
    counts[snapshot.overallStatus] = (counts[snapshot.overallStatus] || 0) + 1;
    return counts;
  }, {});

  const transitions = chronological.filter((snapshot, index) => {
    if (index === 0) return true;
    return snapshot.overallStatus !== chronological[index - 1].overallStatus;
  });

  return {
    configured: true,
    hours: 24,
    snapshots,
    transitions,
    statusCounts,
  };
}

async function buildDatabaseHealth() {
  try {
    const [probe, financialYear] = await Promise.all([
      getDatabaseProbeRepo(),
      getCurrentFinancialYearHealthRepo(),
    ]);

    const status = probe.latencyMs > 1000 ? HEALTH_STATUS.DEGRADED : HEALTH_STATUS.HEALTHY;

    return buildHealthCheck({
      key: "database",
      label: "Database",
      status,
      description:
        status === HEALTH_STATUS.HEALTHY
          ? "SQL Server is reachable and responding normally."
          : "SQL Server is reachable but responding slowly.",
      meta: {
        latencyMs: probe.latencyMs,
        databaseName: probe.database_name,
        serverName: probe.server_name,
        serverTime: probe.server_time,
        currentFinancialYear: financialYear,
      },
    });
  } catch (error) {
    return buildHealthCheck({
      key: "database",
      label: "Database",
      status: HEALTH_STATUS.CRITICAL,
      description: "SQL Server health check failed.",
      meta: {
        error: sanitizeErrorMessage(error?.message),
      },
    });
  }
}

function buildNotificationStatus(summary) {
  const pendingCount = toNumber(summary.pending_count);
  const processingCount = toNumber(summary.processing_count);
  const failedCount = toNumber(summary.failed_count);
  const oldestPendingMinutes = minutesSince(summary.oldest_pending_at);
  const oldestProcessingMinutes = minutesSince(summary.oldest_processing_at);

  if (failedCount > 0) return HEALTH_STATUS.CRITICAL;
  if (
    pendingCount > 0 &&
    oldestPendingMinutes !== null &&
    oldestPendingMinutes >= NOTIFICATION_STALE_PENDING_MINUTES
  ) {
    return HEALTH_STATUS.DEGRADED;
  }
  if (
    processingCount > 0 &&
    oldestProcessingMinutes !== null &&
    oldestProcessingMinutes >= NOTIFICATION_STUCK_PROCESSING_MINUTES
  ) {
    return HEALTH_STATUS.DEGRADED;
  }
  return HEALTH_STATUS.HEALTHY;
}

async function buildNotificationHealth() {
  try {
    const [notificationHealth, workerHeartbeat] = await Promise.all([
      getNotificationHealthRepo(),
      getWorkerHeartbeatRepo(SYSTEM_HEALTH_WORKERS.NOTIFICATION_EMAIL),
    ]);
    const summary = notificationHealth.summary || {};
    const queueStatus = buildNotificationStatus(summary);
    const heartbeatStatus = buildNotificationWorkerStatus(workerHeartbeat);
    const status = combineHealthStatuses([queueStatus, heartbeatStatus.status]);

    return buildHealthCheck({
      key: "notifications",
      label: "Email & Notifications",
      status,
      description:
        status === HEALTH_STATUS.HEALTHY
          ? "Notification queue is moving normally."
          : "Notification queue needs attention.",
      meta: {
        totalCount: toNumber(summary.total_count),
        pendingCount: toNumber(summary.pending_count),
        processingCount: toNumber(summary.processing_count),
        failedCount: toNumber(summary.failed_count),
        sentCount: toNumber(summary.sent_count),
        oldestPendingAt: summary.oldest_pending_at,
        oldestPendingMinutes: minutesSince(summary.oldest_pending_at),
        oldestProcessingAt: summary.oldest_processing_at,
        oldestProcessingMinutes: minutesSince(summary.oldest_processing_at),
        lastSentAt: summary.last_sent_at,
        lastFailedAt: summary.last_failed_at,
        worker: heartbeatStatus,
        recentQueueItems: notificationHealth.recent.map((item) => ({
          ...item,
          error_message: sanitizeErrorMessage(item.error_message),
        })),
      },
    });
  } catch (error) {
    return buildHealthCheck({
      key: "notifications",
      label: "Email & Notifications",
      status: HEALTH_STATUS.CRITICAL,
      description: "Notification queue health check failed.",
      meta: {
        error: sanitizeErrorMessage(error?.message),
      },
    });
  }
}

function buildNotificationWorkerStatus(workerHeartbeat) {
  if (!workerHeartbeat?.configured) {
    return {
      configured: false,
      status: HEALTH_STATUS.NOT_CONFIGURED,
      description:
        "Notification worker heartbeat table is not configured. Run the system-health heartbeat SQL script to enable this check.",
      staleMinutes: null,
      record: null,
    };
  }

  const record = workerHeartbeat.record;

  if (!record) {
    return {
      configured: true,
      status: HEALTH_STATUS.CRITICAL,
      description:
        "Notification worker has not recorded a heartbeat yet. Confirm the worker process is running.",
      staleMinutes: null,
      record: null,
    };
  }

  const staleMinutes = minutesSince(record.last_seen_at);

  if (
    staleMinutes === null ||
    staleMinutes >= NOTIFICATION_WORKER_STALE_MINUTES
  ) {
    return {
      configured: true,
      status: HEALTH_STATUS.CRITICAL,
      description: `Notification worker heartbeat is stale. Last seen ${staleMinutes ?? "unknown"} minute(s) ago.`,
      staleMinutes,
      record,
    };
  }

  if (record.status === "FAILED") {
    return {
      configured: true,
      status: HEALTH_STATUS.DEGRADED,
      description:
        "Notification worker reported a failure during the latest processing loop.",
      staleMinutes,
      record: {
        ...record,
        last_error_message: sanitizeErrorMessage(record.last_error_message),
      },
    };
  }

  return {
    configured: true,
    status: HEALTH_STATUS.HEALTHY,
    description: "Notification worker heartbeat is current.",
    staleMinutes,
    record,
  };
}

async function buildErrorHealth() {
  try {
    const [auditErrors, fileErrors, auditVolume] = await Promise.all([
      getRecentAuditErrorsRepo(),
      getRecentFileErrorsRepo(),
      getAuditLogVolumeRepo(),
    ]);

    const status =
      fileErrors.length > 0 || toNumber(auditVolume.failed_24h) > 0
        ? HEALTH_STATUS.DEGRADED
        : HEALTH_STATUS.HEALTHY;
    const groupedErrors = buildErrorGroups({ auditErrors, fileErrors });

    return buildHealthCheck({
      key: "errors",
      label: "Recent Errors",
      status,
      description:
        status === HEALTH_STATUS.HEALTHY
          ? "No recent operational errors were found."
          : "Recent operational errors were found.",
      meta: {
        auditLast24Hours: toNumber(auditVolume.total_24h),
        deniedLast24Hours: toNumber(auditVolume.denied_24h),
        failedLast24Hours: toNumber(auditVolume.failed_24h),
        groupedErrorCount: groupedErrors.length,
        errorOccurrenceCount: auditErrors.length + fileErrors.length,
        groupedErrors,
        auditErrors,
        fileErrors,
      },
    });
  } catch (error) {
    return buildHealthCheck({
      key: "errors",
      label: "Recent Errors",
      status: HEALTH_STATUS.DEGRADED,
      description: "Recent error log inspection failed.",
      meta: {
        error: sanitizeErrorMessage(error?.message),
      },
    });
  }
}

async function buildStorageHealth() {
  try {
    const [storageCheck, attachmentRows] = await Promise.all([
      checkPackageAttachmentStorageRepo(),
      getAttachmentStorageRowsRepo(),
    ]);
    const fileCheck = await checkMissingAttachmentFilesRepo(
      attachmentRows.sample,
    );
    const missingCount = fileCheck.missing.length;
    const invalidCount = fileCheck.invalid.length;
    const storageReady =
      storageCheck.rootExists &&
      storageCheck.readable &&
      storageCheck.writable &&
      storageCheck.removable;
    const status =
      !storageReady || invalidCount > 0
        ? HEALTH_STATUS.CRITICAL
        : missingCount > 0
          ? HEALTH_STATUS.DEGRADED
          : HEALTH_STATUS.HEALTHY;

    return buildHealthCheck({
      key: "storage",
      label: "Attachment Storage",
      status,
      description:
        status === HEALTH_STATUS.HEALTHY
          ? "Attachment storage is reachable and sampled files are present."
          : "Attachment storage needs attention.",
      meta: {
        configuredByEnv: storageCheck.configuredByEnv,
        rootExists: storageCheck.rootExists,
        readable: storageCheck.readable,
        writable: storageCheck.writable,
        removable: storageCheck.removable,
        activeAttachmentCount: toNumber(
          attachmentRows.summary.active_attachment_count,
        ),
        activeAttachmentBytes: toNumber(
          attachmentRows.summary.active_attachment_bytes,
        ),
        sampledAttachmentCount: attachmentRows.sample.length,
        sampleLimit: attachmentRows.sampleLimit,
        missingFileCount: missingCount,
        invalidStorageKeyCount: invalidCount,
        missingFiles: fileCheck.missing.slice(0, 20),
        invalidStorageKeys: fileCheck.invalid.slice(0, 20),
        error: storageCheck.error,
      },
    });
  } catch (error) {
    return buildHealthCheck({
      key: "storage",
      label: "Attachment Storage",
      status: HEALTH_STATUS.CRITICAL,
      description: "Attachment storage health check failed.",
      meta: {
        error: sanitizeErrorMessage(error?.message),
      },
    });
  }
}

export async function getSystemHealthSummaryService() {
  const startedAt = Date.now();
  const [database, notifications, errors, storage] = await Promise.all([
    buildDatabaseHealth(),
    buildNotificationHealth(),
    buildErrorHealth(),
    buildStorageHealth(),
  ]);

  const checks = [
    database,
    notifications,
    errors,
    storage,
    buildHealthCheck({
      key: "backups",
      label: "Database Backups",
      status: HEALTH_STATUS.NOT_CONFIGURED,
      description:
        "No backup tracking source is configured in the Budget System yet.",
      meta: {},
    }),
  ];

  const status = combineHealthStatuses(checks.map((check) => check.status));
  const checkedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAt;
  const uptimeSeconds = Math.round(process.uptime());
  const environment = process.env.NODE_ENV || "development";

  let timelineResult;

  try {
    await recordSystemHealthSnapshotRepo({
      overallStatus: status,
      checkedAt,
      durationMs,
      uptimeSeconds,
      environment,
      checks,
    });

    timelineResult = await getSystemHealthTimelineRepo({
      hours: 24,
      limit: 120,
    });
  } catch (error) {
    timelineResult = {
      configured: false,
      snapshots: [],
      message: `Health timeline check failed: ${sanitizeErrorMessage(error?.message)}`,
    };
  }

  return {
    status,
    checkedAt,
    durationMs,
    uptimeSeconds,
    environment,
    processId: process.pid,
    checks,
    timeline: buildTimelineResponse(timelineResult),
  };
}
