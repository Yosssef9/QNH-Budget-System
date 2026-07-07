import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import {
  handleUploadError,
  packageSubItemAttachmentUpload,
} from "../../middleware/upload.middleware.js";
import { CATEGORY_PACKAGE_PERMISSIONS } from "./categoryPackages.constants.js";

import {
  createPackageSubItem,
  deletePackageSubItemAttachment,
  downloadPackageSubItemAttachment,
  getCategoryPackageDepartments,
  getCategoryPackageItemDetail,
  getCategoryPackageReadiness,
  getCurrentCategoryPackage,
  listPackageSubItemAttachments,
  removePackageSubItem,
  replaceDepartmentItemAllocations,
  submitCategoryPackageToCfo,
  uploadPackageSubItemAttachment,
  updatePackageSubItem,
} from "./categoryPackages.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get(
  "/current",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.VIEW),
  getCurrentCategoryPackage,
);

router.get(
  "/departments",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.VIEW),
  getCategoryPackageDepartments,
);

router.get(
  "/readiness",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.VIEW),
  getCategoryPackageReadiness,
);

router.get(
  "/items/:packageItemId",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.VIEW),
  getCategoryPackageItemDetail,
);

router.post(
  "/items/:packageItemId/sub-items",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS),
  createPackageSubItem,
);

router.patch(
  "/sub-items/:packageSubItemId",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS),
  updatePackageSubItem,
);

router.get(
  "/sub-items/:packageSubItemId/attachments",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.VIEW),
  listPackageSubItemAttachments,
);

router.post(
  "/sub-items/:packageSubItemId/attachments",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.MANAGE_ATTACHMENTS),
  packageSubItemAttachmentUpload,
  handleUploadError,
  uploadPackageSubItemAttachment,
);

router.get(
  "/sub-items/:packageSubItemId/attachments/:attachmentId/download",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.VIEW),
  downloadPackageSubItemAttachment,
);

router.delete(
  "/sub-items/:packageSubItemId/attachments/:attachmentId",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.MANAGE_ATTACHMENTS),
  deletePackageSubItemAttachment,
);

router.delete(
  "/sub-items/:packageSubItemId",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS),
  removePackageSubItem,
);

router.put(
  "/department-items/:departmentItemId/allocations",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS),
  replaceDepartmentItemAllocations,
);

router.patch(
  "/:packageId/submit-to-cfo",
  requireBudgetPermission(CATEGORY_PACKAGE_PERMISSIONS.SUBMIT_TO_CFO),
  submitCategoryPackageToCfo,
);

export default router;
