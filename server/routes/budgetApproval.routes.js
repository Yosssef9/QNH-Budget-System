import express from "express";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import {
  getPendingBudgets,
  getBudgetReview,
  getBudgetItemPriceIntelligence,
  getBudgetComparison,
  approveBudget,
  returnBudget,
  getApprovedBudgets,
} from "../controllers/budgetApproval.controller.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);
router.use(requirePermission("can_approve_budget"));

router.get("/pending", getPendingBudgets);
router.get("/comparison", getBudgetComparison);
router.get("/approved", getApprovedBudgets);
router.get(
  "/:budgetId/items/:budgetItemId/price-intelligence",
  getBudgetItemPriceIntelligence,
);
router.get("/:budgetId", getBudgetReview);
router.patch("/:budgetId/approve", approveBudget);
router.patch("/:budgetId/return", returnBudget);
export default router;
