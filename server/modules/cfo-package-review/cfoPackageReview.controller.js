import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { auditLog } from "../../utils/audit.js";
import {
  completeCfoPackageReviewService,
  downloadCfoPackageSubItemAttachmentService,
  getCfoPackageItemDetailService,
  getCfoPackageService,
  listCfoPackageSubItemAttachmentsService,
  listCfoPackagesService,
  markAllCfoPackageItemsNeedModificationService,
  returnCfoPackageToCategoryManagerService,
  setCfoPackageItemDecisionService,
} from "./cfoPackageReview.service.js";
import {
  validateCfoDecisionPayload,
  validateCompletePackagePayload,
  validateMarkAllNeedsModificationPayload,
  validatePackageId,
  validatePackageItemId,
  validateReturnPackagePayload,
} from "./cfoPackageReview.validators.js";
import {
  validateAttachmentId,
  validatePackageSubItemId,
} from "../category-packages/categoryPackages.validators.js";

export const listCfoPackages = asyncHandler(async (req, res) => {
  const data = await listCfoPackagesService({
    budgetAccess: req.budgetAccess,
  });

  res.json(new ApiResponse({ message: "CFO packages fetched", data }));
});

export const getCfoPackage = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const data = await getCfoPackageService({
    packageId,
    budgetAccess: req.budgetAccess,
  });

  res.json(new ApiResponse({ message: "CFO package fetched", data }));
});

export const getCfoPackageItemDetail = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageItemId = validatePackageItemId(req.params.packageItemId);
  const data = await getCfoPackageItemDetailService({
    packageId,
    packageItemId,
    budgetAccess: req.budgetAccess,
  });

  res.json(new ApiResponse({ message: "CFO package item fetched", data }));
});

export const listCfoPackageSubItemAttachments = asyncHandler(
  async (req, res) => {
    const packageSubItemId = validatePackageSubItemId(
      req.params.packageSubItemId,
    );

    const data = await listCfoPackageSubItemAttachmentsService({
      packageSubItemId,
      budgetAccess: req.budgetAccess,
    });

    res.json(
      new ApiResponse({
        message: "CFO package sub-item attachments fetched",
        data,
      }),
    );
  },
);

export const downloadCfoPackageSubItemAttachment = asyncHandler(
  async (req, res, next) => {
    const packageSubItemId = validatePackageSubItemId(
      req.params.packageSubItemId,
    );
    const attachmentId = validateAttachmentId(req.params.attachmentId);

    const download = await downloadCfoPackageSubItemAttachmentService({
      packageSubItemId,
      attachmentId,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "DOWNLOAD_CFO_PACKAGE_SUB_ITEM_ATTACHMENT",
      entityType: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
      entityId: String(attachmentId),
      entityName: "Category Package Sub-Item Attachment",
      description: "Downloaded package sub-item attachment during CFO review",
      newValues: {
        packageSubItemId,
        fileName: download.fileName,
      },
    });

    res.setHeader("Content-Type", download.mimeType);
    res.setHeader("Content-Length", String(download.fileSizeBytes));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${download.fileName}"`,
    );
    download.stream.on("error", next);
    download.stream.pipe(res);
  },
);

export const setCfoPackageItemDecision = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageItemId = validatePackageItemId(req.params.packageItemId);
  const payload = validateCfoDecisionPayload(req.body);

  const data = await setCfoPackageItemDecisionService({
    packageId,
    packageItemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "SET_CFO_PACKAGE_ITEM_DECISION",
    entityType: "CATEGORY_BUDGET_PACKAGE_ITEM",
    entityId: String(packageItemId),
    entityName: "Category Budget Package Item",
    description: "Set CFO package item decision",
    newValues: payload,
  });

  res.json(new ApiResponse({ message: "CFO decision saved", data }));
});

export const markAllCfoPackageItemsNeedModification = asyncHandler(
  async (req, res) => {
    const packageId = validatePackageId(req.params.packageId);
    const payload = validateMarkAllNeedsModificationPayload(req.body);

    const data = await markAllCfoPackageItemsNeedModificationService({
      packageId,
      payload,
      actorUserId: req.user.userId,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "MARK_ALL_CFO_PACKAGE_ITEMS_NEED_MODIFICATION",
      entityType: "CATEGORY_BUDGET_PACKAGE",
      entityId: String(packageId),
      entityName: "Category Budget Package",
      description: "Marked all package items as needing modification",
      newValues: payload,
    });

    res.json(
      new ApiResponse({
        message: "All package items marked as needing modification",
        data,
      }),
    );
  },
);

export const returnCfoPackageToCategoryManager = asyncHandler(
  async (req, res) => {
    const packageId = validatePackageId(req.params.packageId);
    const payload = validateReturnPackagePayload(req.body);

    const data = await returnCfoPackageToCategoryManagerService({
      packageId,
      payload,
      actorUserId: req.user.userId,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "RETURN_CFO_PACKAGE_TO_CATEGORY_MANAGER",
      entityType: "CATEGORY_BUDGET_PACKAGE",
      entityId: String(packageId),
      entityName: "Category Budget Package",
      description: "Returned category package to Category Manager",
      newValues: payload,
    });

    res.json(
      new ApiResponse({
        message: "Package returned to Category Manager",
        data,
      }),
    );
  },
);

export const completeCfoPackageReview = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const payload = validateCompletePackagePayload(req.body);

  const data = await completeCfoPackageReviewService({
    packageId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "COMPLETE_CFO_PACKAGE_REVIEW",
    entityType: "CATEGORY_BUDGET_PACKAGE",
    entityId: String(packageId),
    entityName: "Category Budget Package",
    description: "Completed CFO package review",
    newValues: payload,
  });

  res.json(new ApiResponse({ message: "CFO package review completed", data }));
});
