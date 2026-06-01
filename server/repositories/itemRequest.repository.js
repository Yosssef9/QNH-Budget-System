import { poolPromise, sql } from "../config/db.js";

export async function getItemRequestsRepo(status) {
  const pool = await poolPromise;
  const request = pool.request();

  let where = "";

  if (status && status !== "ALL") {
    request.input("status", sql.VarChar(50), status);
    where = "WHERE r.status = @status";
  }

  const result = await request.query(`
    SELECT
      r.id,
      r.requested_category_name,
      r.requested_type_name,
      r.existing_category_id,
      c.name AS existing_category_name,

      r.requested_by,
      u.USER_CODE AS requested_by_code,
      u.USER_NAME AS requested_by_name,

      bur.department_id AS requested_department_id,
      d.name AS requested_department_name,

      r.status,
      r.admin_note,
      r.reviewed_by,
      reviewer.USER_NAME AS reviewed_by_name,
      r.reviewed_at,
   r.created_at
    FROM BS_budget_item_requests r
    LEFT JOIN BS_budget_categories c
      ON c.id = r.existing_category_id
    LEFT JOIN users u
      ON u.USER_ID = r.requested_by
    OUTER APPLY (
      SELECT TOP 1
        bur.department_id
      FROM BS_budget_user_roles bur
      WHERE bur.user_id = r.requested_by
        AND bur.is_active = 1
        AND bur.department_id IS NOT NULL
      ORDER BY bur.id DESC
    ) bur
    LEFT JOIN BS_departments d
      ON d.id = bur.department_id
    LEFT JOIN users reviewer
      ON reviewer.USER_ID = r.reviewed_by
    ${where}
    ORDER BY
      CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END,
      r.created_at DESC
  `);

  return result.recordset;
}

export async function createItemRequestRepo({
  existingCategoryId,
  requestedCategoryName,
  requestedTypeName,
  requestedBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("existingCategoryId", sql.Int, existingCategoryId)
    .input("requestedCategoryName", sql.VarChar(200), requestedCategoryName)
    .input("requestedTypeName", sql.VarChar(200), requestedTypeName)
    .input("requestedBy", sql.Int, requestedBy).query(`
      INSERT INTO BS_budget_item_requests (
        existing_category_id,
        requested_category_name,
        requested_type_name,
        requested_by,
        status,
        created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        @existingCategoryId,
        @requestedCategoryName,
        @requestedTypeName,
        @requestedBy,
        'PENDING',
        GETUTCDATE()
      )
    `);

  return result.recordset[0];
}

export async function findItemRequestByIdRepo(requestId) {
  const pool = await poolPromise;

  const result = await pool.request().input("requestId", sql.BigInt, requestId)
    .query(`
      SELECT TOP 1 *
      FROM BS_budget_item_requests
      WHERE id = @requestId
    `);

  return result.recordset[0] || null;
}

export async function approveItemRequestRepo({
  requestId,
  adminNote,
  reviewedBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("requestId", sql.BigInt, requestId)
    .input("adminNote", sql.NVarChar(sql.MAX), adminNote)
    .input("reviewedBy", sql.Int, reviewedBy).query(`
      UPDATE BS_budget_item_requests
      SET
        status = 'APPROVED',
        admin_note = @adminNote,
        reviewed_by = @reviewedBy,
        reviewed_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @requestId
    `);

  return result.recordset[0];
}

export async function approveItemRequestManualRepo({
  requestId,
  adminNote,
  reviewedBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("requestId", sql.BigInt, requestId)
    .input("adminNote", sql.NVarChar(sql.MAX), adminNote)
    .input("reviewedBy", sql.Int, reviewedBy).query(`
      UPDATE BS_budget_item_requests
      SET
        status = 'APPROVED',
        admin_note = @adminNote,
        reviewed_by = @reviewedBy,
        reviewed_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @requestId
    `);

  return result.recordset[0];
}

export async function rejectItemRequestRepo({
  requestId,
  adminNote,
  reviewedBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("requestId", sql.BigInt, requestId)
    .input("adminNote", sql.NVarChar(sql.MAX), adminNote)
    .input("reviewedBy", sql.Int, reviewedBy).query(`
      UPDATE BS_budget_item_requests
      SET
        status = 'REJECTED',
        admin_note = @adminNote,
        reviewed_by = @reviewedBy,
        reviewed_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @requestId
    `);

  return result.recordset[0];
}
export async function getDashboardItemRequestsRepo({ userId, budgetAccess }) {
  const pool = await poolPromise;

  const canManageCategories =
    budgetAccess?.permissions?.can_manage_categories ||
    budgetAccess?.permissions?.can_manage_users;

  const departmentId = budgetAccess?.department?.id || null;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("departmentId", sql.Int, departmentId)
    .input("canManageCategories", sql.Bit, canManageCategories ? 1 : 0).query(`
      SELECT
        r.id,
        r.requested_category_name,
        r.requested_type_name,
        r.existing_category_id,
        c.name AS existing_category_name,
        r.status,
        r.admin_note,
         r.created_at,
        r.reviewed_at,
        u.USER_NAME AS requested_by_name,
        d.name AS requested_department_name
      FROM BS_budget_item_requests r
      LEFT JOIN BS_budget_categories c
        ON c.id = r.existing_category_id
      LEFT JOIN users u
        ON u.USER_ID = r.requested_by
      OUTER APPLY (
        SELECT TOP 1 department_id
        FROM BS_budget_user_roles bur
        WHERE bur.user_id = r.requested_by
          AND bur.is_active = 1
          AND bur.department_id IS NOT NULL
        ORDER BY bur.id DESC
      ) bur
      LEFT JOIN BS_departments d
        ON d.id = bur.department_id
      WHERE
        (
          @canManageCategories = 1
          AND r.status = 'PENDING'
        )
        OR
        (
          @canManageCategories = 0
          AND (
            r.requested_by = @userId
            OR bur.department_id = @departmentId
          )
        )
      ORDER BY r.created_at DESC, r.id DESC;
    `);

  return {
    mode: canManageCategories ? "ADMIN_PENDING" : "HOD_MY_REQUESTS",
    requests: result.recordset || [],
  };
}
