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
  SUBMIT_CATEGORY_BUDGET_PACKAGES_TO_PURCHASING:
    "can_submit_category_budget_packages_to_purchasing",
  VIEW_PURCHASING_PRICE_REVIEWS: "can_view_purchasing_price_reviews",
  REVIEW_CATEGORY_PACKAGE_PRICES: "can_review_category_package_prices",
  SUBMIT_PRICED_CATEGORY_PACKAGES_TO_CFO:
    "can_submit_priced_category_packages_to_cfo",
  MANAGE_PURCHASING_SUPPORTING_DOCUMENTS:
    "can_manage_purchasing_supporting_documents",
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
  MANAGE_DEPARTMENTS: "can_manage_departments",
  VIEW_BUDGET_REPORTS: "can_view_budget_reports",
  VIEW_AUDIT_LOGS: "can_view_audit_logs",
  VIEW_SYSTEM_HEALTH: "can_view_system_health",
});

export const PERMISSION_CODE_VALUES = Object.freeze(
  Object.values(PERMISSION_CODES),
);

const PERMISSION_CODE_SET = new Set(PERMISSION_CODE_VALUES);

export function assertCanonicalPermissionCode(permissionCode) {
  if (!PERMISSION_CODE_SET.has(permissionCode)) {
    throw new Error(`Unknown budget permission code: ${permissionCode}`);
  }

  return permissionCode;
}

function toPermissionSet(accessOrPermissionCodes) {
  if (accessOrPermissionCodes instanceof Set) return accessOrPermissionCodes;
  if (Array.isArray(accessOrPermissionCodes)) {
    return new Set(accessOrPermissionCodes);
  }
  if (accessOrPermissionCodes?.permissionCodes) {
    return new Set(accessOrPermissionCodes.permissionCodes);
  }
  return new Set();
}

export function hasPermission(accessOrPermissionCodes, permissionCode) {
  if (!permissionCode) return true;
  assertCanonicalPermissionCode(permissionCode);
  return toPermissionSet(accessOrPermissionCodes).has(permissionCode);
}

export function hasAnyPermission(accessOrPermissionCodes, permissionCodes = []) {
  return permissionCodes.some((permissionCode) =>
    hasPermission(accessOrPermissionCodes, permissionCode),
  );
}

export function hasAllPermissions(accessOrPermissionCodes, permissionCodes = []) {
  return permissionCodes.every((permissionCode) =>
    hasPermission(accessOrPermissionCodes, permissionCode),
  );
}
