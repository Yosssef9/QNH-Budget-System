import express from "express";
import {
  approveCategoryPoLink,
  createCategoryPoLink,
  getAvailableCategoryPOs,
  getCategoryPoLinkById,
  getCategoryPoLinksForApproval,
  getCategoryPOSuggestions,
  getEligibleCategoryPoSubItems,
  getMyCategoryPoLinks,
  rejectCategoryPoLink,
} from "../controllers/categoryPoLinks.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get(
  "/available-pos",
  requirePermission("can_request_po_links"),
  getAvailableCategoryPOs,
);
router.get(
  "/eligible-sub-items",
  requirePermission("can_request_po_links"),
  getEligibleCategoryPoSubItems,
);
router.get(
  "/suggestions",
  requirePermission("can_request_po_links"),
  getCategoryPOSuggestions,
);
router.get("/my", requirePermission("can_request_po_links"), getMyCategoryPoLinks);
router.get(
  "/pending",
  requirePermission("can_approve_po_links"),
  getCategoryPoLinksForApproval,
);
router.get("/:poLinkId", getCategoryPoLinkById);
router.post("/", requirePermission("can_request_po_links"), createCategoryPoLink);
router.patch(
  "/:poLinkId/approve",
  requirePermission("can_approve_po_links"),
  approveCategoryPoLink,
);
router.patch(
  "/:poLinkId/reject",
  requirePermission("can_approve_po_links"),
  rejectCategoryPoLink,
);

export default router;
