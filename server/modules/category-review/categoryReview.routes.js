import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { CATEGORY_REVIEW_PERMISSIONS } from "./categoryReview.constants.js";
import {
  closeCategorySubmissionWindow,
  completeDepartmentCategoryReview,
  decideCategoryReviewItem,
  getCategoryReviewBudget,
  getCategorySubmissionWindow,
  listCategoryReviewQueue,
  reopenCategorySubmissionWindow,
  reopenDepartmentCategoryReview,
} from "./categoryReview.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get(
  "/queue",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.VIEW),
  listCategoryReviewQueue,
);

router.get(
  "/submission-window",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.VIEW),
  getCategorySubmissionWindow,
);

router.patch(
  "/submission-window/close",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.CONTROL_WINDOW),
  closeCategorySubmissionWindow,
);

router.patch(
  "/submission-window/reopen",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.CONTROL_WINDOW),
  reopenCategorySubmissionWindow,
);

router.get(
  "/budgets/:departmentCategoryBudgetId",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.VIEW),
  getCategoryReviewBudget,
);

router.patch(
  "/items/:itemId/decision",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.REVIEW),
  decideCategoryReviewItem,
);

router.patch(
  "/budgets/:departmentCategoryBudgetId/complete",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.REVIEW),
  completeDepartmentCategoryReview,
);
router.patch(
  "/budgets/:departmentCategoryBudgetId/reopen",
  requireBudgetPermission(CATEGORY_REVIEW_PERMISSIONS.REVIEW),
  reopenDepartmentCategoryReview,
);
export default router;
