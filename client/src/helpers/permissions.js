export function can(access, permission) {
  return Boolean(access?.permissions?.[permission]);
}

export function isAdmin(access) {
  return Boolean(
    access?.isGlobalAdmin === true ||
    access?.permissions?.can_manage_users === true,
  );
}

export function getUserRoleLabel(access) {
  if (access?.isGlobalAdmin) return "Global Admin";

  if (access?.permissions?.can_approve_budget) return "Approver";

  if (access?.permissions?.can_edit_budget) return "Budget Editor";

  if (access?.permissions?.can_view_budget) return "Budget Viewer";

  return "Budget User";
}
