import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import {
  getCurrentDepartmentBudget,
  getApprovedBudgetHistory,
  getBudgetHistoryItems,
  getCategoryBudgetOverview,
  getAllDepartmentBudgets,
  getDepartmentBudgetById,
  getMyDepartmentBudgets,
  saveDepartmentCategoryItems,
  submitDepartmentCategoryBudget,
} from "./departmentBudgets.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get("/current", getCurrentDepartmentBudget);
router.get("/my", getMyDepartmentBudgets);
router.get("/all", getAllDepartmentBudgets);
router.get("/category-overview", getCategoryBudgetOverview);
router.get("/history/approved", getApprovedBudgetHistory);
router.get("/history/:departmentCategoryBudgetId/items", getBudgetHistoryItems);
router.put(
  "/categories/:departmentCategoryBudgetId/items",
  saveDepartmentCategoryItems,
);

router.patch(
  "/categories/:departmentCategoryBudgetId/submit",
  submitDepartmentCategoryBudget,
);

router.get("/:departmentBudgetId", getDepartmentBudgetById);

export default router;
