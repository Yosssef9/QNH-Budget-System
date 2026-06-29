import express from "express";
import {
  createReviewSubItem,
  deleteReviewSubItem,
  getDepartmentRequestItemsForReview,
  getCategoryReviewDetails,
  getCategoryReviews,
  returnDepartmentCategoryBudget,
  submitCategoryReviewPackageToCfo,
  updateApprovedQuantity,
  updateCategoryReviewStatus,
  updateDepartmentRequestItemReview,
  updateReviewSubItem,
} from "../controllers/categoryReviews.controller.js";
import {
  deleteReviewAttachment,
  deleteReviewSubItemAttachment,
  downloadReviewAttachment,
  downloadReviewSubItemAttachment,
  getReviewAttachments,
  getReviewSubItemAttachments,
  uploadReviewAttachment,
  uploadReviewSubItemAttachment,
} from "../controllers/categoryReviewAttachments.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { uploadCategoryReviewAttachment } from "../middleware/categoryReviewUpload.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get("/", getCategoryReviews);
router.patch("/packages/:packageId/submit-to-cfo", submitCategoryReviewPackageToCfo);
router.patch(
  "/department-request-items/:requestItemId/review",
  updateDepartmentRequestItemReview,
);
router.patch(
  "/department-category-budgets/:categoryBudgetId/return",
  returnDepartmentCategoryBudget,
);
router.patch("/:reviewId/approved-quantity", updateApprovedQuantity);
router.patch("/:reviewId/status", updateCategoryReviewStatus);
router.get(
  "/:reviewId/department-requests",
  getDepartmentRequestItemsForReview,
);
router.get("/:reviewId/attachments", getReviewAttachments);
router.post(
  "/:reviewId/attachments",
  uploadCategoryReviewAttachment,
  uploadReviewAttachment,
);
router.get(
  "/:reviewId/attachments/:attachmentId/download",
  downloadReviewAttachment,
);
router.delete("/:reviewId/attachments/:attachmentId", deleteReviewAttachment);
router.post("/:reviewId/sub-items", createReviewSubItem);
router.get("/:reviewId/sub-items/:lineId/attachments", getReviewSubItemAttachments);
router.post(
  "/:reviewId/sub-items/:lineId/attachments",
  uploadCategoryReviewAttachment,
  uploadReviewSubItemAttachment,
);
router.get(
  "/:reviewId/sub-items/:lineId/attachments/:attachmentId/download",
  downloadReviewSubItemAttachment,
);
router.delete(
  "/:reviewId/sub-items/:lineId/attachments/:attachmentId",
  deleteReviewSubItemAttachment,
);
router.patch("/:reviewId/sub-items/:lineId", updateReviewSubItem);
router.delete("/:reviewId/sub-items/:lineId", deleteReviewSubItem);
router.get("/:reviewId", getCategoryReviewDetails);

export default router;
