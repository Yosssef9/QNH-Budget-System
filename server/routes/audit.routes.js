import express from "express";
import {
  getAuditLogs,
  getAuditLogUsers,
} from "../controllers/audit.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);
router.use(requirePermission("can_manage_users"));
router.get("/users", getAuditLogUsers);
router.get("/", getAuditLogs);

export default router;
