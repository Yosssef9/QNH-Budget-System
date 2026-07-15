import { poolPromise, sql } from "../../config/db.js";

function requestFor(transaction) {
  return transaction ? new sql.Request(transaction) : null;
}

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
      r.requested_expense_type,
      r.unit_of_measure_id,
      unit.name AS unit_of_measure_name,
      unit.unit_code AS unit_of_measure_code,
      r.existing_category_id,
      c.name AS existing_category_name,
      c.category_code AS existing_category_code,
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
    FROM dbo.BS_budget_item_requests AS r
    LEFT JOIN dbo.BS_budget_categories AS c
      ON c.id = r.existing_category_id
    LEFT JOIN dbo.BS_units_of_measure AS unit
      ON unit.id = r.unit_of_measure_id
    LEFT JOIN dbo.users AS u
      ON u.USER_ID = r.requested_by
    OUTER APPLY (
      SELECT TOP 1
        active_roles.department_id
      FROM dbo.BS_budget_user_roles AS active_roles
      WHERE active_roles.user_id = r.requested_by
        AND active_roles.is_active = 1
        AND active_roles.department_id IS NOT NULL
      ORDER BY active_roles.id DESC
    ) AS bur
    LEFT JOIN dbo.BS_departments AS d
      ON d.id = bur.department_id
    LEFT JOIN dbo.users AS reviewer
      ON reviewer.USER_ID = r.reviewed_by
    ${where}
    ORDER BY
      CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END,
      r.created_at DESC;
  `);

  return result.recordset;
}

export async function findSupportedCategoryByIdRepo(categoryId) {
  const pool = await poolPromise;
  const result = await pool.request().input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT TOP 1
        id,
        category_code,
        name,
        is_active
      FROM dbo.BS_budget_categories
      WHERE id = @categoryId;
    `);

  return result.recordset[0] || null;
}

export async function createItemRequestRepo({
  existingCategoryId,
  requestedTypeName,
  requestedExpenseType,
  unitOfMeasureId,
  requestedBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("existingCategoryId", sql.Int, existingCategoryId)
    .input("requestedTypeName", sql.VarChar(200), requestedTypeName)
    .input("requestedExpenseType", sql.VarChar(10), requestedExpenseType)
    .input("unitOfMeasureId", sql.Int, unitOfMeasureId)
    .input("requestedBy", sql.Int, requestedBy).query(`
      INSERT INTO dbo.BS_budget_item_requests (
        existing_category_id,
        unit_of_measure_id,
        requested_category_name,
        requested_type_name,
        requested_expense_type,
        requested_by,
        status,
        created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        @existingCategoryId,
        @unitOfMeasureId,
        NULL,
        @requestedTypeName,
        @requestedExpenseType,
        @requestedBy,
        'PENDING',
        SYSUTCDATETIME()
      );
    `);

  return result.recordset[0];
}

export async function findItemRequestByIdRepo(requestId) {
  const pool = await poolPromise;

  const result = await pool.request().input("requestId", sql.BigInt, requestId)
    .query(`
      SELECT TOP 1
        r.*,
        unit.name AS unit_of_measure_name,
        unit.unit_code AS unit_of_measure_code,
        c.category_code AS existing_category_code,
        c.name AS existing_category_name,
        c.is_active AS existing_category_is_active
      FROM dbo.BS_budget_item_requests AS r
      LEFT JOIN dbo.BS_budget_categories AS c
        ON c.id = r.existing_category_id
      LEFT JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = r.unit_of_measure_id
      WHERE r.id = @requestId;
    `);

  return result.recordset[0] || null;
}

export async function approveItemRequestRepo({
  requestId,
  adminNote,
  reviewedBy,
  transaction = null,
}) {
  const request = transaction ? requestFor(transaction) : (await poolPromise).request();

  const result = await request
    .input("requestId", sql.BigInt, requestId)
    .input("adminNote", sql.NVarChar(sql.MAX), adminNote)
    .input("reviewedBy", sql.Int, reviewedBy).query(`
      UPDATE dbo.BS_budget_item_requests
      SET
        status = 'APPROVED',
        admin_note = @adminNote,
        reviewed_by = @reviewedBy,
        reviewed_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestId;
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
      UPDATE dbo.BS_budget_item_requests
      SET
        status = 'REJECTED',
        admin_note = @adminNote,
        reviewed_by = @reviewedBy,
        reviewed_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestId;
    `);

  return result.recordset[0];
}

export async function getDashboardItemRequestsRepo({
  userId,
  departmentId,
  canManageCatalog,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("departmentId", sql.Int, departmentId)
    .input("canManageCatalog", sql.Bit, canManageCatalog ? 1 : 0).query(`
      SELECT
        r.id,
        r.requested_category_name,
        r.requested_type_name,
        r.requested_expense_type,
        r.unit_of_measure_id,
        unit.name AS unit_of_measure_name,
        unit.unit_code AS unit_of_measure_code,
        r.existing_category_id,
        c.name AS existing_category_name,
        c.category_code AS existing_category_code,
        r.status,
        r.admin_note,
        r.created_at,
        r.reviewed_at,
        u.USER_NAME AS requested_by_name,
        d.name AS requested_department_name
      FROM dbo.BS_budget_item_requests AS r
      LEFT JOIN dbo.BS_budget_categories AS c
        ON c.id = r.existing_category_id
      LEFT JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = r.unit_of_measure_id
      LEFT JOIN dbo.users AS u
        ON u.USER_ID = r.requested_by
      OUTER APPLY (
        SELECT TOP 1 department_id
        FROM dbo.BS_budget_user_roles AS active_roles
        WHERE active_roles.user_id = r.requested_by
          AND active_roles.is_active = 1
          AND active_roles.department_id IS NOT NULL
        ORDER BY active_roles.id DESC
      ) AS bur
      LEFT JOIN dbo.BS_departments AS d
        ON d.id = bur.department_id
      WHERE
        (
          @canManageCatalog = 1
          AND r.status = 'PENDING'
        )
        OR
        (
          @canManageCatalog = 0
          AND (
            r.requested_by = @userId
            OR bur.department_id = @departmentId
          )
        )
      ORDER BY r.created_at DESC, r.id DESC;
    `);

  return {
    mode: canManageCatalog ? "ADMIN_PENDING" : "HOD_MY_REQUESTS",
    requests: result.recordset || [],
  };
}
