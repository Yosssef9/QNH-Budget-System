import express from "express";

import {
  getAvailablePOs,
  getMyPOLinks,
  getPODashboard,
  getPOBudgetItems,
  getPOSuggestions,
  getPOLinksForApproval,
  createPOLink,
  approvePOLink,
  rejectPOLink,
  getPOLinkById,
  getPOTransparency,
} from "../controllers/po.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get(
  "/available-pos",
  requirePermission("can_request_po_links"),
  getAvailablePOs,
);

router.get("/dashboard", getPODashboard);

router.get(
  "/budget-items",
  requirePermission("can_request_po_links"),
  getPOBudgetItems,
);

router.get(
  "/suggestions",
  requirePermission("can_request_po_links"),
  getPOSuggestions,
);

router.get(
  "/",
  requirePermission("can_approve_po_links"),
  getPOLinksForApproval,
);

router.get("/my", requirePermission("can_request_po_links"), getMyPOLinks);

router.get(
  "/pending",
  requirePermission("can_approve_po_links"),
  getPOLinksForApproval,
);

router.post("/", requirePermission("can_request_po_links"), createPOLink);
router.get(
  "/po/:id/transparency",
  requirePermission("can_view_po_links"),
  getPOTransparency,
);
router.get("/:id", requirePermission("can_view_po_links"), getPOLinkById);
router.post(
  "/:id/approve",
  requirePermission("can_approve_po_links"),
  approvePOLink,
);

router.post(
  "/:id/reject",
  requirePermission("can_approve_po_links"),
  rejectPOLink,
);

export default router;
