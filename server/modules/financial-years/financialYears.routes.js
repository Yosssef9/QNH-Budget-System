import express from "express";
import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import {
  closeFinancialYear,
  createFinancialYear,
  getCurrentFinancialYear,
  getFinancialYears,
  getOpenFinancialYear,
  preCloseFinancialYear,
} from "./financialYears.controller.js";
import { FINANCIAL_YEAR_PERMISSION } from "./financialYears.constants.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get("/current", getCurrentFinancialYear);
router.get("/open", getOpenFinancialYear);

router.use(requireBudgetPermission(FINANCIAL_YEAR_PERMISSION));

router.get("/", getFinancialYears);
router.post("/", createFinancialYear);
router.patch("/:id/pre-close", preCloseFinancialYear);
router.patch("/:id/close", closeFinancialYear);

export default router;
