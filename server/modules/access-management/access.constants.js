export const ROLE_CODES = Object.freeze({
  DEPARTMENT_BUDGET_MANAGER: "DEPARTMENT_BUDGET_MANAGER",
  DEPARTMENT_USER: "DEPARTMENT_USER",
  CATEGORY_BUDGET_MANAGER: "CATEGORY_BUDGET_MANAGER",
  BUDGET_APPROVER: "BUDGET_APPROVER",
  PO_LINK_MANAGER: "PO_LINK_MANAGER",
  BUDGET_SYSTEM_ADMIN: "BUDGET_SYSTEM_ADMIN",
});

export const ROLE_SCOPE_RULES = Object.freeze({
  [ROLE_CODES.DEPARTMENT_BUDGET_MANAGER]: {
    departmentRequired: true,
    categoryRequired: false,
    departmentAllowed: true,
    categoryAllowed: false,
  },
  [ROLE_CODES.DEPARTMENT_USER]: {
    departmentRequired: true,
    categoryRequired: false,
    departmentAllowed: true,
    categoryAllowed: false,
  },
  [ROLE_CODES.CATEGORY_BUDGET_MANAGER]: {
    departmentRequired: false,
    categoryRequired: true,
    departmentAllowed: false,
    categoryAllowed: true,
  },
  [ROLE_CODES.BUDGET_APPROVER]: {
    departmentRequired: false,
    categoryRequired: false,
    departmentAllowed: false,
    categoryAllowed: false,
  },
  [ROLE_CODES.PO_LINK_MANAGER]: {
    departmentRequired: false,
    categoryRequired: false,
    departmentAllowed: false,
    categoryAllowed: false,
  },
  [ROLE_CODES.BUDGET_SYSTEM_ADMIN]: {
    departmentRequired: false,
    categoryRequired: false,
    departmentAllowed: false,
    categoryAllowed: false,
  },
});

export const PERMISSION_CODES = Object.freeze({
  VIEW_DEPARTMENT_BUDGET_REQUESTS: "can_view_department_budget_requests",
  MANAGE_DEPARTMENT_BUDGET_REQUESTS: "can_manage_department_budget_requests",
  SUBMIT_DEPARTMENT_CATEGORY_BUDGETS:
    "can_submit_department_category_budgets",
  SUBMIT_DEPARTMENT_BUDGET_CHANGE_REQUESTS:
    "can_submit_department_budget_change_requests",
  VIEW_CATEGORY_BUDGET_REQUESTS: "can_view_category_budget_requests",
  REVIEW_DEPARTMENT_CATEGORY_REQUESTS:
    "can_review_department_category_requests",
  CONTROL_CATEGORY_SUBMISSION_WINDOW:
    "can_control_category_submission_window",
  MANAGE_CATEGORY_BUDGET_PACKAGES: "can_manage_category_budget_packages",
  MANAGE_CATEGORY_BUDGET_SUB_ITEMS: "can_manage_category_budget_sub_items",
  MANAGE_CATEGORY_SUPPORTING_DOCUMENTS:
    "can_manage_category_supporting_documents",
  SUBMIT_CATEGORY_BUDGET_PACKAGES_TO_CFO:
    "can_submit_category_budget_packages_to_cfo",
  REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS:
    "can_review_category_budget_change_requests",
  VIEW_CFO_CATEGORY_BUDGET_PACKAGES: "can_view_cfo_category_budget_packages",
  APPROVE_CATEGORY_BUDGET_PACKAGES: "can_approve_category_budget_packages",
  APPROVE_BUDGET_CHANGE_REQUESTS: "can_approve_budget_change_requests",
  MANAGE_FINANCIAL_YEAR_LIFECYCLE:
    "can_manage_financial_year_lifecycle",
  CREATE_CATEGORY_TRANSFERS: "can_create_category_transfers",
  APPROVE_CATEGORY_TRANSFERS: "can_approve_category_transfers",
  VIEW_ASSIGNED_CATEGORY_PO_LINKS: "can_view_assigned_category_po_links",
  REQUEST_CATEGORY_PO_LINKS: "can_request_category_po_links",
  VIEW_ALL_CATEGORY_PO_LINK_REQUESTS:
    "can_view_all_category_po_link_requests",
  APPROVE_CATEGORY_PO_LINKS: "can_approve_category_po_links",
  MANAGE_PO_ITEM_MAPPINGS: "can_manage_po_item_mappings",
  MANAGE_BUDGET_ACCESS: "can_manage_budget_access",
  MANAGE_BUDGET_CATALOG: "can_manage_budget_catalog",
  VIEW_BUDGET_REPORTS: "can_view_budget_reports",
  VIEW_AUDIT_LOGS: "can_view_audit_logs",
});

export const LEGACY_PERMISSION_ALIASES = Object.freeze({
  can_view_budget: [
    PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.VIEW_BUDGET_REPORTS,
  ],
  can_edit_budget: [
    PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
    PERMISSION_CODES.SUBMIT_DEPARTMENT_CATEGORY_BUDGETS,
  ],
  can_request_transfer: [PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS],
  can_approve_transfer: [PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS],
  can_approve_budget: [
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.APPROVE_BUDGET_CHANGE_REQUESTS,
    PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
  ],
  can_manage_users: [PERMISSION_CODES.MANAGE_BUDGET_ACCESS],
  can_manage_categories: [
    PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
    PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS,
    PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
  ],
  can_view_reports: [PERMISSION_CODES.VIEW_BUDGET_REPORTS],
  can_manage_financial_years: [
    PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
  ],
  can_view_po_links: [
    PERMISSION_CODES.VIEW_ASSIGNED_CATEGORY_PO_LINKS,
    PERMISSION_CODES.VIEW_ALL_CATEGORY_PO_LINK_REQUESTS,
  ],
  can_request_po_links: [PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS],
  can_view_all_po_link_requests: [
    PERMISSION_CODES.VIEW_ALL_CATEGORY_PO_LINK_REQUESTS,
  ],
  can_approve_po_links: [PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS],
  can_manage_po_item_mappings: [PERMISSION_CODES.MANAGE_PO_ITEM_MAPPINGS],
});

export function getScopeRule(roleCode) {
  return ROLE_SCOPE_RULES[roleCode] || null;
}

export function normalizePermissionCodes(permissionCodes = []) {
  return [
    ...new Set(
      permissionCodes
        .filter((permissionCode) => typeof permissionCode === "string")
        .map((permissionCode) => permissionCode.trim())
        .filter(Boolean),
    ),
  ];
}

export function buildPermissionMap(permissionCodes = []) {
  const normalized = normalizePermissionCodes(permissionCodes);
  const permissionSet = new Set(normalized);
  const permissions = {};

  for (const permissionCode of normalized) {
    permissions[permissionCode] = true;
  }

  for (const [legacyPermission, mappedCodes] of Object.entries(
    LEGACY_PERMISSION_ALIASES,
  )) {
    permissions[legacyPermission] = mappedCodes.some((permissionCode) =>
      permissionSet.has(permissionCode),
    );
  }

  return permissions;
}

export function hasPermission(access, permissionCode) {
  if (!permissionCode) return true;

  if (Array.isArray(permissionCode)) {
    return permissionCode.some((code) => hasPermission(access, code));
  }

  if (access?.permissions?.[permissionCode] === true) {
    return true;
  }

  const mappedCodes = LEGACY_PERMISSION_ALIASES[permissionCode] || [];

  return mappedCodes.some(
    (mappedCode) => access?.permissions?.[mappedCode] === true,
  );
}

export function getWorkspaceTypeForRole(roleCode) {
  if (
    roleCode === ROLE_CODES.DEPARTMENT_BUDGET_MANAGER ||
    roleCode === ROLE_CODES.DEPARTMENT_USER
  ) {
    return "DEPARTMENT";
  }

  if (roleCode === ROLE_CODES.CATEGORY_BUDGET_MANAGER) {
    return "CATEGORY";
  }

  return "GLOBAL";
}
