import os from "os";
import { poolPromise, sql } from "../../config/db.js";
import { sanitizeErrorMessage } from "./systemHealth.mapper.js";

export const SYSTEM_HEALTH_WORKERS = Object.freeze({
  NOTIFICATION_EMAIL: "notification-email-worker",
});

async function heartbeatTableExists(pool) {
  const result = await pool.request().query(`
    SELECT CASE
      WHEN OBJECT_ID(N'dbo.BS_system_worker_heartbeats', N'U') IS NULL THEN 0
      ELSE 1
    END AS exists_flag;
  `);

  return Number(result.recordset?.[0]?.exists_flag || 0) === 1;
}

export async function recordWorkerHeartbeatRepo({
  workerName,
  status = "RUNNING",
  errorMessage = null,
}) {
  const pool = await poolPromise;

  if (!(await heartbeatTableExists(pool))) {
    return { configured: false };
  }

  const sanitizedError = sanitizeErrorMessage(errorMessage);

  await pool
    .request()
    .input("workerName", sql.VarChar(100), workerName)
    .input("status", sql.VarChar(30), status)
    .input("processId", sql.Int, process.pid)
    .input("hostName", sql.NVarChar(128), os.hostname())
    .input("errorMessage", sql.NVarChar(1000), sanitizedError || null).query(`
      MERGE dbo.BS_system_worker_heartbeats AS target
      USING (
        SELECT
          @workerName AS worker_name,
          @status AS status,
          @processId AS process_id,
          @hostName AS host_name,
          @errorMessage AS error_message
      ) AS source
      ON target.worker_name = source.worker_name
      WHEN MATCHED THEN
        UPDATE SET
          status = source.status,
          process_id = source.process_id,
          host_name = source.host_name,
          last_seen_at = SYSUTCDATETIME(),
          last_success_at = CASE
            WHEN source.status = 'SUCCESS' THEN SYSUTCDATETIME()
            ELSE target.last_success_at
          END,
          last_failure_at = CASE
            WHEN source.status = 'FAILED' THEN SYSUTCDATETIME()
            ELSE target.last_failure_at
          END,
          last_error_message = CASE
            WHEN source.status = 'FAILED' THEN source.error_message
            WHEN source.status IN ('RUNNING', 'SUCCESS') THEN NULL
            ELSE target.last_error_message
          END,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (
          worker_name,
          status,
          process_id,
          host_name,
          last_seen_at,
          last_success_at,
          last_failure_at,
          last_error_message,
          created_at,
          updated_at
        )
        VALUES (
          source.worker_name,
          source.status,
          source.process_id,
          source.host_name,
          SYSUTCDATETIME(),
          CASE WHEN source.status = 'SUCCESS' THEN SYSUTCDATETIME() ELSE NULL END,
          CASE WHEN source.status = 'FAILED' THEN SYSUTCDATETIME() ELSE NULL END,
          CASE WHEN source.status = 'FAILED' THEN source.error_message ELSE NULL END,
          SYSUTCDATETIME(),
          SYSUTCDATETIME()
        );
    `);

  return { configured: true };
}

export async function getWorkerHeartbeatRepo(workerName) {
  const pool = await poolPromise;

  if (!(await heartbeatTableExists(pool))) {
    return {
      configured: false,
      workerName,
      record: null,
    };
  }

  const result = await pool
    .request()
    .input("workerName", sql.VarChar(100), workerName).query(`
      SELECT
        worker_name,
        status,
        process_id,
        host_name,
        last_seen_at,
        last_success_at,
        last_failure_at,
        last_error_message,
        created_at,
        updated_at,
        row_version
      FROM dbo.BS_system_worker_heartbeats
      WHERE worker_name = @workerName;
    `);

  return {
    configured: true,
    workerName,
    record: result.recordset?.[0] || null,
  };
}
