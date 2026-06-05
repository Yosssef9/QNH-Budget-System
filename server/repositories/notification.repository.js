import { poolPromise, sql } from "../config/db.js";

export async function createNotificationRepo({
  notificationType,
  entityType,
  entityId,
  recipientEmail,
  payload,
}) {
  const pool = await poolPromise;

  await pool
    .request()
    .input("notificationType", sql.VarChar(100), notificationType)
    .input("entityType", sql.VarChar(50), entityType)
    .input("entityId", sql.BigInt, entityId)
    .input("recipientEmail", sql.VarChar(255), recipientEmail)
    .input("payload", sql.NVarChar(sql.MAX), JSON.stringify(payload)).query(`
      INSERT INTO dbo.BS_Notifications
      (
        notification_type,
        entity_type,
        entity_id,
        recipient_email,
        payload
      )
      VALUES
      (
        @notificationType,
        @entityType,
        @entityId,
        @recipientEmail,
        @payload
      )
    `);
}
export async function claimNotificationRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    ;WITH cte AS (
      SELECT TOP (1) *
      FROM dbo.BS_Notifications
      WHERE
        status='PENDING'
        AND next_retry_at <= GETDATE()
      ORDER BY created_at
    )
    UPDATE cte
    SET
      status='PROCESSING',
      processing_started_at=GETDATE()

    OUTPUT inserted.*
  `);

  return result.recordset[0];
}
export async function markNotificationSentRepo(id) {
  const pool = await poolPromise;

  await pool.request().input("id", sql.BigInt, id).query(`
      UPDATE dbo.BS_Notifications
      SET
        status='SENT',
        processed_at=GETDATE()
      WHERE id=@id
    `);
}
export async function markNotificationFailedRepo(id, attempts, errorMessage) {
  const pool = await poolPromise;

  const nextRetryMinutes =
    attempts === 1 ? 5 : attempts === 2 ? 15 : attempts === 3 ? 30 : 60;

  const status = attempts >= 5 ? "FAILED" : "PENDING";

  await pool
    .request()
    .input("id", sql.BigInt, id)
    .input("attempts", sql.Int, attempts)
    .input("status", sql.VarChar(20), status)
    .input("errorMessage", sql.NVarChar(sql.MAX), errorMessage)
    .input("retryMinutes", sql.Int, nextRetryMinutes).query(`
      UPDATE dbo.BS_Notifications
      SET
        attempts=@attempts,
        status=@status,
        error_message=@errorMessage,
        next_retry_at=
          DATEADD(
            MINUTE,
            @retryMinutes,
            GETDATE()
          )
      WHERE id=@id
    `);
}
