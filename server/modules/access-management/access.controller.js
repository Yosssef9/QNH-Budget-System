import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { auditLog } from "../../utils/audit.js";
import {
  getBudgetAccessAssignmentsService,
  createBudgetAccessAssignmentService,
  updateBudgetAccessAssignmentService,
  updateBudgetAccessAssignmentStatusService,
  deleteBudgetAccessAssignmentService,
  getAssignmentPermissionOverridesService,
  replaceAssignmentPermissionOverridesService,
  getBudgetAccessUsersService,
  getBudgetAccessDepartmentsService,
  getBudgetRolesService,
} from "./access.service.js";
import {
  validateCreateBudgetAccessAssignment,
  validateUpdateBudgetAccessAssignment,
  validateUpdateBudgetAccessAssignmentStatus,
  validateBudgetAccessAssignmentId,
  validateReplacePermissionOverrides,
} from "./access.validators.js";

export const getBudgetAccessAssignments = asyncHandler(async (req, res) => {
  const data = await getBudgetAccessAssignmentsService();

  return res.status(200).json(
    new ApiResponse({
      message: "User roles fetched successfully",
      data,
    }),
  );
});

export const createBudgetAccessAssignment = asyncHandler(async (req, res) => {
  validateCreateBudgetAccessAssignment(req.body);
  const data = await createBudgetAccessAssignmentService({
    ...req.body,
    created_by: req.user.userId,
  });

  await auditLog(req, {
    action: "UPDATE_USER_ACCESS",
    entityName:
      data.user_name ||
      data.userName ||
      `Access Assignment #${data.id || req.params.id}`,
    entityType: "USER_ACCESS",
    entityId: String(data.id),
    description: `Granted ${data.role_name} access to ${data.user_name}`,
    newValues: data,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Budget access assignment created successfully",
      data,
    }),
  );
});

export const updateBudgetAccessAssignment = asyncHandler(async (req, res) => {
  validateUpdateBudgetAccessAssignment(req.body);

  const data = await updateBudgetAccessAssignmentService(
    Number(req.params.id),
    {
      ...req.body,
      updated_by: req.user.userId,
    },
  );

  await auditLog(req, {
    action: "UPDATE_USER_ACCESS",
    entityName:
      data.user_name ||
      data.userName ||
      `Access Assignment #${data.id || req.params.id}`,
    entityType: "USER_ACCESS",
    entityId: String(req.params.id),
    description: `Updated permissions for ${data.user_name}`,
    newValues: data,
  });

  return res.status(200).json(
    new ApiResponse({
      message: "User role updated successfully",
      data,
    }),
  );
});

export const updateBudgetAccessAssignmentStatus = asyncHandler(
  async (req, res) => {
    validateUpdateBudgetAccessAssignmentStatus(req.body);

    const data = await updateBudgetAccessAssignmentStatusService(
      Number(req.params.id),
      req.body.is_active,
      req.user.userId,
    );

    await auditLog(req, {
      action: "UPDATE_USER_ACCESS",
      entityName:
        data.user_name ||
        data.userName ||
        `Access Assignment #${data.id || req.params.id}`,
      entityType: "USER_ACCESS",
      entityId: String(req.params.id),
      description: `${data.user_name} access was ${
        data.is_active ? "activated" : "deactivated"
      }`,
      newValues: data,
    });

    return res.status(200).json(
      new ApiResponse({
        message: "User role status updated successfully",
        data,
      }),
    );
  },
);

export const deleteBudgetAccessAssignment = asyncHandler(async (req, res) => {
  const id = validateBudgetAccessAssignmentId(req.params.id);
  const data = await deleteBudgetAccessAssignmentService(id);

  await auditLog(req, {
    action: "DELETE_USER_ACCESS",
    entityName:
      data.user_name ||
      data.userName ||
      `Access Assignment #${data.id || id}`,
    entityType: "USER_ACCESS",
    entityId: String(id),
    description: `Permanently deleted user access assignment #${id}`,
    oldValues: data,
  });

  return res.status(200).json(
    new ApiResponse({
      message: "Budget access assignment deleted successfully",
      data,
    }),
  );
});

export const getBudgetAccessAssignmentPermissionOverrides = asyncHandler(
  async (req, res) => {
    const id = validateBudgetAccessAssignmentId(req.params.id);
    const data = await getAssignmentPermissionOverridesService(id);

    return res.status(200).json(
      new ApiResponse({
        message: "Permission overrides fetched successfully",
        data,
      }),
    );
  },
);

export const replaceBudgetAccessAssignmentPermissionOverrides = asyncHandler(
  async (req, res) => {
    const id = validateBudgetAccessAssignmentId(req.params.id);
    validateReplacePermissionOverrides(req.body);

    const data = await replaceAssignmentPermissionOverridesService(id, {
      overrides: req.body.overrides,
      updated_by: req.user.userId,
    });

    await auditLog(req, {
      action: "UPDATE_USER_ACCESS_PERMISSION_OVERRIDES",
      entityName:
        data.assignment?.user_name ||
        data.assignment?.userName ||
        `Access Assignment #${id}`,
      entityType: "USER_ACCESS",
      entityId: String(id),
      description: `Updated permission overrides for access assignment #${id}`,
      oldValues: data.before,
      newValues: data.after,
    });

    return res.status(200).json(
      new ApiResponse({
        message: "Permission overrides updated successfully",
        data: data.after,
      }),
    );
  },
);

export const getBudgetAccessUsers = asyncHandler(async (req, res) => {
  const data = await getBudgetAccessUsersService(req.query);

  return res.status(200).json(
    new ApiResponse({
      message: "Users fetched successfully",
      data,
    }),
  );
});

export const getBudgetAccessDepartments = asyncHandler(async (req, res) => {
  const data = await getBudgetAccessDepartmentsService();

  return res.status(200).json(
    new ApiResponse({
      message: "Departments fetched successfully",
      data,
    }),
  );
});

export const getBudgetAccessRoles = asyncHandler(async (req, res) => {
  const data = await getBudgetRolesService();

  return res.status(200).json(
    new ApiResponse({
      message: "Budget roles fetched successfully",
      data,
    }),
  );
});
