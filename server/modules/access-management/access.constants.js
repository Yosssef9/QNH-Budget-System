export const ROLE_CODES = Object.freeze({
  DEPARTMENT_BUDGET_MANAGER: "DEPARTMENT_BUDGET_MANAGER",
  DEPARTMENT_USER: "DEPARTMENT_USER",
  CATEGORY_BUDGET_MANAGER: "CATEGORY_BUDGET_MANAGER",
  PURCHASING_PRICE_REVIEWER: "PURCHASING_PRICE_REVIEWER",
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
  [ROLE_CODES.PURCHASING_PRICE_REVIEWER]: {
    departmentRequired: false,
    categoryRequired: false,
    departmentAllowed: false,
    categoryAllowed: false,
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
