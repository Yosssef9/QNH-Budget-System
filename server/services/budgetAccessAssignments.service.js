import { ApiError } from "../utils/apiError.js";
import {
  findBudgetAccessAssignmentByIdRepo,
  findDuplicateBudgetAccessAssignmentRepo,
  getBudgetAccessAssignmentsRepo,
  createBudgetAccessAssignmentRepo,
  updateBudgetAccessAssignmentRepo,
  updateBudgetAccessAssignmentStatusRepo,
  deleteBudgetAccessAssignmentRepo,
  findDepartmentHodRepo,
} from "../repositories/budgetAccessAssignments.repository.js";
import { findBudgetRoleByIdRepo } from "../repositories/budgetRoles.repository.js";
import { findCategoryByIdRepo } from "../repositories/category.repository.js";

function normalizeRoleName(roleName) {
  return String(roleName || "")
    .trim()
    .toUpperCase();
}

function normalizeAccessPayload(payload) {
  return {
    ...payload,
    department_id: payload.department_id || null,
    category_id: payload.category_id || null,
  };
}

async function validateAssignmentScope({
  payload,
  role,
  excludeId = null,
}) {
  const roleName = normalizeRoleName(role?.name);
  const isHod = roleName === "HOD";
  const isCategoryBudgetManager = roleName === "CATEGORY BUDGET MANAGER";

  if (isHod) {
    if (!payload.department_id) {
      throw new ApiError(
        400,
        "Department is required for HOD role",
        "HOD_DEPARTMENT_REQUIRED",
      );
    }

    if (payload.category_id) {
      throw new ApiError(
        400,
        "Category scope is not allowed for HOD role",
        "HOD_CATEGORY_NOT_ALLOWED",
      );
    }

    const existingHod = await findDepartmentHodRepo({
      department_id: payload.department_id,
      excludeId,
    });

    if (existingHod) {
      throw new ApiError(
        409,
        "This department already has an HOD",
        "DEPARTMENT_ALREADY_HAS_HOD",
      );
    }
  }

  if (isCategoryBudgetManager) {
    if (!payload.category_id) {
      throw new ApiError(
        400,
        "Category is required for Category Budget Manager role",
        "CATEGORY_MANAGER_CATEGORY_REQUIRED",
      );
    }

    if (payload.department_id) {
      throw new ApiError(
        400,
        "Department scope is not allowed for Category Budget Manager role",
        "CATEGORY_MANAGER_DEPARTMENT_NOT_ALLOWED",
      );
    }

    const category = await findCategoryByIdRepo(payload.category_id);

    if (!category) {
      throw new ApiError(
        404,
        "Category scope was not found",
        "CATEGORY_SCOPE_NOT_FOUND",
      );
    }
  }
}

export async function getBudgetAccessAssignmentsService() {
  return await getBudgetAccessAssignmentsRepo();
}

export async function createBudgetAccessAssignmentService(payload) {
  const normalizedPayload = normalizeAccessPayload(payload);
  const duplicate = await findDuplicateBudgetAccessAssignmentRepo({
    user_id: normalizedPayload.user_id,
    department_id: normalizedPayload.department_id,
    category_id: normalizedPayload.category_id,
    role_id: normalizedPayload.role_id,
  });

  if (duplicate) {
    throw new ApiError(
      409,
      "This user already has this role for this scope",
      "DUPLICATE_USER_ROLE",
    );
  }

  const role = await findBudgetRoleByIdRepo(normalizedPayload.role_id);

  if (!role) {
    throw new ApiError(404, "Budget role not found", "ROLE_NOT_FOUND");
  }

  await validateAssignmentScope({
    payload: normalizedPayload,
    role,
  });

  return await createBudgetAccessAssignmentRepo(normalizedPayload);
}

export async function updateBudgetAccessAssignmentService(id, payload) {
  const normalizedPayload = normalizeAccessPayload(payload);
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  const duplicate = await findDuplicateBudgetAccessAssignmentRepo({
    user_id: existing.user_id,
    department_id: normalizedPayload.department_id,
    category_id: normalizedPayload.category_id,
    role_id: normalizedPayload.role_id,
  });

  if (duplicate && Number(duplicate.id) !== Number(id)) {
    throw new ApiError(
      409,
      "This user already has this role for this scope",
      "DUPLICATE_USER_ROLE",
    );
  }

  const role = await findBudgetRoleByIdRepo(normalizedPayload.role_id);

  if (!role) {
    throw new ApiError(404, "Budget role not found", "ROLE_NOT_FOUND");
  }

  await validateAssignmentScope({
    payload: normalizedPayload,
    role,
    excludeId: id,
  });

  return await updateBudgetAccessAssignmentRepo(id, normalizedPayload);
}

export async function updateBudgetAccessAssignmentStatusService(id, isActive) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  return await updateBudgetAccessAssignmentStatusRepo(id, isActive);
}

export async function deleteBudgetAccessAssignmentService(id) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  return await deleteBudgetAccessAssignmentRepo(id);
}
