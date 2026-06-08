import { ApiError } from "../utils/apiError.js";
import {
  findBudgetAccessAssignmentByIdRepo,
  findDuplicateBudgetAccessAssignmentRepo,
  getBudgetAccessAssignmentsRepo,
  createBudgetAccessAssignmentRepo,
  updateBudgetAccessAssignmentRepo,
  updateBudgetAccessAssignmentStatusRepo,
  findDepartmentHodRepo,
} from "../repositories/budgetAccessAssignments.repository.js";
import { findBudgetRoleByIdRepo } from "../repositories/budgetRoles.repository.js";
export async function getBudgetAccessAssignmentsService() {
  return await getBudgetAccessAssignmentsRepo();
}

export async function createBudgetAccessAssignmentService(payload) {
  const duplicate = await findDuplicateBudgetAccessAssignmentRepo({
    user_id: payload.user_id,
    department_id: payload.department_id,
    role_id: payload.role_id,
  });

  if (duplicate) {
    throw new ApiError(
      409,
      "This user already has this role for this department",
      "DUPLICATE_USER_ROLE",
    );
  }
  const role = await findBudgetRoleByIdRepo(payload.role_id);

  const isHod = role?.name?.toUpperCase() === "HOD";
  if (isHod) {
    if (!payload.department_id) {
      throw new ApiError(
        400,
        "Department is required for HOD role",
        "HOD_DEPARTMENT_REQUIRED",
      );
    }

    const existingHod = await findDepartmentHodRepo({
      department_id: payload.department_id,
    });

    if (existingHod) {
      throw new ApiError(
        409,
        "This department already has an HOD",
        "DEPARTMENT_ALREADY_HAS_HOD",
      );
    }
  }
  return await createBudgetAccessAssignmentRepo(payload);
}

export async function updateBudgetAccessAssignmentService(id, payload) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }
  const role = await findBudgetRoleByIdRepo(payload.role_id);

  const isHod = role?.name?.toUpperCase() === "HOD";

  if (isHod) {
    if (!payload.department_id) {
      throw new ApiError(
        400,
        "Department is required for HOD role",
        "HOD_DEPARTMENT_REQUIRED",
      );
    }

    const existingHod = await findDepartmentHodRepo({
      department_id: payload.department_id,
      excludeId: id,
    });

    if (existingHod) {
      throw new ApiError(
        409,
        "This department already has an HOD",
        "DEPARTMENT_ALREADY_HAS_HOD",
      );
    }
  }
  return await updateBudgetAccessAssignmentRepo(id, payload);
}

export async function updateBudgetAccessAssignmentStatusService(id, isActive) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  return await updateBudgetAccessAssignmentStatusRepo(id, isActive);
}
