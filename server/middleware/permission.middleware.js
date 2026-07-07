import {
  PERMISSION_CODES,
  PERMISSION_CODE_VALUES,
  hasAnyPermission,
} from "../../shared/permissions/permissionCodes.js";

/*
 * Temporary compatibility boundary for old workflow routes only.
 *
 * New workflow modules must not import this middleware.
 * They must use:
 *
 * server/shared/middleware/requireBudgetPermission.js
 */

const CANONICAL_PERMISSION_SET = new Set(PERMISSION_CODE_VALUES);

const LEGACY_PERMISSION_REQUIREMENTS = Object.freeze({
  can_view_budget: Object.freeze([
    PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.VIEW_BUDGET_REPORTS,
  ]),

  can_edit_budget: Object.freeze([
    PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
    PERMISSION_CODES.SUBMIT_DEPARTMENT_CATEGORY_BUDGETS,
  ]),

  can_request_transfer: Object.freeze([
    PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
  ]),

  can_approve_transfer: Object.freeze([
    PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS,
  ]),

  can_approve_budget: Object.freeze([
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.APPROVE_BUDGET_CHANGE_REQUESTS,
    PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
  ]),

  can_manage_users: Object.freeze([PERMISSION_CODES.MANAGE_BUDGET_ACCESS]),

  can_manage_categories: Object.freeze([
    PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
    PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS,
    PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
  ]),

  can_view_reports: Object.freeze([PERMISSION_CODES.VIEW_BUDGET_REPORTS]),

  can_manage_financial_years: Object.freeze([
    PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
  ]),

  can_view_po_links: Object.freeze([
    PERMISSION_CODES.VIEW_ASSIGNED_CATEGORY_PO_LINKS,
    PERMISSION_CODES.VIEW_ALL_CATEGORY_PO_LINK_REQUESTS,
  ]),

  can_request_po_links: Object.freeze([
    PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS,
  ]),

  can_view_all_po_link_requests: Object.freeze([
    PERMISSION_CODES.VIEW_ALL_CATEGORY_PO_LINK_REQUESTS,
  ]),

  can_approve_po_links: Object.freeze([
    PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS,
  ]),

  can_manage_po_item_mappings: Object.freeze([
    PERMISSION_CODES.MANAGE_PO_ITEM_MAPPINGS,
  ]),
});

function resolveRequiredPermissions(permissionName) {
  if (CANONICAL_PERMISSION_SET.has(permissionName)) {
    return [permissionName];
  }

  const mappedPermissions = LEGACY_PERMISSION_REQUIREMENTS[permissionName];

  if (!mappedPermissions) {
    throw new Error(
      `Unknown legacy budget permission: ${String(permissionName)}`,
    );
  }

  return mappedPermissions;
}

export function requirePermission(permissionName) {
  /*
   * Resolve once when Express registers the route.
   * Unknown permission configuration fails immediately.
   */
  const requiredPermissions = resolveRequiredPermissions(permissionName);

  return (req, res, next) => {
    const granted = hasAnyPermission(
      req.budgetAccess?.permissionCodes || [],
      requiredPermissions,
    );

    if (!granted) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: missing required permission for ${permissionName}`,
      });
    }

    return next();
  };
}
