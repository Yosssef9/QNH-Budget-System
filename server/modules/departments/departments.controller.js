import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import {
  createDepartmentService,
  listDepartmentsService,
  updateDepartmentDescriptionService,
  updateDepartmentStatusService,
} from "./departments.service.js";
import {
  validateCreateDepartment,
  validateDepartmentId,
  validateDepartmentListQuery,
  validateUpdateDepartmentDescription,
  validateUpdateDepartmentStatus,
} from "./departments.validators.js";

export const listDepartments = asyncHandler(async (req, res) => {
  const data = await listDepartmentsService(validateDepartmentListQuery(req.query));

  res.json(
    new ApiResponse({
      message: "Departments fetched successfully",
      data,
    }),
  );
});

export const createDepartment = asyncHandler(async (req, res) => {
  const data = await createDepartmentService({
    payload: validateCreateDepartment(req.body),
    actorUserId: req.user.userId,
  });

  await auditLog(req, {
    action: "CREATE_DEPARTMENT",
    entityType: "DEPARTMENT",
    entityId: String(data.id),
    entityName: data.name,
    description: `Created department "${data.name}"`,
    newValues: data,
  });

  res.status(201).json(
    new ApiResponse({
      message: "Department created successfully",
      data,
    }),
  );
});

export const updateDepartmentDescription = asyncHandler(async (req, res) => {
  const departmentId = validateDepartmentId(req.params.departmentId);
  const payload = validateUpdateDepartmentDescription(req.body);
  const data = await updateDepartmentDescriptionService({
    departmentId,
    description: payload.description,
    actorUserId: req.user.userId,
  });

  await auditLog(req, {
    action: "UPDATE_DEPARTMENT",
    entityType: "DEPARTMENT",
    entityId: String(data.id),
    entityName: data.name,
    description: `Updated department "${data.name}"`,
    newValues: data,
  });

  res.json(
    new ApiResponse({
      message: "Department updated successfully",
      data,
    }),
  );
});

export const updateDepartmentStatus = asyncHandler(async (req, res) => {
  const departmentId = validateDepartmentId(req.params.departmentId);
  const payload = validateUpdateDepartmentStatus(req.body);
  const data = await updateDepartmentStatusService({
    departmentId,
    isActive: payload.is_active,
    actorUserId: req.user.userId,
  });

  await auditLog(req, {
    action: "UPDATE_DEPARTMENT_STATUS",
    entityType: "DEPARTMENT",
    entityId: String(data.id),
    entityName: data.name,
    description: `${data.is_active ? "Activated" : "Deactivated"} department "${data.name}"`,
    newValues: data,
  });

  res.json(
    new ApiResponse({
      message: `Department ${data.is_active ? "activated" : "deactivated"} successfully`,
      data,
    }),
  );
});
