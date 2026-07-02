const legacyPermissionAliases = {
  can_view_budget: [
    "can_view_department_budget_requests",
    "can_view_category_budget_requests",
    "can_view_cfo_category_budget_packages",
    "can_view_budget_reports",
  ],
  can_edit_budget: [
    "can_manage_department_budget_requests",
    "can_submit_department_category_budgets",
  ],
  can_request_transfer: ["can_create_category_transfers"],
  can_approve_transfer: ["can_approve_category_transfers"],
  can_approve_budget: [
    "can_view_cfo_category_budget_packages",
    "can_approve_category_budget_packages",
    "can_approve_budget_change_requests",
    "can_manage_financial_year_lifecycle",
  ],
  can_manage_users: ["can_manage_budget_access"],
  can_manage_categories: [
    "can_manage_budget_catalog",
    "can_review_department_category_requests",
    "can_manage_category_budget_packages",
  ],
  can_view_reports: ["can_view_budget_reports"],
  can_manage_financial_years: ["can_manage_financial_year_lifecycle"],
  can_view_po_links: [
    "can_view_assigned_category_po_links",
    "can_view_all_category_po_link_requests",
  ],
  can_request_po_links: ["can_request_category_po_links"],
  can_view_all_po_link_requests: ["can_view_all_category_po_link_requests"],
  can_approve_po_links: ["can_approve_category_po_links"],
  can_manage_po_item_mappings: ["can_manage_po_item_mappings"],
};

function permissionCodeSet(access) {
  return new Set(access?.permissionCodes || []);
}

export function can(access, permission) {
  if (!permission) return true;

  if (Array.isArray(permission)) {
    return permission.some((permissionName) => can(access, permissionName));
  }

  if (access?.permissions?.[permission] === true) {
    return true;
  }

  if (permissionCodeSet(access).has(permission)) {
    return true;
  }

  const mappedPermissions = legacyPermissionAliases[permission] || [];

  return mappedPermissions.some(
    (permissionName) =>
      access?.permissions?.[permissionName] === true ||
      permissionCodeSet(access).has(permissionName),
  );
}

export function isAdmin(access) {
  return Boolean(
    access?.isGlobalAdmin === true || can(access, "can_manage_budget_access"),
  );
}

export function getUserRoleLabel(access) {
  if (access?.isGlobalAdmin) return "Global Admin";

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

  if (can(access, "can_approve_category_po_links")) return "PO Link Manager";
  if (can(access, "can_approve_category_budget_packages")) {
    return "Budget Approver";
  }
  if (can(access, "can_manage_department_budget_requests")) {
    return "Budget Editor";
  }
  if (can(access, "can_view_department_budget_requests")) {
    return "Budget Viewer";
  }

  return "Budget User";
}
