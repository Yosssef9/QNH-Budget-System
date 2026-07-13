import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { CFO_PACKAGE_REVIEW_PERMISSIONS } from "./cfoPackageReview.constants.js";
import {
  completeCfoPackageReview,
  downloadCfoPackageSubItemAttachment,
  finalizeAnnualCfoPackageReview,
  getCfoPackage,
  getCfoPackageItemDetail,
  listCfoPackageSubItemAttachments,
  listCfoFinancialYears,
  listCfoPackages,
  markAllCfoPackageItemsNeedModification,
  reopenCfoPackageReview,
  returnCfoPackageToCategoryManager,
  setCfoPackageItemDecision,
} from "./cfoPackageReview.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get(
  "/financial-years",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW),
  listCfoFinancialYears,
);

router.get(
  "/packages",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW),
  listCfoPackages,
);

router.get(
  "/packages/:packageId",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW),
  getCfoPackage,
);

router.get(
  "/packages/:packageId/items/:packageItemId",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW),
  getCfoPackageItemDetail,
);

router.get(
  "/sub-items/:packageSubItemId/attachments",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW),
  listCfoPackageSubItemAttachments,
);

router.get(
  "/sub-items/:packageSubItemId/attachments/:attachmentId/download",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW),
  downloadCfoPackageSubItemAttachment,
);

router.patch(
  "/packages/:packageId/items/:packageItemId/decision",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE),
  setCfoPackageItemDecision,
);

router.patch(
  "/packages/:packageId/items/needs-modification",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE),
  markAllCfoPackageItemsNeedModification,
);

router.patch(
  "/packages/:packageId/return",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE),
  returnCfoPackageToCategoryManager,
);

router.patch(
  "/packages/:packageId/complete",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE),
  completeCfoPackageReview,
);

router.patch(
  "/packages/:packageId/reopen",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE),
  reopenCfoPackageReview,
);

router.patch(
  "/financial-years/:financialYearId/finalize",
  requireBudgetPermission(CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE),
  finalizeAnnualCfoPackageReview,
);

export default router;
