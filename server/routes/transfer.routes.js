import express from "express";

import {
  createTransfer,
  getTransfers,
  approveTransfer,
  rejectTransfer,
  getTransferById,
  getTransferItems,
  getMyTransfers,
  getTransferDashboard,
} from "../controllers/transfer.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get("/", requirePermission("can_approve_transfer"), getTransfers);

router.get(
  "/items",
  requirePermission("can_request_transfer"),
  getTransferItems,
);
router.get("/dashboard", getTransferDashboard);

router.get("/my", requirePermission("can_request_transfer"), getMyTransfers);

router.get("/:id", getTransferById);

router.post("/", requirePermission("can_request_transfer"), createTransfer);

router.post(
  "/:id/approve",
  requirePermission("can_approve_transfer"),
  approveTransfer,
);

router.post(
  "/:id/reject",
  requirePermission("can_approve_transfer"),
  rejectTransfer,
);
export default router;
