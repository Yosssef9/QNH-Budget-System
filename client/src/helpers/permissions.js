import {
  PERMISSION_CODES,
  hasAnyPermission,
  hasPermission,
} from "@qnh/permissions";

export function can(access, permission) {
  if (!permission) return true;

  if (Array.isArray(permission)) {
    return hasAnyPermission(access, permission);
  }

  return hasPermission(access, permission);
}

export function isAdmin(access) {
  return can(access, PERMISSION_CODES.MANAGE_BUDGET_ACCESS);
}

export function getUserRoleLabel(access) {
  const roleCode =
    access?.selectedWorkspace?.role?.code ||
    access?.workspace?.role?.code ||
    access?.role?.code;

  if (roleCode === "BUDGET_SYSTEM_ADMIN") return "Budget System Admin";
  if (roleCode === "BUDGET_APPROVER") return "Budget Approver";
  if (roleCode === "PO_LINK_MANAGER") return "PO Link Manager";
  if (roleCode === "CATEGORY_BUDGET_MANAGER") return "Category Manager";
  if (roleCode === "DEPARTMENT_BUDGET_MANAGER") return "Department Manager";
  if (roleCode === "DEPARTMENT_USER") return "Department User";

  if (can(access, PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS)) {
    return "PO Link Manager";
  }
  if (can(access, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES)) {
    return "Budget Approver";
  }
  if (can(access, PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS)) {
    return "Budget Editor";
  }
  if (can(access, PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS)) {
    return "Budget Viewer";
  }

  return "Budget User";
}
