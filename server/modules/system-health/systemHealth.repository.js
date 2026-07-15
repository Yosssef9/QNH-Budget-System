import fs from "fs/promises";
import path from "path";
import { poolPromise, sql } from "../../config/db.js";
import { RECENT_ERROR_LIMIT } from "./systemHealth.constants.js";
import { sanitizeErrorMessage } from "./systemHealth.mapper.js";

export async function getDatabaseProbeRepo() {
  const startedAt = Date.now();
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      DB_NAME() AS database_name,
      SYSDATETIME() AS server_time,
      @@SERVERNAME AS server_name;
  `);

  return {
    latencyMs: Date.now() - startedAt,
    ...(result.recordset?.[0] || {}),
  };
}

export async function getCurrentFinancialYearHealthRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT TOP (1)
      id,
      year,
      status
    FROM dbo.BS_financial_years
    ORDER BY
      CASE status
        WHEN 'OPEN' THEN 1
        WHEN 'PRE_CLOSING' THEN 2
        WHEN 'CLOSED' THEN 3
        ELSE 4
      END,
      year DESC,
      id DESC;
  `);

  return result.recordset?.[0] || null;
}

export async function getNotificationHealthRepo() {
  const pool = await poolPromise;

  const [summaryResult, recentResult] = await Promise.all([
    pool.request().query(`
      SELECT
        COUNT(1) AS total_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) AS processing_count,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) AS sent_count,
        MIN(CASE WHEN status = 'PENDING' THEN created_at END) AS oldest_pending_at,
        MIN(CASE WHEN status = 'PROCESSING' THEN processing_started_at END) AS oldest_processing_at,
        MAX(CASE WHEN status = 'SENT' THEN processed_at END) AS last_sent_at,
        MAX(CASE WHEN status = 'FAILED' THEN created_at END) AS last_failed_at,
        MAX(CASE WHEN error_message IS NOT NULL THEN created_at END) AS last_error_at
      FROM dbo.BS_Notifications
      WHERE created_at >= DATEADD(DAY, -7, GETDATE());
    `),
    pool.request().query(`
      SELECT TOP (20)
        id,
        notification_type,
        entity_type,
        entity_id,
        recipient_email,
        status,
        attempts,
        max_attempts,
        next_retry_at,
        processing_started_at,
        processed_at,
        error_message,
        created_at
      FROM dbo.BS_Notifications
      WHERE status IN ('PENDING', 'PROCESSING', 'FAILED')
      ORDER BY
        CASE status
          WHEN 'FAILED' THEN 1
          WHEN 'PROCESSING' THEN 2
          ELSE 3
        END,
        created_at ASC;
    `),
  ]);

  return {
    summary: summaryResult.recordset?.[0] || {},
    recent: recentResult.recordset || [],
  };
}

export async function getRecentAuditErrorsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().input("limit", sql.Int, RECENT_ERROR_LIMIT)
    .query(`
      SELECT TOP (@limit)
        id,
        action,
        entity_type,
        entity_id,
        entity_name,
        description,
        user_id,
        user_code,
        user_name,
        role_name,
        workspace_id,
        workspace_type,
        workspace_label,
        ip_address,
        created_at
      FROM dbo.BS_audit_logs
      WHERE
        created_at >= DATEADD(DAY, -7, SYSDATETIME())
        AND (
          action LIKE '%ERROR%'
          OR action LIKE '%FAILED%'
          OR action LIKE '%DENIED%'
          OR description LIKE '%error%'
          OR description LIKE '%failed%'
          OR description LIKE '%denied%'
        )
      ORDER BY created_at DESC;
    `);

  return result.recordset || [];
}

function parseJsonLogLine(line) {
  try {
    const parsed = JSON.parse(line);
    return {
      timestamp: parsed.timestamp,
      level: parsed.level,
      message: sanitizeErrorMessage(parsed.message || parsed.error),
      stack: parsed.stack ? sanitizeErrorMessage(parsed.stack) : null,
      meta: parsed,
    };
  } catch {
    return {
      timestamp: null,
      level: "error",
      message: sanitizeErrorMessage(line),
      stack: null,
      meta: null,
    };
  }
}

export async function getRecentFileErrorsRepo() {
  const errorLogPath = path.join(process.cwd(), "logs", "error.log");

  try {
    const content = await fs.readFile(errorLogPath, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-RECENT_ERROR_LIMIT)
      .reverse()
      .map(parseJsonLogLine);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function getAuditLogVolumeRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      COUNT(1) AS total_24h,
      SUM(CASE WHEN action LIKE '%DENIED%' THEN 1 ELSE 0 END) AS denied_24h,
      SUM(CASE WHEN action LIKE '%FAILED%' OR action LIKE '%ERROR%' THEN 1 ELSE 0 END) AS failed_24h
    FROM dbo.BS_audit_logs
    WHERE created_at >= DATEADD(HOUR, -24, SYSDATETIME());
  `);

  return result.recordset?.[0] || {};
}
