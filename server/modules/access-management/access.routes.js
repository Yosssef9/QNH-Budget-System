import express from "express";
import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";
import {
  getBudgetAccessAssignments,
  createBudgetAccessAssignment,
  updateBudgetAccessAssignment,
  updateBudgetAccessAssignmentStatus,
  deleteBudgetAccessAssignment,
  getBudgetAccessAssignmentPermissionOverrides,
  replaceBudgetAccessAssignmentPermissionOverrides,
  getBudgetAccessUsers,
  getBudgetAccessDepartments,
  getBudgetAccessRoles,
} from "./access.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);
router.use(requireBudgetPermission(PERMISSION_CODES.MANAGE_BUDGET_ACCESS));

router.get("/assignments", getBudgetAccessAssignments);
router.post("/assignments", createBudgetAccessAssignment);
router.put("/assignments/:id", updateBudgetAccessAssignment);
router.patch("/assignments/:id/status", updateBudgetAccessAssignmentStatus);
router.delete("/assignments/:id", deleteBudgetAccessAssignment);
router.get(
  "/assignments/:id/permission-overrides",
  getBudgetAccessAssignmentPermissionOverrides,
);
router.put(
  "/assignments/:id/permission-overrides",
  replaceBudgetAccessAssignmentPermissionOverrides,
);

router.get("/users", getBudgetAccessUsers);
router.get("/departments", getBudgetAccessDepartments);
router.get("/roles", getBudgetAccessRoles);

export default router;
