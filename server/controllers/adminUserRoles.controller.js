import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  getUserRolesService,
  createUserRoleService,
  updateUserRoleService,
  updateUserRoleStatusService,
} from "../services/adminUserRoles.service.js";
import {
  validateCreateUserRole,
  validateUpdateUserRole,
  validateUpdateUserRoleStatus,
} from "../validators/adminUserRoles.validator.js";

export const getUserRoles = asyncHandler(async (req, res) => {
  const data = await getUserRolesService();

  return res.status(200).json(
    new ApiResponse({
      message: "User roles fetched successfully",
      data,
    })
  );
});

export const createUserRole = asyncHandler(async (req, res) => {
  validateCreateUserRole(req.body);

  const data = await createUserRoleService({
    ...req.body,
    created_by: req.user.userId,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "User role created successfully",
      data,
    })
  );
});

export const updateUserRole = asyncHandler(async (req, res) => {
  validateUpdateUserRole(req.body);

  const data = await updateUserRoleService(Number(req.params.id), req.body);

  return res.status(200).json(
    new ApiResponse({
      message: "User role updated successfully",
      data,
    })
  );
});

export const updateUserRoleStatus = asyncHandler(async (req, res) => {
  validateUpdateUserRoleStatus(req.body);

  const data = await updateUserRoleStatusService(
    Number(req.params.id),
    req.body.is_active
  );

  return res.status(200).json(
    new ApiResponse({
      message: "User role status updated successfully",
      data,
    })
  );
});