import express from "express";

import {
  getAuditLogs,
  getAuditLogUsers,
} from "../controllers/audit.controller.js";

import { verifyPortalJwt } from "../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../shared/middleware/requireBudgetPermission.js";
import { PERMISSION_CODES } from "../../shared/permissions/permissionCodes.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);
router.use(
  requireBudgetPermission(
    PERMISSION_CODES.VIEW_AUDIT_LOGS,
  ),
);

router.get("/users", getAuditLogUsers);
router.get("/", getAuditLogs);

export default router;