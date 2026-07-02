import express from "express";
import { createBudgetItem } from "../controllers/budgetItems.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

// Add item to budget
router.post(
  "/:budgetId/items",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_edit_budget"),
  createBudgetItem
);

export default router;
