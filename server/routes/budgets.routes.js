import express from "express";
import {
  createBudget,
  getMyBudgets,
  getCurrentBudget,
} from "../controllers/budgets.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { getBudgetItems } from "../controllers/budgetItems.controller.js";

const router = express.Router();

router.get(
  "/current",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_edit_budget"),
  getCurrentBudget,
);
// Create or return editable draft budget for department/year
router.post(
  "/",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_edit_budget"),
  createBudget,
);

// Get my budgets (HOD / Admin / Approver)
router.get("/my", verifyPortalJwt, verifyBudgetAccess, getMyBudgets);

router.get(
  "/:budgetId/items",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_view_budget"),
  getBudgetItems,
);

export default router;
