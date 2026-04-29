import { ApiError } from "../utils/apiError.js";
import {
  findUserRoleById,
  findDuplicateUserRole,
  getUserRolesRepo,
  createUserRoleRepo,
  updateUserRoleRepo,
  updateUserRoleStatusRepo,
} from "../repositories/adminUserRoles.repository.js";

export async function getUserRolesService() {
  return await getUserRolesRepo();
}

export async function createUserRoleService(payload) {
  const duplicate = await findDuplicateUserRole({
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

  return await createUserRoleRepo(payload);
}

export async function updateUserRoleService(id, payload) {
  const existing = await findUserRoleById(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  return await updateUserRoleRepo(id, payload);
}

export async function updateUserRoleStatusService(id, isActive) {
  const existing = await findUserRoleById(id);

  if (!existing) {
    throw new ApiError(404, "User role not found", "USER_ROLE_NOT_FOUND");
  }

  return await updateUserRoleStatusRepo(id, isActive);
}