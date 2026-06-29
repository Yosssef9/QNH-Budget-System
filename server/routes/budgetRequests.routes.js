import express from "express";
import {
  createRequestItem,
  deleteRequestItem,
  getCategoryBudgetItems,
  getCurrentBudgetRequest,
  submitCategoryBudget,
  updateRequestItem,
} from "../controllers/budgetRequests.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get(
  "/current",
  requirePermission("can_view_budget"),
  getCurrentBudgetRequest,
);

router.get(
  "/categories/:categoryBudgetId/items",
  requirePermission("can_view_budget"),
  getCategoryBudgetItems,
);

router.post(
  "/categories/:categoryBudgetId/items",
  requirePermission("can_edit_budget"),
  createRequestItem,
);

router.patch(
  "/items/:requestItemId",
  requirePermission("can_edit_budget"),
  updateRequestItem,
);

router.delete(
  "/items/:requestItemId",
  requirePermission("can_edit_budget"),
  deleteRequestItem,
);

router.patch(
  "/categories/:categoryBudgetId/submit",
  requirePermission("can_edit_budget"),
  submitCategoryBudget,
);

export default router;

