import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  createReviewSubItemService,
  deleteReviewSubItemService,
  getCategoryReviewDetailsService,
  getCategoryReviewListService,
  getDepartmentRequestItemsForReviewService,
  returnDepartmentCategoryBudgetService,
  submitCategoryReviewPackageToCfoService,
  updateApprovedQuantityService,
  updateCategoryReviewStatusService,
  updateDepartmentRequestItemReviewService,
  updateReviewSubItemService,
} from "../services/categoryReviews.service.js";
import {
  validateApprovedQuantityPayload,
  validateCategoryReviewId,
  validateCategoryReviewPackageId,
  validateCategoryReviewStatusPayload,
  validateDepartmentCategoryBudgetId,
  validateDepartmentRequestItemId,
  validateDepartmentRequestItemReviewPayload,
  validateReviewSubItemCreatePayload,
  validateReviewSubItemLineId,
  validateReviewSubItemUpdatePayload,
  validateReturnDepartmentCategoryBudgetPayload,
} from "../validators/categoryReviews.validator.js";

export const getCategoryReviews = asyncHandler(async (req, res) => {
  const data = await getCategoryReviewListService({
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category reviews fetched successfully",
      data,
    }),
  );
});

export const getCategoryReviewDetails = asyncHandler(async (req, res) => {
  const reviewId = validateCategoryReviewId(req.params.reviewId);
  const data = await getCategoryReviewDetailsService({
    reviewId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category review details fetched successfully",
      data,
    }),
  );
});

export const getDepartmentRequestItemsForReview = asyncHandler(
  async (req, res) => {
    const reviewId = validateCategoryReviewId(req.params.reviewId);
    const data = await getDepartmentRequestItemsForReviewService({
      reviewId,
      budgetAccess: req.budgetAccess,
    });

    return res.json(
      new ApiResponse({
        message: "Department request items fetched successfully",
        data,
      }),
    );
  },
);

export const updateDepartmentRequestItemReview = asyncHandler(
  async (req, res) => {
    const requestItemId = validateDepartmentRequestItemId(
      req.params.requestItemId,
    );
    const payload = validateDepartmentRequestItemReviewPayload(req.body);
    const data = await updateDepartmentRequestItemReviewService({
      requestItemId,
      payload,
      user: req.user,
      budgetAccess: req.budgetAccess,
    });

    return res.json(
      new ApiResponse({
        message: "Department request item review updated successfully",
        data,
      }),
    );
  },
);

export const returnDepartmentCategoryBudget = asyncHandler(async (req, res) => {
  const categoryBudgetId = validateDepartmentCategoryBudgetId(
    req.params.categoryBudgetId,
  );
  const payload = validateReturnDepartmentCategoryBudgetPayload(req.body);
  const data = await returnDepartmentCategoryBudgetService({
    categoryBudgetId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Department category budget returned successfully",
      data,
    }),
  );
});

export const updateApprovedQuantity = asyncHandler(async (req, res) => {
  const reviewId = validateCategoryReviewId(req.params.reviewId);
  const payload = validateApprovedQuantityPayload(req.body);
  const data = await updateApprovedQuantityService({
    reviewId,
    approvedQuantity: payload.approvedQuantity,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Approved quantity updated successfully",
      data,
    }),
  );
});

export const updateCategoryReviewStatus = asyncHandler(async (req, res) => {
  const reviewId = validateCategoryReviewId(req.params.reviewId);
  const payload = validateCategoryReviewStatusPayload(req.body);
  const data = await updateCategoryReviewStatusService({
    reviewId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category review status updated successfully",
      data,
    }),
  );
});

export const createReviewSubItem = asyncHandler(async (req, res) => {
  const reviewId = validateCategoryReviewId(req.params.reviewId);
  const payload = validateReviewSubItemCreatePayload(req.body);
  const data = await createReviewSubItemService({
    reviewId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Review sub-item added successfully",
      data,
    }),
  );
});

export const updateReviewSubItem = asyncHandler(async (req, res) => {
  const reviewId = validateCategoryReviewId(req.params.reviewId);
  const lineId = validateReviewSubItemLineId(req.params.lineId);
  const payload = validateReviewSubItemUpdatePayload(req.body);
  const data = await updateReviewSubItemService({
    reviewId,
    lineId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Review sub-item updated successfully",
      data,
    }),
  );
});

export const deleteReviewSubItem = asyncHandler(async (req, res) => {
  const reviewId = validateCategoryReviewId(req.params.reviewId);
  const lineId = validateReviewSubItemLineId(req.params.lineId);
  const data = await deleteReviewSubItemService({
    reviewId,
    lineId,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Review sub-item removed successfully",
      data,
    }),
  );
});

export const submitCategoryReviewPackageToCfo = asyncHandler(
  async (req, res) => {
    const packageId = validateCategoryReviewPackageId(req.params.packageId);
    const data = await submitCategoryReviewPackageToCfoService({
      packageId,
      user: req.user,
      budgetAccess: req.budgetAccess,
    });

    return res.json(
      new ApiResponse({
        message: "Category review package submitted to CFO successfully",
        data,
      }),
    );
  },
);
