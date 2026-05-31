import express from "express";
import {
  approveItemRequest,
  createItemRequest,
  getItemRequests,
  rejectItemRequest,
  approveItemRequestManual,
  getDashboardItemRequests,
} from "../controllers/itemRequest.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);
router.get("/dashboard", getDashboardItemRequests);
router.get("/", requirePermission("can_manage_categories"), getItemRequests);

router.post("/", createItemRequest);

router.post(
  "/:requestId/approve",
  requirePermission("can_manage_categories"),
  approveItemRequest,
);

router.post(
  "/:requestId/reject",
  requirePermission("can_manage_categories"),
  rejectItemRequest,
);
router.post(
  "/:requestId/approve-manual",
  requirePermission("can_manage_categories"),
  approveItemRequestManual,
);
export default router;
