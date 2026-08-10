import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import {
  acceptAllPurchasingPricesService,
  acceptPurchasingPriceService,
  deletePurchasingAttachmentService,
  downloadPurchasingAttachmentService,
  getPurchasingPackageService,
  getPurchasingPriceHistoryService,
  listPurchasingAttachmentsService,
  listPurchasingFinancialYearsService,
  listPurchasingPackagesService,
  reopenPurchasingPriceService,
  savePurchasingPricesService,
  savePurchasingPriceService,
  submitPurchasingPackageToCfoService,
  uploadPurchasingAttachmentService,
} from "./purchasingPriceReview.service.js";
import {
  validateAcceptPricePayload,
  validateBulkPriceReviewPayload,
  validateFinancialYearId,
  validateOptionalStatus,
  validatePackageCommandPayload,
  validatePackageId,
  validatePackageSubItemId,
  validatePriceReviewPayload,
} from "./purchasingPriceReview.validators.js";
import {
  validateAttachmentId,
  validateDeleteAttachmentPayload,
  validateUploadAttachmentPayload,
} from "../category-packages/categoryPackages.validators.js";

function buildContentDisposition(fileName) {
  const fallback = String(fileName || "attachment")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(String(fileName || "attachment"));
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export const listPurchasingFinancialYears = asyncHandler(async (req, res) => {
  const data = await listPurchasingFinancialYearsService({
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Purchasing financial years fetched successfully", data }));
});

export const listPurchasingPackages = asyncHandler(async (req, res) => {
  const financialYearId = req.query.financialYearId
    ? validateFinancialYearId(req.query.financialYearId)
    : null;
  const status = validateOptionalStatus(req.query.priceStatus);
  const data = await listPurchasingPackagesService({
    financialYearId,
    status,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Purchasing packages fetched successfully", data }));
});

export const getPurchasingPackage = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const data = await getPurchasingPackageService({
    packageId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Purchasing package fetched successfully", data }));
});

export const savePurchasingPrice = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const payload = validatePriceReviewPayload(req.body);
  const data = await savePurchasingPriceService({
    packageId,
    packageSubItemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "SAVE_PURCHASING_PACKAGE_SUB_ITEM_PRICE",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM",
    entityId: String(packageSubItemId),
    description: "Saved Purchasing package sub-item price",
    newValues: { purchasingUnitPrice: payload.purchasing_unit_price },
  });
  res.json(new ApiResponse({ message: "Purchasing price saved successfully", data }));
});

export const savePurchasingPrices = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const payload = validateBulkPriceReviewPayload(req.body);
  const data = await savePurchasingPricesService({
    packageId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "SAVE_PURCHASING_PACKAGE_PRICES",
    entityType: "CATEGORY_BUDGET_PACKAGE",
    entityId: String(packageId),
    description: "Saved changed Purchasing package prices",
    newValues: { changedPriceCount: payload.prices.length },
  });
  res.json(new ApiResponse({ message: "Purchasing prices saved successfully", data }));
});

export const reopenPurchasingPrice = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const payload = validateAcceptPricePayload(req.body);
  const data = await reopenPurchasingPriceService({
    packageId,
    packageSubItemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "REOPEN_PURCHASING_PACKAGE_SUB_ITEM_PRICE",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM",
    entityId: String(packageSubItemId),
    description: "Reopened an accepted Purchasing price",
  });
  res.json(new ApiResponse({ message: "Purchasing price reopened successfully", data }));
});

export const getPurchasingPriceHistory = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const data = await getPurchasingPriceHistoryService({
    packageId,
    packageSubItemId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Purchasing price history fetched successfully", data }));
});

export const listPurchasingAttachments = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const data = await listPurchasingAttachmentsService({
    packageId,
    packageSubItemId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Purchasing attachments fetched successfully", data }));
});

export const uploadPurchasingAttachment = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const payload = validateUploadAttachmentPayload(req.body);
  const data = await uploadPurchasingAttachmentService({
    packageId,
    packageSubItemId,
    file: req.file,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "UPLOAD_PURCHASING_SUPPORTING_DOCUMENT",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
    entityId: String(data.id),
    description: "Uploaded Purchasing supporting document",
  });
  res.status(201).json(new ApiResponse({ message: "Purchasing attachment uploaded successfully", data }));
});

export const downloadPurchasingAttachment = asyncHandler(async (req, res, next) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const attachmentId = validateAttachmentId(req.params.attachmentId);
  const download = await downloadPurchasingAttachmentService({
    packageId,
    packageSubItemId,
    attachmentId,
    budgetAccess: req.budgetAccess,
  });
  res.setHeader("Content-Type", download.mimeType);
  res.setHeader("Content-Length", String(download.fileSizeBytes));
  res.setHeader("Content-Disposition", buildContentDisposition(download.fileName));
  download.stream.on("error", next);
  download.stream.pipe(res);
});

export const deletePurchasingAttachment = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const attachmentId = validateAttachmentId(req.params.attachmentId);
  const payload = validateDeleteAttachmentPayload(req.body);
  const data = await deletePurchasingAttachmentService({
    packageId,
    packageSubItemId,
    attachmentId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "REMOVE_PURCHASING_SUPPORTING_DOCUMENT",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
    entityId: String(attachmentId),
    description: "Removed Purchasing supporting document",
  });
  res.json(new ApiResponse({ message: "Purchasing attachment removed successfully", data }));
});

export const acceptPurchasingPrice = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const packageSubItemId = validatePackageSubItemId(req.params.packageSubItemId);
  const payload = validateAcceptPricePayload(req.body);
  const data = await acceptPurchasingPriceService({
    packageId,
    packageSubItemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "ACCEPT_PURCHASING_PACKAGE_SUB_ITEM_PRICE",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM",
    entityId: String(packageSubItemId),
    description: "Accepted Purchasing package sub-item price",
  });
  res.json(new ApiResponse({ message: "Purchasing price accepted successfully", data }));
});

export const acceptAllPurchasingPrices = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const payload = validatePackageCommandPayload(req.body);
  const data = await acceptAllPurchasingPricesService({
    packageId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "ACCEPT_ALL_PURCHASING_PACKAGE_PRICES",
    entityType: "CATEGORY_BUDGET_PACKAGE",
    entityId: String(packageId),
    description: "Accepted all pending Purchasing prices",
  });
  res.json(new ApiResponse({ message: "All Purchasing prices accepted successfully", data }));
});

export const submitPurchasingPackageToCfo = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const payload = validatePackageCommandPayload(req.body);
  const data = await submitPurchasingPackageToCfoService({
    packageId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  await auditLog(req, {
    action: "SUBMIT_PRICED_CATEGORY_PACKAGE_TO_CFO",
    entityType: "CATEGORY_BUDGET_PACKAGE",
    entityId: String(packageId),
    description: "Submitted Purchasing-reviewed category package to CFO",
  });
  res.json(new ApiResponse({ message: "Priced package submitted to CFO successfully", data }));
});
