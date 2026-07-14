import express from "express";

import { PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";
import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { getBudgetAnalyticsOverview } from "./budgetAnalytics.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get(
  "/overview",
  requireBudgetPermission(PERMISSION_CODES.VIEW_BUDGET_REPORTS),
  getBudgetAnalyticsOverview,
);

export default router;
