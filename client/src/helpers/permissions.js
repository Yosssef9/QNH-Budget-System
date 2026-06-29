export function can(access, permission) {
  const permissions = access?.activeWorkspace?.permissions || access?.permissions;
  return Boolean(permissions?.[permission]);
}

export function isAdmin(access) {
  return Boolean(
    access?.isGlobalAdmin === true ||
    access?.permissions?.can_manage_users === true,
  );
}

export function getUserRoleLabel(access) {
  if (access?.activeWorkspace?.actingAs) {
    return access.activeWorkspace.actingAs;
  }

  if (access?.isGlobalAdmin) return "Global Admin";

  if (access?.permissions?.can_approve_po_links) {
    return "PO Link Approver";
  }

  if (access?.permissions?.can_approve_budget) {
    return "Budget Approver";
  }

  if (access?.permissions?.can_edit_budget) return "Budget Editor";

  if (access?.permissions?.can_view_budget) return "Budget Viewer";

  return "Budget User";
}
