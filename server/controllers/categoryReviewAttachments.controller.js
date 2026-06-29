import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  deleteReviewAttachmentService,
  deleteReviewSubItemAttachmentService,
  getReviewAttachmentDownloadService,
  getReviewAttachmentsService,
  getReviewSubItemAttachmentDownloadService,
  getReviewSubItemAttachmentsService,
  uploadReviewAttachmentService,
  uploadReviewSubItemAttachmentService,
} from "../services/categoryReviewAttachments.service.js";
import {
  validateAttachmentDescription,
  validateAttachmentId,
  validateLineId,
  validateReviewId,
} from "../validators/categoryReviewAttachments.validator.js";

export const getReviewAttachments = asyncHandler(async (req, res) => {
  const reviewId = validateReviewId(req.params.reviewId);
  const data = await getReviewAttachmentsService({
    reviewId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Review attachments fetched successfully",
      data,
    }),
  );
});

export const uploadReviewAttachment = asyncHandler(async (req, res) => {
  const reviewId = validateReviewId(req.params.reviewId);
  const description = validateAttachmentDescription(req.body);
  const data = await uploadReviewAttachmentService({
    reviewId,
    file: req.file,
    description,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Review attachment uploaded successfully",
      data,
    }),
  );
});

export const downloadReviewAttachment = asyncHandler(
  async (req, res, next) => {
    const reviewId = validateReviewId(req.params.reviewId);
    const attachmentId = validateAttachmentId(req.params.attachmentId);
    const { attachment, absolutePath } = await getReviewAttachmentDownloadService({
      reviewId,
      attachmentId,
      budgetAccess: req.budgetAccess,
    });

    return res.download(
      absolutePath,
      attachment.original_file_name,
      (error) => {
        if (error) next(error);
      },
    );
  },
);

export const deleteReviewAttachment = asyncHandler(async (req, res) => {
  const reviewId = validateReviewId(req.params.reviewId);
  const attachmentId = validateAttachmentId(req.params.attachmentId);
  const data = await deleteReviewAttachmentService({
    reviewId,
    attachmentId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Review attachment removed successfully",
      data,
    }),
  );
});

export const getReviewSubItemAttachments = asyncHandler(async (req, res) => {
  const reviewId = validateReviewId(req.params.reviewId);
  const lineId = validateLineId(req.params.lineId);
  const data = await getReviewSubItemAttachmentsService({
    reviewId,
    lineId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Review sub-item attachments fetched successfully",
      data,
    }),
  );
});

export const uploadReviewSubItemAttachment = asyncHandler(async (req, res) => {
  const reviewId = validateReviewId(req.params.reviewId);
  const lineId = validateLineId(req.params.lineId);
  const description = validateAttachmentDescription(req.body);
  const data = await uploadReviewSubItemAttachmentService({
    reviewId,
    lineId,
    file: req.file,
    description,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Review sub-item attachment uploaded successfully",
      data,
    }),
  );
});

export const downloadReviewSubItemAttachment = asyncHandler(
  async (req, res, next) => {
    const reviewId = validateReviewId(req.params.reviewId);
    const lineId = validateLineId(req.params.lineId);
    const attachmentId = validateAttachmentId(req.params.attachmentId);
    const { attachment, absolutePath } =
      await getReviewSubItemAttachmentDownloadService({
        reviewId,
        lineId,
        attachmentId,
        budgetAccess: req.budgetAccess,
      });

    return res.download(
      absolutePath,
      attachment.original_file_name,
      (error) => {
        if (error) next(error);
      },
    );
  },
);

export const deleteReviewSubItemAttachment = asyncHandler(async (req, res) => {
  const reviewId = validateReviewId(req.params.reviewId);
  const lineId = validateLineId(req.params.lineId);
  const attachmentId = validateAttachmentId(req.params.attachmentId);
  const data = await deleteReviewSubItemAttachmentService({
    reviewId,
    lineId,
    attachmentId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Review sub-item attachment removed successfully",
      data,
    }),
  );
});
