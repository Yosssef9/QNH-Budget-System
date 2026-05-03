import express from "express";
import { startFinancialYear } from "../controllers/financialYears.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

// Start financial year
router.post(
  "/start",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_financial_years"),
  startFinancialYear
);

export default router;