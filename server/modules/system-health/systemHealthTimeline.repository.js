import { poolPromise, sql } from "../../config/db.js";
import { sanitizeErrorMessage } from "./systemHealth.mapper.js";

const TIMELINE_TABLE_NAME = "dbo.BS_system_health_snapshots";
const SNAPSHOT_THROTTLE_MINUTES = 5;

async function timelineTableExists(pool) {
  const result = await pool.request().query(`
    SELECT CASE
      WHEN OBJECT_ID('${TIMELINE_TABLE_NAME}', 'U') IS NULL THEN 0
      ELSE 1
    END AS table_exists;
  `);

  return Boolean(result.recordset?.[0]?.table_exists);
}

function getCheckStatus(checks, key) {
  return checks.find((check) => check.key === key)?.status || null;
}

function getCompactCheckMeta(check) {
  const meta = check?.meta || {};

  switch (check?.key) {
    case "database":
      return {
        latencyMs: meta.latencyMs,
        currentFinancialYear: meta.currentFinancialYear
          ? {
              year: meta.currentFinancialYear.year,
              status: meta.currentFinancialYear.status,
            }
          : null,
        error: sanitizeErrorMessage(meta.error),
      };
    case "notifications":
      return {
        pendingCount: meta.pendingCount,
        processingCount: meta.processingCount,
        failedCount: meta.failedCount,
        workerStatus: meta.worker?.status,
        workerStaleMinutes: meta.worker?.staleMinutes,
        error: sanitizeErrorMessage(meta.error),
      };
    case "errors":
      return {
        groupedErrorCount: meta.groupedErrorCount,
        errorOccurrenceCount: meta.errorOccurrenceCount,
        failedLast24Hours: meta.failedLast24Hours,
        deniedLast24Hours: meta.deniedLast24Hours,
        error: sanitizeErrorMessage(meta.error),
      };
    case "storage":
      return {
        activeAttachmentCount: meta.activeAttachmentCount,
        sampledAttachmentCount: meta.sampledAttachmentCount,
        missingFileCount: meta.missingFileCount,
        invalidStorageKeyCount: meta.invalidStorageKeyCount,
        rootExists: meta.rootExists,
        readable: meta.readable,
        writable: meta.writable,
        removable: meta.removable,
        error: sanitizeErrorMessage(meta.error),
      };
    case "backups":
      return {
        error: sanitizeErrorMessage(meta.error),
      };
    default:
      return {};
  }
}

function buildSnapshotSummary({ checkedAt, durationMs, uptimeSeconds, environment, checks }) {
  return JSON.stringify({
    checkedAt,
    durationMs,
    uptimeSeconds,
    environment,
    checks: checks.map((check) => ({
      key: check.key,
      label: check.label,
      status: check.status,
      description: sanitizeErrorMessage(check.description),
      meta: getCompactCheckMeta(check),
    })),
  });
}

function mapSnapshot(row) {
  let summary = null;

  try {
    summary = row.summary_json ? JSON.parse(row.summary_json) : null;
  } catch {
    summary = null;
  }

  return {
    id: row.id,
    overallStatus: row.overall_status,
    databaseStatus: row.database_status,
    notificationsStatus: row.notifications_status,
    errorsStatus: row.errors_status,
    storageStatus: row.storage_status,
    backupsStatus: row.backups_status,
    summary,
    createdAt: row.created_at,
  };
}

function isSameSnapshot(latest, next) {
  return (
    latest.overall_status === next.overallStatus &&
    latest.database_status === next.databaseStatus &&
    latest.notifications_status === next.notificationsStatus &&
    latest.errors_status === next.errorsStatus &&
    latest.storage_status === next.storageStatus &&
    latest.backups_status === next.backupsStatus
  );
}

export async function recordSystemHealthSnapshotRepo({
  overallStatus,
  checkedAt,
  durationMs,
  uptimeSeconds,
  environment,
  checks = [],
}) {
  const pool = await poolPromise;

  if (!(await timelineTableExists(pool))) {
    return {
      configured: false,
      recorded: false,
      message:
        "Health timeline tracking is not configured. Run server/scripts/add-system-health-timeline.sql to enable it.",
    };
  }

  const nextSnapshot = {
    overallStatus,
    databaseStatus: getCheckStatus(checks, "database"),
    notificationsStatus: getCheckStatus(checks, "notifications"),
    errorsStatus: getCheckStatus(checks, "errors"),
    storageStatus: getCheckStatus(checks, "storage"),
    backupsStatus: getCheckStatus(checks, "backups"),
    summaryJson: buildSnapshotSummary({
      checkedAt,
      durationMs,
      uptimeSeconds,
      environment,
      checks,
    }),
  };

  const latestResult = await pool.request().query(`
    SELECT TOP (1)
      id,
      overall_status,
      database_status,
      notifications_status,
      errors_status,
      storage_status,
      backups_status,
      created_at,
      CASE
        WHEN created_at >= DATEADD(MINUTE, -${SNAPSHOT_THROTTLE_MINUTES}, SYSUTCDATETIME()) THEN 1
        ELSE 0
      END AS within_throttle_window
    FROM ${TIMELINE_TABLE_NAME}
    ORDER BY created_at DESC, id DESC;
  `);

  const latest = latestResult.recordset?.[0];
  if (
    latest?.within_throttle_window &&
    isSameSnapshot(latest, nextSnapshot)
  ) {
    return {
      configured: true,
      recorded: false,
      skippedReason: "UNCHANGED_WITHIN_THROTTLE_WINDOW",
    };
  }

  await pool
    .request()
    .input("overallStatus", sql.VarChar(30), nextSnapshot.overallStatus)
    .input("databaseStatus", sql.VarChar(30), nextSnapshot.databaseStatus)
    .input("notificationsStatus", sql.VarChar(30), nextSnapshot.notificationsStatus)
    .input("errorsStatus", sql.VarChar(30), nextSnapshot.errorsStatus)
    .input("storageStatus", sql.VarChar(30), nextSnapshot.storageStatus)
    .input("backupsStatus", sql.VarChar(30), nextSnapshot.backupsStatus)
    .input("summaryJson", sql.NVarChar(sql.MAX), nextSnapshot.summaryJson)
    .query(`
      INSERT INTO ${TIMELINE_TABLE_NAME}
      (
        overall_status,
        database_status,
        notifications_status,
        errors_status,
        storage_status,
        backups_status,
        summary_json
      )
      VALUES
      (
        @overallStatus,
        @databaseStatus,
        @notificationsStatus,
        @errorsStatus,
        @storageStatus,
        @backupsStatus,
        @summaryJson
      );
    `);

  return {
    configured: true,
    recorded: true,
  };
}

export async function getSystemHealthTimelineRepo({ hours = 24, limit = 120 } = {}) {
  const pool = await poolPromise;

  if (!(await timelineTableExists(pool))) {
    return {
      configured: false,
      snapshots: [],
      message:
        "Health timeline tracking is not configured. Run server/scripts/add-system-health-timeline.sql to enable it.",
    };
  }

  const result = await pool
    .request()
    .input("hours", sql.Int, Math.max(1, Math.min(Number(hours) || 24, 168)))
    .input("limit", sql.Int, Math.max(1, Math.min(Number(limit) || 120, 500)))
    .query(`
      SELECT TOP (@limit)
        id,
        overall_status,
        database_status,
        notifications_status,
        errors_status,
        storage_status,
        backups_status,
        summary_json,
        created_at
      FROM ${TIMELINE_TABLE_NAME}
      WHERE created_at >= DATEADD(HOUR, -@hours, SYSUTCDATETIME())
      ORDER BY created_at DESC, id DESC;
    `);

  return {
    configured: true,
    snapshots: (result.recordset || []).map(mapSnapshot),
  };
}
