import express from "express";
import {
  approveCfoReviewPackage,
  getCfoReviewPackageDetails,
  getCfoReviewPackages,
  returnCfoReviewPackage,
  updateCfoReviewItemStatus,
} from "../controllers/cfoReviews.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);
router.use(requirePermission("can_approve_budget"));

router.get("/", getCfoReviewPackages);
router.get("/:packageId", getCfoReviewPackageDetails);
router.patch("/:packageId/items/:reviewId/status", updateCfoReviewItemStatus);
router.patch("/:packageId/approve", approveCfoReviewPackage);
router.patch("/:packageId/return", returnCfoReviewPackage);

export default router;
