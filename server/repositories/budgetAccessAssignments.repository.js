import { poolPromise, sql } from "../config/db.js";

export async function getBudgetAccessAssignmentsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
 SELECT
  bur.id,
  bur.user_id,
  u.USER_CODE AS user_code,
  u.USER_NAME AS user_name,

  bur.department_id,
  d.name AS department_name,

  bur.category_id,
  c.name AS category_name,
  c.code AS category_code,

  bur.role_id,
  r.name AS role_name,

  bur.can_view_budget,
  bur.can_edit_budget,
  bur.can_view_po_links,
bur.can_request_po_links,
bur.can_view_all_po_link_requests,
bur.can_approve_po_links,
  bur.can_request_transfer,
  bur.can_approve_budget,
  bur.can_approve_transfer,
  bur.can_manage_users,
  bur.can_manage_categories,
  bur.can_view_reports,
  bur.can_manage_financial_years,
  bur.can_manage_po_item_mappings,
  bur.is_active,
  bur.created_by,
  bur.created_at,
  bur.updated_at
FROM BS_budget_user_roles bur
LEFT JOIN users u
  ON u.USER_ID = bur.user_id
LEFT JOIN BS_departments d
  ON d.id = bur.department_id
LEFT JOIN BS_budget_categories c
  ON c.id = bur.category_id
LEFT JOIN BS_budget_roles r
  ON r.id = bur.role_id
ORDER BY bur.created_at DESC
  `);

  return result.recordset;
}

export async function findBudgetAccessAssignmentByIdRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.BigInt, id).query(`
      SELECT TOP 1 *
      FROM BS_budget_user_roles
      WHERE id = @id
    `);

  return result.recordset[0] || null;
}

export async function findDuplicateBudgetAccessAssignmentRepo({
  user_id,
  department_id,
  category_id,
  role_id,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("user_id", sql.Int, user_id)
    .input("department_id", sql.Int, department_id)
    .input("category_id", sql.Int, category_id)
    .input("role_id", sql.Int, role_id).query(`
      SELECT TOP 1 id
      FROM BS_budget_user_roles
      WHERE user_id = @user_id
        AND role_id = @role_id
        AND (
          department_id = @department_id
          OR (department_id IS NULL AND @department_id IS NULL)
        )
        AND (
          category_id = @category_id
          OR (category_id IS NULL AND @category_id IS NULL)
        )
    `);

  return result.recordset[0] || null;
}

export async function createBudgetAccessAssignmentRepo(payload) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("user_id", sql.Int, payload.user_id)
    .input("department_id", sql.Int, payload.department_id)
    .input("category_id", sql.Int, payload.category_id)
    .input("role_id", sql.Int, payload.role_id)

    .input("can_view_budget", sql.Bit, payload.can_view_budget)
    .input("can_edit_budget", sql.Bit, payload.can_edit_budget)
   .input(
  "can_view_po_links",
  sql.Bit,
  payload.can_view_po_links,
)
.input(
  "can_request_po_links",
  sql.Bit,
  payload.can_request_po_links,
)
.input(
  "can_view_all_po_link_requests",
  sql.Bit,
  payload.can_view_all_po_link_requests,
)
.input(
  "can_approve_po_links",
  sql.Bit,
  payload.can_approve_po_links,
)
    .input("can_request_transfer", sql.Bit, payload.can_request_transfer)
    .input("can_approve_budget", sql.Bit, payload.can_approve_budget)
    .input("can_approve_transfer", sql.Bit, payload.can_approve_transfer)
    .input("can_manage_users", sql.Bit, payload.can_manage_users)
    .input("can_manage_categories", sql.Bit, payload.can_manage_categories)
    .input("can_view_reports", sql.Bit, payload.can_view_reports)
    .input(
      "can_manage_financial_years",
      sql.Bit,
      payload.can_manage_financial_years,
    )
    .input(
      "can_manage_po_item_mappings",
      sql.Bit,
      payload.can_manage_po_item_mappings,
    )
    .input("created_by", sql.Int, payload.created_by).query(`
      INSERT INTO BS_budget_user_roles (
        user_id,
        department_id,
        category_id,
        role_id,

        can_view_budget,
        can_edit_budget,
      can_view_po_links,
can_request_po_links,
can_view_all_po_link_requests,
can_approve_po_links,
        can_request_transfer,
        can_approve_budget,
        can_approve_transfer,
        can_manage_users,
        can_manage_categories,
        can_view_reports,
 can_manage_financial_years,
        can_manage_po_item_mappings,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @user_id,
        @department_id,
        @category_id,
        @role_id,

        @can_view_budget,
        @can_edit_budget,
      @can_view_po_links,
@can_request_po_links,
@can_view_all_po_link_requests,
@can_approve_po_links,
        @can_request_transfer,
        @can_approve_budget,
        @can_approve_transfer,
        @can_manage_users,
        @can_manage_categories,
        @can_view_reports,
@can_manage_financial_years,
        @can_manage_po_item_mappings,
        @created_by
      )
    `);

  return result.recordset[0];
}

export async function updateBudgetAccessAssignmentRepo(id, payload) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, id)
    .input("department_id", sql.Int, payload.department_id)
    .input("category_id", sql.Int, payload.category_id)
    .input("role_id", sql.Int, payload.role_id)

    .input("can_view_budget", sql.Bit, payload.can_view_budget)
    .input("can_edit_budget", sql.Bit, payload.can_edit_budget)
   .input(
  "can_view_po_links",
  sql.Bit,
  payload.can_view_po_links,
)
.input(
  "can_request_po_links",
  sql.Bit,
  payload.can_request_po_links,
)
.input(
  "can_view_all_po_link_requests",
  sql.Bit,
  payload.can_view_all_po_link_requests,
)
.input(
  "can_approve_po_links",
  sql.Bit,
  payload.can_approve_po_links,
)
    .input("can_request_transfer", sql.Bit, payload.can_request_transfer)
    .input("can_approve_budget", sql.Bit, payload.can_approve_budget)
    .input("can_approve_transfer", sql.Bit, payload.can_approve_transfer)
    .input("can_manage_users", sql.Bit, payload.can_manage_users)
    .input("can_manage_categories", sql.Bit, payload.can_manage_categories)
    .input("can_view_reports", sql.Bit, payload.can_view_reports)
    .input(
      "can_manage_financial_years",
      sql.Bit,
      payload.can_manage_financial_years,
    )
    .input(
      "can_manage_po_item_mappings",
      sql.Bit,
      payload.can_manage_po_item_mappings,
    ).query(`
      UPDATE BS_budget_user_roles
      SET
        department_id = @department_id,
        category_id = @category_id,
        role_id = @role_id,

        can_view_budget = @can_view_budget,
        can_edit_budget = @can_edit_budget,
        can_view_po_links = @can_view_po_links,
        can_request_po_links = @can_request_po_links,
        can_view_all_po_link_requests = @can_view_all_po_link_requests,
        can_approve_po_links = @can_approve_po_links,
        can_request_transfer = @can_request_transfer,
        can_approve_budget = @can_approve_budget,
        can_approve_transfer = @can_approve_transfer,
        can_manage_users = @can_manage_users,
        can_manage_categories = @can_manage_categories,
        can_view_reports = @can_view_reports,
can_manage_financial_years = @can_manage_financial_years,
        can_manage_po_item_mappings = @can_manage_po_item_mappings,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

  return result.recordset[0];
}

export async function updateBudgetAccessAssignmentStatusRepo(id, isActive) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, id)
    .input("is_active", sql.Bit, isActive).query(`
      UPDATE BS_budget_user_roles
      SET
        is_active = @is_active,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

  return result.recordset[0];
}

export async function deleteBudgetAccessAssignmentRepo(id) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, id).query(`
      DELETE FROM BS_budget_user_roles
      OUTPUT DELETED.*
      WHERE id = @id
    `);

  return result.recordset[0] || null;
}
export async function findDepartmentHodRepo({
  department_id,
  excludeId = null,
}) {
  const pool = await poolPromise;

  const request = pool.request().input("department_id", sql.Int, department_id);

  let query = `
    SELECT TOP 1
      bur.id
    FROM BS_budget_user_roles bur
    INNER JOIN BS_budget_roles r
      ON r.id = bur.role_id
    WHERE bur.department_id = @department_id
      AND bur.is_active = 1
      AND UPPER(r.name) = 'HOD'
  `;

  if (excludeId) {
    request.input("excludeId", sql.BigInt, excludeId);

    query += `
      AND bur.id <> @excludeId
    `;
  }

  const result = await request.query(query);

  return result.recordset[0] || null;
}
