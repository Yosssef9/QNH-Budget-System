import { poolPromise, sql } from "../config/db.js";

export async function createAuditLogRepo(log) {
  const pool = await poolPromise;

  await pool
    .request()
    .input("action", sql.NVarChar(100), log.action)
    .input("entity_type", sql.NVarChar(100), log.entityType)
    .input("entity_id", sql.NVarChar(100), log.entityId ?? null)
    .input("entity_name", sql.NVarChar(300), log.entityName ?? null)
    .input("description", sql.NVarChar(500), log.description ?? null)
    .input(
      "old_values",
      sql.NVarChar(sql.MAX),
      log.oldValues ? JSON.stringify(log.oldValues) : null,
    )
    .input(
      "new_values",
      sql.NVarChar(sql.MAX),
      log.newValues ? JSON.stringify(log.newValues) : null,
    )
    .input("user_id", sql.Int, log.userId ?? null)
    .input("user_code", sql.NVarChar(100), log.userCode ?? null)
    .input("user_name", sql.NVarChar(200), log.userName ?? null)
    .input("department_id", sql.Int, log.departmentId ?? null)
    .input("role_name", sql.NVarChar(100), log.roleName ?? null)
    .input("ip_address", sql.NVarChar(100), log.ipAddress ?? null)
    .input("user_agent", sql.NVarChar(500), log.userAgent ?? null).query(`
      INSERT INTO BS_audit_logs (
        action,
        entity_type,
      entity_id,
entity_name,
description,
        old_values,
        new_values,
        user_id,
        user_code,
        user_name,
        department_id,
        role_name,
        ip_address,
        user_agent
      )
      VALUES (
        @action,
        @entity_type,
      @entity_id,
@entity_name,
@description,
        @old_values,
        @new_values,
        @user_id,
        @user_code,
        @user_name,
        @department_id,
        @role_name,
        @ip_address,
        @user_agent
      )
    `);
}

export async function getAuditLogsRepo(filters = {}) {
  const pool = await poolPromise;

  const page = Number(filters.page || 1);
  const pageSize = Number(filters.pageSize || 50);
  const offset = (page - 1) * pageSize;

  const request = pool.request();

  request.input("offset", sql.Int, offset);
  request.input("pageSize", sql.Int, pageSize);
  request.input("search", sql.NVarChar(200), filters.search || null);
  request.input("action", sql.NVarChar(100), filters.action || null);
  request.input("entityType", sql.NVarChar(100), filters.entityType || null);
  request.input("user", sql.NVarChar(200), filters.user || null);
  request.input("dateFrom", sql.DateTime, filters.dateFrom || null);
  request.input("dateTo", sql.DateTime, filters.dateTo || null);
  const result = await request.query(`
    SELECT
      id,
      action,
      entity_type,
      entity_id,
      entity_name,
      description,
      old_values,
      new_values,
      user_id,
      user_code,
      user_name,
      department_id,
      role_name,
      ip_address,
      user_agent,
     created_at,
      COUNT(*) OVER() AS total_count
    FROM BS_audit_logs
 WHERE
  (@action IS NULL OR action = @action)
  AND (@entityType IS NULL OR entity_type = @entityType)
  AND (
    @user IS NULL
    OR user_id = TRY_CONVERT(INT, @user)
  )
  AND (
    @dateFrom IS NULL
    OR created_at >= @dateFrom
  )
  AND (
    @dateTo IS NULL
    OR created_at < DATEADD(DAY, 1, @dateTo)
  )
  AND (
    @search IS NULL
    OR action LIKE '%' + @search + '%'
    OR entity_type LIKE '%' + @search + '%'
    OR entity_id LIKE '%' + @search + '%'
    OR entity_name LIKE '%' + @search + '%'
    OR description LIKE '%' + @search + '%'
    OR user_name LIKE '%' + @search + '%'
    OR user_code LIKE '%' + @search + '%'
    OR ip_address LIKE '%' + @search + '%'
  )
    ORDER BY created_at DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `);

  const rows = result.recordset || [];

  return {
    rows,
    total: rows[0]?.total_count || 0,
    page,
    pageSize,
  };
}
export async function getAuditLogUsersRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT DISTINCT
      user_id,
      user_name,
      user_code
    FROM BS_audit_logs
    WHERE user_id IS NOT NULL
    ORDER BY user_name ASC
  `);

  return result.recordset || [];
}
