import { ApiError } from "../../utils/apiError.js";
import { withTransaction } from "../../database/transaction.js";
import {
  ROLE_CODES,
  getScopeRule,
  normalizePermissionCodes,
} from "./access.constants.js";
import {
  createBudgetAccessAssignmentRepo,
  deleteBudgetAccessAssignmentRepo,
  findBudgetAccessAssignmentByIdRepo,
  findBudgetRoleByIdRepo,
  findDuplicateBudgetAccessAssignmentRepo,
  getActiveAssignmentsByUserIdRepo,
  getBudgetAccessDepartmentsRepo,
  getBudgetAccessAssignmentsRepo,
  getBudgetAccessUsersRepo,
  getBudgetRolesRepo,
  getAssignmentPermissionMatrixRepo,
  getEffectivePermissionCodesByUserRoleIdRepo,
  getUsersByEffectivePermissionRepo,
  findActivePermissionIdsRepo,
  replaceAssignmentPermissionOverridesRepo,
  updateBudgetAccessAssignmentRepo,
  updateBudgetAccessAssignmentStatusRepo,
} from "./access.repository.js";
import {
  mapAssignmentRow,
  mapAssignmentRowToWorkspace,
} from "./access.mapper.js";
import { assertCanonicalPermissionCode } from "../../../shared/permissions/permissionCodes.js";

function normalizeNullableInt(value) {
  if (value === null || value === undefined || value === "") return null;
  return Number(value);
}

export function validateRoleScope({ role, department_id, budget_category_id }) {
  if (!role?.role_code) {
    throw new ApiError(400, "Role is missing a role code", "ROLE_CODE_REQUIRED");
  }

  const rule = getScopeRule(role.role_code);

  if (!rule) {
    throw new ApiError(
      400,
      `Unsupported budget role code ${role.role_code}`,
      "UNSUPPORTED_ROLE_CODE",
    );
  }

  if (rule.departmentRequired && !department_id) {
    throw new ApiError(
      400,
      "Department is required for this role",
      "DEPARTMENT_SCOPE_REQUIRED",
    );
  }

  if (!rule.departmentAllowed && department_id) {
    throw new ApiError(
      400,
      "Department scope is not allowed for this role",
      "DEPARTMENT_SCOPE_NOT_ALLOWED",
    );
  }

  if (rule.categoryRequired && !budget_category_id) {
    throw new ApiError(
      400,
      "Budget category is required for this role",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  if (!rule.categoryAllowed && budget_category_id) {
    throw new ApiError(
      400,
      "Budget category scope is not allowed for this role",
      "CATEGORY_SCOPE_NOT_ALLOWED",
    );
  }
}

function normalizeAssignmentPayload(payload = {}) {
  return {
    user_id: normalizeNullableInt(payload.user_id),
    role_id: normalizeNullableInt(payload.role_id),
    department_id: normalizeNullableInt(payload.department_id),
    budget_category_id: normalizeNullableInt(payload.budget_category_id),
    is_active:
      typeof payload.is_active === "boolean" ? payload.is_active : true,
    created_by: normalizeNullableInt(payload.created_by),
    updated_by: normalizeNullableInt(payload.updated_by),
  };
}

async function getHydratedAssignment(record) {
  if (!record?.id) return record;

  const hydrated = await findBudgetAccessAssignmentByIdRepo(record.id);
  return hydrated ? mapAssignmentRow(hydrated) : record;
}

function mapPermissionMatrixRow(row) {
  const overrideAction = row.override_action || null;
  const inheritedAllowed = Boolean(row.role_default);
  const effectiveAllowed =
    overrideAction === "GRANT"
      ? true
      : overrideAction === "DENY"
        ? false
        : inheritedAllowed;

  return {
    permission_id: row.permission_id,
    permission_code: row.permission_code,
    name: row.name,
    description: row.description,
    permission_group: row.permission_group,
    sort_order: row.sort_order,
    role_default: inheritedAllowed,
    override_action: overrideAction,
    effective_allowed: effectiveAllowed,
  };
}

async function getPermissionOverrideState(id, assignmentRow = null) {
  const assignment =
    assignmentRow || (await findBudgetAccessAssignmentByIdRepo(id));

  if (!assignment) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  const permissions = (await getAssignmentPermissionMatrixRepo(id)).map(
    mapPermissionMatrixRow,
  );

  return {
    assignment: mapAssignmentRow(assignment),
    permissions,
    overrides: permissions
      .filter((permission) => permission.override_action)
      .map((permission) => ({
        permission_id: permission.permission_id,
        permission_code: permission.permission_code,
        action: permission.override_action,
      })),
  };
}

function normalizeOverridePayload(overrides = []) {
  return overrides.map((override) => ({
    permission_id: normalizeNullableInt(override.permission_id),
    action: override.action,
  }));
}

function validateOverridePayload(overrides) {
  const seen = new Set();

  for (const override of overrides) {
    if (!override.permission_id) {
      throw new ApiError(
        400,
        "permission_id must be a positive integer",
        "VALIDATION_ERROR",
      );
    }

    if (seen.has(override.permission_id)) {
      throw new ApiError(
        400,
        "Duplicate permission overrides are not allowed",
        "DUPLICATE_PERMISSION_OVERRIDE",
      );
    }

    if (!["GRANT", "DENY"].includes(override.action)) {
      throw new ApiError(
        400,
        "override action must be GRANT or DENY",
        "VALIDATION_ERROR",
      );
    }

    seen.add(override.permission_id);
  }
}

export async function resolveBudgetAccessForUser({
  userId,
  requestedUserRoleId = null,
} = {}) {
  const assignments = await getActiveAssignmentsByUserIdRepo(userId);

  if (!assignments.length) {
    return null;
  }

  const workspaces = [];

  for (const assignment of assignments) {
    const permissionCodes = normalizePermissionCodes(
      await getEffectivePermissionCodesByUserRoleIdRepo(
        assignment.user_role_id,
      ),
    );

    workspaces.push(mapAssignmentRowToWorkspace(assignment, permissionCodes));
  }

  const selectedWorkspace = requestedUserRoleId
    ? workspaces.find(
        (workspace) => workspace.userRoleId === Number(requestedUserRoleId),
      )
    : workspaces[0];

  if (!selectedWorkspace) {
    throw new ApiError(
      403,
      "The selected budget workspace is not available for this user",
      "BUDGET_WORKSPACE_NOT_AVAILABLE",
    );
  }

  return {
    hasAccess: true,
    userId,
    userRoleId: selectedWorkspace.userRoleId,
    activeUserRoleId: selectedWorkspace.userRoleId,
    workspaceId: selectedWorkspace.userRoleId,
    workspaceType: selectedWorkspace.type,
    workspaceLabel: selectedWorkspace.label,
    actingAs: selectedWorkspace.actingAs,
    role: selectedWorkspace.role,
    department: selectedWorkspace.department,
    budgetCategory: selectedWorkspace.budgetCategory,
    category: selectedWorkspace.budgetCategory,
    permissionCodes: selectedWorkspace.permissionCodes,
    selectedWorkspace,
    workspace: selectedWorkspace,
    workspaces,
  };
}

export async function getBudgetAccessByUserId(userId, options = {}) {
  return resolveBudgetAccessForUser({
    userId,
    requestedUserRoleId: options.requestedUserRoleId,
  });
}

export async function getUsersByEffectivePermission({
  permissionCode,
  scope = { type: "GLOBAL" },
} = {}) {
  assertCanonicalPermissionCode(permissionCode);

  return getUsersByEffectivePermissionRepo({
    permissionCode,
    scope: {
      type: scope?.type || "GLOBAL",
      departmentId: scope?.departmentId ?? null,
      categoryId: scope?.categoryId ?? null,
    },
  });
}

export async function getBudgetRolesService() {
  return getBudgetRolesRepo();
}

export async function getBudgetAccessAssignmentsService() {
  const rows = await getBudgetAccessAssignmentsRepo();
  return rows.map(mapAssignmentRow);
}

export async function getBudgetAccessUsersService(query = {}) {
  return getBudgetAccessUsersRepo({
    search: query.search || "",
    page: query.page || 1,
    pageSize: query.pageSize || 50,
  });
}

export async function getBudgetAccessDepartmentsService() {
  return getBudgetAccessDepartmentsRepo();
}

export async function createBudgetAccessAssignmentService(payload) {
  const normalizedPayload = normalizeAssignmentPayload(payload);

  const role = await findBudgetRoleByIdRepo(normalizedPayload.role_id);

  if (!role || !role.is_active) {
    throw new ApiError(404, "Budget role not found", "ROLE_NOT_FOUND");
  }

  validateRoleScope({
    role,
    department_id: normalizedPayload.department_id,
    budget_category_id: normalizedPayload.budget_category_id,
  });

  const duplicate = await findDuplicateBudgetAccessAssignmentRepo(
    normalizedPayload,
  );

  if (duplicate) {
    throw new ApiError(
      409,
      "This user already has this role for this scope",
      "DUPLICATE_USER_ROLE",
    );
  }

  const created = await createBudgetAccessAssignmentRepo(normalizedPayload);
  return getHydratedAssignment(created);
}

export async function updateBudgetAccessAssignmentService(id, payload) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  const normalizedPayload = normalizeAssignmentPayload(payload);
  const role = await findBudgetRoleByIdRepo(normalizedPayload.role_id);

  if (!role || !role.is_active) {
    throw new ApiError(404, "Budget role not found", "ROLE_NOT_FOUND");
  }

  validateRoleScope({
    role,
    department_id: normalizedPayload.department_id,
    budget_category_id: normalizedPayload.budget_category_id,
  });

  const duplicate = await findDuplicateBudgetAccessAssignmentRepo({
    ...normalizedPayload,
    excludeId: id,
  });

  if (duplicate) {
    throw new ApiError(
      409,
      "This user already has this role for this scope",
      "DUPLICATE_USER_ROLE",
    );
  }

  const updated = await updateBudgetAccessAssignmentRepo(id, normalizedPayload);
  return getHydratedAssignment(updated);
}

export async function updateBudgetAccessAssignmentStatusService(
  id,
  isActive,
  updatedBy = null,
) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  const updated = await updateBudgetAccessAssignmentStatusRepo(
    id,
    isActive,
    updatedBy,
  );
  return getHydratedAssignment(updated);
}

export async function deleteBudgetAccessAssignmentService(id) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  await deleteBudgetAccessAssignmentRepo(id);

  return mapAssignmentRow(existing);
}

export async function getAssignmentPermissionOverridesService(id) {
  return getPermissionOverrideState(id);
}

export async function replaceAssignmentPermissionOverridesService(id, payload) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  const overrides = normalizeOverridePayload(payload.overrides || []);
  validateOverridePayload(overrides);

  const activePermissionIds = new Set(
    await findActivePermissionIdsRepo(
      overrides.map((override) => override.permission_id),
    ),
  );
  const invalidOverride = overrides.find(
    (override) => !activePermissionIds.has(override.permission_id),
  );

  if (invalidOverride) {
    throw new ApiError(
      400,
      `Permission ${invalidOverride.permission_id} is not active or does not exist`,
      "INVALID_PERMISSION_OVERRIDE",
    );
  }

  const before = await getPermissionOverrideState(id, existing);

  await withTransaction(async (transaction) => {
    await replaceAssignmentPermissionOverridesRepo(
      transaction,
      id,
      overrides,
      normalizeNullableInt(payload.updated_by),
    );
  });

  const after = await getPermissionOverrideState(id, existing);

  return {
    assignment: after.assignment,
    before,
    after,
  };
}
