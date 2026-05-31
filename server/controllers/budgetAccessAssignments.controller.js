import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { auditLog } from "../utils/audit.js";
import {
  getBudgetAccessAssignmentsService,
  createBudgetAccessAssignmentService,
  updateBudgetAccessAssignmentService,
  updateBudgetAccessAssignmentStatusService,
} from "../services/budgetAccessAssignments.service.js";
import {
  validateCreateBudgetAccessAssignment,
  validateUpdateBudgetAccessAssignment,
  validateUpdateBudgetAccessAssignmentStatus,
} from "../validators/budgetAccessAssignments.validator.js";

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
    req.body,
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
