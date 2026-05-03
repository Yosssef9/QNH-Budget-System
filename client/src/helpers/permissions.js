export function can(access, permission) {
  return Boolean(access?.[permission]);
}

export function isAdmin(access) {
  return Boolean(access?.is_global_admin || access?.can_manage_users);
}

export function getUserRoleLabel(access) {
  if (access?.is_global_admin) return "Global Admin";
  if (access?.can_approve_budget) return "Approver";
  if (access?.can_edit_budget) return "Budget Editor";
  if (access?.can_view_budget) return "Budget Viewer";
  return "Budget User";
}