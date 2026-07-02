import {
  ROLE_CODES,
  buildPermissionMap,
  getWorkspaceTypeForRole,
} from "./access.constants.js";

function mapDepartment(row) {
  if (!row.department_id) return null;

  return {
    id: row.department_id,
    name: row.department_name,
    code: row.department_code || null,
  };
}

function mapBudgetCategory(row) {
  if (!row.budget_category_id) return null;

  return {
    id: row.budget_category_id,
    name: row.budget_category_name,
    code: row.category_code || null,
  };
}

function buildWorkspaceLabel({ role, department, budgetCategory }) {
  if (department) {
    return `${role.name} - ${department.name}`;
  }

  if (budgetCategory) {
    return `${role.name} - ${budgetCategory.name}`;
  }

  return role.name;
}

export function mapAssignmentRowToWorkspace(row, permissionCodes = []) {
  const role = {
    id: row.role_id,
    name: row.role_name,
    code: row.role_code,
  };
  const department = mapDepartment(row);
  const budgetCategory = mapBudgetCategory(row);
  const type = getWorkspaceTypeForRole(role.code);
  const label = buildWorkspaceLabel({ role, department, budgetCategory });

  return {
    id: row.user_role_id,
    userRoleId: row.user_role_id,
    userId: row.user_id,
    role,
    department,
    budgetCategory,
    category: budgetCategory,
    type,
    label,
    actingAs: label,
    isGlobalAdmin: role.code === ROLE_CODES.BUDGET_SYSTEM_ADMIN,
    permissionCodes,
    permissions: buildPermissionMap(permissionCodes),
  };
}

export function mapAssignmentRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    user_code: row.user_code,
    user_name: row.user_name,
    department_id: row.department_id,
    department_name: row.department_name,
    department_code: row.department_code || null,
    budget_category_id: row.budget_category_id,
    budget_category_name: row.budget_category_name,
    category_code: row.category_code || null,
    role_id: row.role_id,
    role_name: row.role_name,
    role_code: row.role_code,
    is_active: Boolean(row.is_active),
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
