import { poolPromise, sql } from "../config/db.js";

export async function getBudgetAccessByUserId(userId) {
  const pool = await poolPromise;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
      SELECT
        bur.user_id,
        bur.department_id,
        d.name AS department_name,
        bur.role_id,
        br.name AS role_name,

        COALESCE(bur.can_view_budget, brp.can_view_budget) AS can_view_budget,
        COALESCE(bur.can_edit_budget, brp.can_edit_budget) AS can_edit_budget,
        COALESCE(bur.can_link_po, brp.can_link_po) AS can_link_po,
        COALESCE(bur.can_request_transfer, brp.can_request_transfer) AS can_request_transfer,
        COALESCE(bur.can_approve_budget, brp.can_approve_budget) AS can_approve_budget,
        COALESCE(bur.can_approve_transfer, brp.can_approve_transfer) AS can_approve_transfer,
        COALESCE(bur.can_manage_users, brp.can_manage_users) AS can_manage_users,
        COALESCE(bur.can_manage_categories, brp.can_manage_categories) AS can_manage_categories,
        COALESCE(bur.can_view_reports, brp.can_view_reports) AS can_view_reports,
        COALESCE(bur.can_manage_financial_years, brp.can_manage_financial_years) AS can_manage_financial_years

      FROM BS_budget_user_roles bur
      LEFT JOIN BS_departments d
        ON d.id = bur.department_id
      LEFT JOIN BS_budget_roles br
        ON br.id = bur.role_id
      LEFT JOIN BS_budget_role_permissions brp
        ON brp.role_id = bur.role_id
      WHERE bur.user_id = @userId
        AND bur.is_active = 1
    `);

  const rows = result.recordset;

  if (rows.length === 0) return null;

  const permissions = {
    can_view_budget: false,
    can_edit_budget: false,
    can_link_po: false,
    can_request_transfer: false,
    can_approve_budget: false,
    can_approve_transfer: false,
    can_manage_users: false,
    can_manage_categories: false,
    can_view_reports: false,
    can_manage_financial_years: false,
  };

  const roles = [];
  const departments = [];

  for (const row of rows) {
    roles.push({
      role_id: row.role_id,
      role_name: row.role_name,
      department_id: row.department_id,
      department_name: row.department_name,
    });

    if (row.department_id) {
      departments.push({
        department_id: row.department_id,
        department_name: row.department_name,
        role_name: row.role_name,
      });
    }

    for (const key of Object.keys(permissions)) {
      if (row[key] === true || row[key] === 1) {
        permissions[key] = true;
      }
    }
  }

  return {
    user_id: rows[0].user_id,
    roles,
    departments,
    is_global_admin: roles.some(
      (role) => role.role_name === "ADMIN" && role.department_id === null,
    ),
    ...permissions,
  };
}
