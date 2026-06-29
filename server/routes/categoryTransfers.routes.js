import express from "express";
import {
  approveCategoryTransfer,
  createCategoryTransfer,
  getCategoryTransferDetails,
  getEligibleCategoryTransferItems,
  getMyCategoryTransfers,
  getPendingCategoryTransfersForCfo,
  rejectCategoryTransfer,
} from "../controllers/categoryTransfers.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get(
  "/eligible-items",
  requirePermission("can_request_transfer"),
  getEligibleCategoryTransferItems,
);
router.get("/my", requirePermission("can_request_transfer"), getMyCategoryTransfers);
router.get(
  "/pending",
  requirePermission("can_approve_transfer"),
  getPendingCategoryTransfersForCfo,
);
router.get("/:transferId", getCategoryTransferDetails);
router.post("/", requirePermission("can_request_transfer"), createCategoryTransfer);
router.patch(
  "/:transferId/approve",
  requirePermission("can_approve_transfer"),
  approveCategoryTransfer,
);
router.patch(
  "/:transferId/reject",
  requirePermission("can_approve_transfer"),
  rejectCategoryTransfer,
);

export default router;
