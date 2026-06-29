import { poolPromise, sql } from "../config/db.js";
import {
  buildPermissions,
  deriveBudgetWorkspaces,
  isAdminRole,
  mergePermissions,
  selectActiveWorkspace,
} from "../helpers/budgetWorkspace.helper.js";

export async function getBudgetAccessByUserId(
  userId,
  { activeWorkspaceId } = {},
) {
  const pool = await poolPromise;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT
      bur.id AS assignment_id,
      bur.user_id,

      bur.department_id,
      d.name AS department_name,

      bur.category_id,
      bc.name AS category_name,
      bc.code AS category_code,

      bur.role_id,
      br.name AS role_name,

COALESCE(bur.can_view_budget, brp.can_view_budget, 0) AS can_view_budget,
COALESCE(bur.can_edit_budget, brp.can_edit_budget, 0) AS can_edit_budget,

COALESCE(bur.can_view_po_links, brp.can_view_po_links, 0) AS can_view_po_links,
COALESCE(bur.can_request_po_links, brp.can_request_po_links, 0) AS can_request_po_links,
COALESCE(
  bur.can_view_all_po_link_requests,
  brp.can_view_all_po_link_requests,
  0
) AS can_view_all_po_link_requests,
COALESCE(
  bur.can_approve_po_links,
  brp.can_approve_po_links,
  0
) AS can_approve_po_links,

COALESCE(bur.can_request_transfer, brp.can_request_transfer, 0) AS can_request_transfer,
COALESCE(bur.can_approve_budget, brp.can_approve_budget, 0) AS can_approve_budget,
COALESCE(bur.can_approve_transfer, brp.can_approve_transfer, 0) AS can_approve_transfer,
COALESCE(bur.can_manage_users, brp.can_manage_users, 0) AS can_manage_users,
COALESCE(bur.can_manage_categories, brp.can_manage_categories, 0) AS can_manage_categories,
COALESCE(bur.can_view_reports, brp.can_view_reports, 0) AS can_view_reports,
COALESCE(bur.can_manage_financial_years, brp.can_manage_financial_years, 0) AS can_manage_financial_years,
COALESCE(
  bur.can_manage_po_item_mappings,
  brp.can_manage_po_item_mappings,
  0
) AS can_manage_po_item_mappings
    FROM BS_budget_user_roles bur
    LEFT JOIN BS_departments d
      ON d.id = bur.department_id
    LEFT JOIN BS_budget_categories bc
      ON bc.id = bur.category_id
    LEFT JOIN BS_budget_roles br
      ON br.id = bur.role_id
    LEFT JOIN BS_budget_role_permissions brp
      ON brp.role_id = bur.role_id
    WHERE bur.user_id = @userId
      AND bur.is_active = 1
    ORDER BY bur.id DESC
  `);

  const rows = result.recordset || [];
  if (!rows.length) return null;

  const assignments = rows.map((row) => ({
    id: row.assignment_id,
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
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name,
          code: row.category_code,
        }
      : null,
    permissions: buildPermissions(row),
  }));

  const workspaces = deriveBudgetWorkspaces(assignments);
  const { activeWorkspace, invalidRequestedWorkspace } = selectActiveWorkspace(
    workspaces,
    activeWorkspaceId,
  );
  const fallbackAssignment = assignments[0];
  const activeAssignment =
    assignments.find(
      (assignment) => assignment.id === activeWorkspace?.assignmentId,
    ) || fallbackAssignment;

  const isGlobalAdmin = assignments.some(
    (assignment) =>
      isAdminRole(assignment.role?.name) &&
      !assignment.department &&
      !assignment.category,
  );

  return {
    hasAccess: true,
    userId: fallbackAssignment.userId,

    role: activeWorkspace?.role || activeAssignment.role,

    department:
      activeWorkspace?.department !== undefined
        ? activeWorkspace.department
        : activeAssignment.department,

    category:
      activeWorkspace?.categoryScope !== undefined
        ? activeWorkspace.categoryScope
        : activeAssignment.category,

    isGlobalAdmin,

    permissions:
      activeWorkspace?.permissions ||
      activeAssignment.permissions ||
      mergePermissions(assignments),

    assignments,
    workspaces,
    activeWorkspace,
    invalidRequestedWorkspace,
  };
}
