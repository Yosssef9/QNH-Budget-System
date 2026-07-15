import express from "express";
import { PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";
import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { getSystemHealthSummary } from "./systemHealth.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);
router.use(requireBudgetPermission(PERMISSION_CODES.VIEW_SYSTEM_HEALTH));

router.get("/summary", getSystemHealthSummary);

export default router;
