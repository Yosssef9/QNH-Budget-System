import { ApiError } from "../utils/apiError.js";
import {
  findBudgetAccessAssignmentByIdRepo,
  findDuplicateBudgetAccessAssignmentRepo,
  getBudgetAccessAssignmentsRepo,
  createBudgetAccessAssignmentRepo,
  updateBudgetAccessAssignmentRepo,
  updateBudgetAccessAssignmentStatusRepo,
} from "../repositories/budgetAccessAssignments.repository.js";

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
      "DUPLICATE_USER_ROLE"
    );
  }

  return await createBudgetAccessAssignmentRepo(payload);
}

export async function updateBudgetAccessAssignmentService(id, payload) {
  const existing = await findBudgetAccessAssignmentByIdRepo(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
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