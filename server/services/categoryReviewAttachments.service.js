import { ApiError } from "../utils/apiError.js";
import {
  deleteCategoryReviewAttachmentFile,
  getCategoryReviewAttachmentPath,
  saveCategoryReviewAttachmentFile,
} from "../utils/fileStorage.js";
import {
  findCategoryByCodeOrNameRepo,
  getCategoryReviewByIdRepo,
  getReviewSubItemByIdRepo,
} from "../repositories/categoryReviews.repository.js";
import {
  createReviewAttachmentRepo,
  createReviewSubItemAttachmentRepo,
  deactivateReviewAttachmentRepo,
  deactivateReviewSubItemAttachmentRepo,
  getReviewAttachmentByIdRepo,
  getReviewAttachmentsRepo,
  getReviewSubItemAttachmentByIdRepo,
  getReviewSubItemAttachmentsRepo,
} from "../repositories/categoryReviewAttachments.repository.js";

function normalizeCategoryCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "BIOMEDICAL") return "BIOMEDICAL";
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "IT") return "IT";

  return normalized;
}

async function resolveCategoryWorkspace(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type !== "CATEGORY_BUDGET_MANAGEMENT") {
    throw new ApiError(
      403,
      "Switch to a Category Budget Management Workspace to manage attachments",
      "INVALID_WORKSPACE",
    );
  }

  if (!activeWorkspace?.category) {
    throw new ApiError(
      403,
      "No category scope found for the active workspace",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  const category = await findCategoryByCodeOrNameRepo(
    normalizeCategoryCode(activeWorkspace.category),
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category scope was not found in budget categories",
      "CATEGORY_SCOPE_NOT_FOUND",
    );
  }

  return category;
}

function canReadAnyCategoryReview(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;
  return (
    activeWorkspace?.type === "CFO_REVIEW" &&
    activeWorkspace?.permissions?.can_approve_budget
  );
}

async function loadReviewForRead({ reviewId, budgetAccess }) {
  const review = await getCategoryReviewByIdRepo(reviewId);

  if (!review) {
    throw new ApiError(
      404,
      "Category review record not found",
      "CATEGORY_REVIEW_NOT_FOUND",
    );
  }

  if (canReadAnyCategoryReview(budgetAccess)) {
    return review;
  }

  const category = await resolveCategoryWorkspace(budgetAccess);

  if (Number(review.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot access attachments for this category review",
      "FORBIDDEN",
    );
  }

  return review;
}

async function loadReviewForWrite({ reviewId, budgetAccess }) {
  const category = await resolveCategoryWorkspace(budgetAccess);
  const review = await getCategoryReviewByIdRepo(reviewId);

  if (!review) {
    throw new ApiError(
      404,
      "Category review record not found",
      "CATEGORY_REVIEW_NOT_FOUND",
    );
  }

  if (Number(review.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot manage attachments for this category review",
      "FORBIDDEN",
    );
  }

  if (review.financial_year_status !== "OPEN") {
    throw new ApiError(
      409,
      "Attachments can only be modified while the financial year is open",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (review.category_review_status === "SUBMITTED_TO_CFO") {
    throw new ApiError(
      409,
      "Attachments cannot be modified after the review is submitted to CFO",
      "CATEGORY_REVIEW_SUBMITTED",
    );
  }

  return review;
}

async function loadLineForRead({ reviewId, lineId, budgetAccess }) {
  await loadReviewForRead({ reviewId, budgetAccess });
  const line = await getReviewSubItemByIdRepo(lineId);

  if (!line || Number(line.category_type_review_id) !== Number(reviewId)) {
    throw new ApiError(
      404,
      "Review sub-item line not found",
      "REVIEW_SUB_ITEM_NOT_FOUND",
    );
  }

  return line;
}

async function loadLineForWrite({ reviewId, lineId, budgetAccess }) {
  await loadReviewForWrite({ reviewId, budgetAccess });
  const line = await getReviewSubItemByIdRepo(lineId);

  if (!line || Number(line.category_type_review_id) !== Number(reviewId)) {
    throw new ApiError(
      404,
      "Review sub-item line not found",
      "REVIEW_SUB_ITEM_NOT_FOUND",
    );
  }

  return line;
}

export async function getReviewAttachmentsService({ reviewId, budgetAccess }) {
  await loadReviewForRead({ reviewId, budgetAccess });
  return getReviewAttachmentsRepo(reviewId);
}

export async function uploadReviewAttachmentService({
  reviewId,
  file,
  description,
  user,
  budgetAccess,
}) {
  await loadReviewForWrite({ reviewId, budgetAccess });

  const savedFile = await saveCategoryReviewAttachmentFile(file);

  try {
    return await createReviewAttachmentRepo({
      reviewId,
      originalFileName: file.originalname,
      storageKey: savedFile.storageKey,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      description,
      uploadedBy: user.userId,
    });
  } catch (error) {
    await deleteCategoryReviewAttachmentFile(savedFile.storageKey);
    throw error;
  }
}

export async function getReviewAttachmentDownloadService({
  reviewId,
  attachmentId,
  budgetAccess,
}) {
  await loadReviewForRead({ reviewId, budgetAccess });
  const attachment = await getReviewAttachmentByIdRepo({
    reviewId,
    attachmentId,
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  return {
    attachment,
    absolutePath: getCategoryReviewAttachmentPath(attachment.storage_key),
  };
}

export async function deleteReviewAttachmentService({
  reviewId,
  attachmentId,
  budgetAccess,
}) {
  await loadReviewForWrite({ reviewId, budgetAccess });
  const attachment = await deactivateReviewAttachmentRepo({
    reviewId,
    attachmentId,
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  return attachment;
}

export async function getReviewSubItemAttachmentsService({
  reviewId,
  lineId,
  budgetAccess,
}) {
  await loadLineForRead({ reviewId, lineId, budgetAccess });
  return getReviewSubItemAttachmentsRepo(lineId);
}

export async function uploadReviewSubItemAttachmentService({
  reviewId,
  lineId,
  file,
  description,
  user,
  budgetAccess,
}) {
  await loadLineForWrite({ reviewId, lineId, budgetAccess });

  const savedFile = await saveCategoryReviewAttachmentFile(file);

  try {
    return await createReviewSubItemAttachmentRepo({
      lineId,
      originalFileName: file.originalname,
      storageKey: savedFile.storageKey,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      description,
      uploadedBy: user.userId,
    });
  } catch (error) {
    await deleteCategoryReviewAttachmentFile(savedFile.storageKey);
    throw error;
  }
}

export async function getReviewSubItemAttachmentDownloadService({
  reviewId,
  lineId,
  attachmentId,
  budgetAccess,
}) {
  await loadLineForRead({ reviewId, lineId, budgetAccess });
  const attachment = await getReviewSubItemAttachmentByIdRepo({
    lineId,
    attachmentId,
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  return {
    attachment,
    absolutePath: getCategoryReviewAttachmentPath(attachment.storage_key),
  };
}

export async function deleteReviewSubItemAttachmentService({
  reviewId,
  lineId,
  attachmentId,
  budgetAccess,
}) {
  await loadLineForWrite({ reviewId, lineId, budgetAccess });
  const attachment = await deactivateReviewSubItemAttachmentRepo({
    lineId,
    attachmentId,
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  return attachment;
}
