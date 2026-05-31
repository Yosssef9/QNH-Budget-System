import express from "express";
import {
  getFinancialYears,
  getOpenFinancialYear,
  createFinancialYear,
  closeFinancialYear,
  preCloseFinancialYear,
  getCurrentFinancialYear,
} from "../controllers/financialYears.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_financial_years"),
  getFinancialYears,
);
router.get(
  "/current",
  verifyPortalJwt,
  verifyBudgetAccess,
  getCurrentFinancialYear,
);
router.get("/open", verifyPortalJwt, verifyBudgetAccess, getOpenFinancialYear);

router.post(
  "/",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_financial_years"),
  createFinancialYear,
);
router.patch(
  "/:id/pre-close",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_financial_years"),
  preCloseFinancialYear,
);
router.patch(
  "/:id/close",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_financial_years"),
  closeFinancialYear,
);

export default router;
