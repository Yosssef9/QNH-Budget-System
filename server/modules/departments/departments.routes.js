import express from "express";
import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import {
  createDepartment,
  listDepartments,
  updateDepartmentDescription,
  updateDepartmentStatus,
} from "./departments.controller.js";
import { DEPARTMENT_MANAGEMENT_PERMISSION } from "./departments.constants.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);
router.use(requireBudgetPermission(DEPARTMENT_MANAGEMENT_PERMISSION));

router.get("/", listDepartments);
router.post("/", createDepartment);
router.patch("/:departmentId/description", updateDepartmentDescription);
router.patch("/:departmentId/status", updateDepartmentStatus);

export default router;
