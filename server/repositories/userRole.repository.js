import { poolPromise, sql } from "../config/db.js";

export async function getBudgetAccessByUserId(userId) {
  const pool = await poolPromise;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT TOP 1
      bur.user_id,

      bur.department_id,
      d.name AS department_name,

      bur.role_id,
      br.name AS role_name,

      COALESCE(bur.can_view_budget, brp.can_view_budget, 0) AS can_view_budget,
      COALESCE(bur.can_edit_budget, brp.can_edit_budget, 0) AS can_edit_budget,
      COALESCE(bur.can_link_po, brp.can_link_po, 0) AS can_link_po,
      COALESCE(bur.can_request_transfer, brp.can_request_transfer, 0) AS can_request_transfer,
      COALESCE(bur.can_approve_budget, brp.can_approve_budget, 0) AS can_approve_budget,
      COALESCE(bur.can_approve_transfer, brp.can_approve_transfer, 0) AS can_approve_transfer,
      COALESCE(bur.can_manage_users, brp.can_manage_users, 0) AS can_manage_users,
      COALESCE(bur.can_manage_categories, brp.can_manage_categories, 0) AS can_manage_categories,
      COALESCE(bur.can_view_reports, brp.can_view_reports, 0) AS can_view_reports,
      COALESCE(bur.can_manage_financial_years, brp.can_manage_financial_years, 0) AS can_manage_financial_years

    FROM BS_budget_user_roles bur
    LEFT JOIN BS_departments d
      ON d.id = bur.department_id
    LEFT JOIN BS_budget_roles br
      ON br.id = bur.role_id
    LEFT JOIN BS_budget_role_permissions brp
      ON brp.role_id = bur.role_id
    WHERE bur.user_id = @userId
      AND bur.is_active = 1
    ORDER BY bur.id DESC
  `);

  const row = result.recordset[0];
  if (!row) return null;

  const isGlobalAdmin = row.role_name === "ADMIN" && row.department_id === null;

  return {
    hasAccess: true,
    userId: row.user_id,

    role: {
      id: row.role_id,
      name: row.role_name,
    },

    department: row.department_id
      ? {
          id: row.department_id,
          name: row.department_name,
        }
      : null,

    isGlobalAdmin,

    permissions: {
      can_view_budget: Boolean(row.can_view_budget),
      can_edit_budget: Boolean(row.can_edit_budget),
      can_link_po: Boolean(row.can_link_po),
      can_request_transfer: Boolean(row.can_request_transfer),
      can_approve_budget: Boolean(row.can_approve_budget),
      can_approve_transfer: Boolean(row.can_approve_transfer),
      can_manage_users: Boolean(row.can_manage_users),
      can_manage_categories: Boolean(row.can_manage_categories),
      can_view_reports: Boolean(row.can_view_reports),
      can_manage_financial_years: Boolean(row.can_manage_financial_years),
    },
  };
}
