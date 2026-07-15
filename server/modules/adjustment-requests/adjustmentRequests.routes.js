import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { ADJUSTMENT_REQUEST_PERMISSIONS } from "./adjustmentRequests.constants.js";
import {
  approveAdjustmentRequest,
  createAdjustmentRequest,
  getAdjustmentRequestOptions,
  listCategoryAdjustmentRequests,
  listMyAdjustmentRequests,
  rejectAdjustmentRequest,
} from "./adjustmentRequests.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get(
  "/my",
  requireBudgetPermission(ADJUSTMENT_REQUEST_PERMISSIONS.SUBMIT),
  listMyAdjustmentRequests,
);

router.get(
  "/category",
  requireBudgetPermission(ADJUSTMENT_REQUEST_PERMISSIONS.REVIEW),
  listCategoryAdjustmentRequests,
);

router.get(
  "/department-category-budgets/:departmentCategoryBudgetId/options",
  requireBudgetPermission(ADJUSTMENT_REQUEST_PERMISSIONS.SUBMIT),
  getAdjustmentRequestOptions,
);

router.post(
  "/department-category-budgets/:departmentCategoryBudgetId",
  requireBudgetPermission(ADJUSTMENT_REQUEST_PERMISSIONS.SUBMIT),
  createAdjustmentRequest,
);

router.patch(
  "/:requestId/approve",
  requireBudgetPermission(ADJUSTMENT_REQUEST_PERMISSIONS.REVIEW),
  approveAdjustmentRequest,
);

router.patch(
  "/:requestId/reject",
  requireBudgetPermission(ADJUSTMENT_REQUEST_PERMISSIONS.REVIEW),
  rejectAdjustmentRequest,
);

export default router;
