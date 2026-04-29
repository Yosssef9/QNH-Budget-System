import { poolPromise, sql } from "../config/db.js";

export async function getBudgetAccessByUserId(userId) {
  const pool = await poolPromise;

  const result = await pool.request()
  .input("userId", sql.Int, userId)
  .query(`
    SELECT TOP 1
      bur.user_id,
      bur.department_id,
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
      COALESCE(bur.can_view_reports, brp.can_view_reports) AS can_view_reports

    FROM BS_budget_user_roles bur
    LEFT JOIN BS_budget_roles br
      ON br.id = bur.role_id
    LEFT JOIN BS_budget_role_permissions brp
      ON brp.role_id = bur.role_id
    WHERE bur.user_id = @userId
      AND bur.is_active = 1
  `);

  const row = result.recordset[0];

  if (!row) return null;

  return {
    ...row,
    can_view_budget: !!row.can_view_budget,
    can_edit_budget: !!row.can_edit_budget,
    can_link_po: !!row.can_link_po,
    can_request_transfer: !!row.can_request_transfer,
    can_approve_budget: !!row.can_approve_budget,
    can_approve_transfer: !!row.can_approve_transfer,
    can_manage_users: !!row.can_manage_users,
    can_manage_categories: !!row.can_manage_categories,
    can_view_reports: !!row.can_view_reports,
  };
}
