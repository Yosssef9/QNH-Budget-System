import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  approveCfoReviewPackageService,
  getCfoReviewPackageDetailsService,
  getCfoReviewPackagesService,
  returnCfoReviewPackageService,
  updateCfoReviewItemStatusService,
} from "../services/cfoReviews.service.js";
import {
  validateCfoItemStatusPayload,
  validateCfoPackageReturnPayload,
  validateCfoReviewListQuery,
  validatePackageId,
  validateReviewId,
} from "../validators/cfoReviews.validator.js";

export const getCfoReviewPackages = asyncHandler(async (req, res) => {
  const query = validateCfoReviewListQuery(req.query);
  const data = await getCfoReviewPackagesService({
    ...query,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "CFO review packages fetched successfully",
      data,
    }),
  );
});

export const getCfoReviewPackageDetails = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const data = await getCfoReviewPackageDetailsService({
    packageId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "CFO review package details fetched successfully",
      data,
    }),
  );
});

export const updateCfoReviewItemStatus = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const reviewId = validateReviewId(req.params.reviewId);
  const payload = validateCfoItemStatusPayload(req.body);
  const data = await updateCfoReviewItemStatusService({
    packageId,
    reviewId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "CFO review item status updated successfully",
      data,
    }),
  );
});

export const approveCfoReviewPackage = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const data = await approveCfoReviewPackageService({
    packageId,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "CFO review package approved successfully",
      data,
    }),
  );
});

export const returnCfoReviewPackage = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const payload = validateCfoPackageReturnPayload(req.body);
  const data = await returnCfoReviewPackageService({
    packageId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "CFO review package returned successfully",
      data,
    }),
  );
});
