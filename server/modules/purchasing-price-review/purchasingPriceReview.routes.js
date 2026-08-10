import express from "express";
import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { PURCHASING_PRICE_REVIEW_PERMISSIONS } from "./purchasingPriceReview.constants.js";
import {
  handleUploadError,
  packageSubItemAttachmentUpload,
} from "../../middleware/upload.middleware.js";
import {
  acceptAllPurchasingPrices,
  acceptPurchasingPrice,
  deletePurchasingAttachment,
  downloadPurchasingAttachment,
  getPurchasingPackage,
  getPurchasingPriceHistory,
  listPurchasingAttachments,
  listPurchasingFinancialYears,
  listPurchasingPackages,
  reopenPurchasingPrice,
  savePurchasingPrices,
  savePurchasingPrice,
  submitPurchasingPackageToCfo,
  uploadPurchasingAttachment,
} from "./purchasingPriceReview.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get(
  "/financial-years",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW),
  listPurchasingFinancialYears,
);
router.get(
  "/packages",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW),
  listPurchasingPackages,
);
router.get(
  "/packages/:packageId",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW),
  getPurchasingPackage,
);
router.patch(
  "/packages/:packageId/prices",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW),
  savePurchasingPrices,
);
router.patch(
  "/packages/:packageId/sub-items/:packageSubItemId/price",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW),
  savePurchasingPrice,
);
router.patch(
  "/packages/:packageId/sub-items/:packageSubItemId/reopen",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW),
  reopenPurchasingPrice,
);
router.get(
  "/packages/:packageId/sub-items/:packageSubItemId/history",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW),
  getPurchasingPriceHistory,
);
router.get(
  "/packages/:packageId/sub-items/:packageSubItemId/attachments",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW),
  listPurchasingAttachments,
);
router.post(
  "/packages/:packageId/sub-items/:packageSubItemId/attachments",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.MANAGE_ATTACHMENTS),
  packageSubItemAttachmentUpload,
  handleUploadError,
  uploadPurchasingAttachment,
);
router.get(
  "/packages/:packageId/sub-items/:packageSubItemId/attachments/:attachmentId/download",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW),
  downloadPurchasingAttachment,
);
router.delete(
  "/packages/:packageId/sub-items/:packageSubItemId/attachments/:attachmentId",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.MANAGE_ATTACHMENTS),
  deletePurchasingAttachment,
);
router.patch(
  "/packages/:packageId/sub-items/:packageSubItemId/accept",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW),
  acceptPurchasingPrice,
);
router.patch(
  "/packages/:packageId/accept-all",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW),
  acceptAllPurchasingPrices,
);
router.patch(
  "/packages/:packageId/submit-to-cfo",
  requireBudgetPermission(PURCHASING_PRICE_REVIEW_PERMISSIONS.SUBMIT),
  submitPurchasingPackageToCfo,
);

export default router;
