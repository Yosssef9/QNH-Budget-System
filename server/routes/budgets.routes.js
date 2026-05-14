import express from "express";
import {
  createBudget,
  getMyBudgets,
  getCurrentBudget,
  submitBudget,
  getBudgetReviewFeedback,
} from "../controllers/budgets.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import {
  getBudgetItems,
  deleteBudgetItem,
  replaceBudgetItems,
} from "../controllers/budgetItems.controller.js";
const router = express.Router();

// ✅ Apply common middleware ONCE
router.use(verifyPortalJwt, verifyBudgetAccess);

// ---------------- ROUTES ----------------
router.get("/current", requirePermission("can_edit_budget"), getCurrentBudget);

router.post("/", requirePermission("can_edit_budget"), createBudget);

router.get("/my", getMyBudgets);

router.get(
  "/:budgetId/review-feedback",
  requirePermission("can_view_budget"),
  getBudgetReviewFeedback,
);
router.get(
  "/:budgetId/review-feedback",
  requirePermission("can_view_budget"),
  getBudgetReviewFeedback,
);

router.get(
  "/:budgetId/items",
  requirePermission("can_view_budget"),
  getBudgetItems,
);

router.delete(
  "/:budgetId/items/:itemId",
  requirePermission("can_edit_budget"),
  deleteBudgetItem,
);

router.put(
  "/:budgetId/items",
  requirePermission("can_edit_budget"),
  replaceBudgetItems,
);

router.patch(
  "/:budgetId/submit",
  requirePermission("can_edit_budget"),
  submitBudget,
);
export default router;
