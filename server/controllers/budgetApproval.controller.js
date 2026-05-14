import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

import {
  getPendingBudgetsService,
  getBudgetReviewService,
  approveBudgetService,
  returnBudgetService,
  getBudgetComparisonService,
} from "../services/budgetApproval.service.js";

export const getPendingBudgets = asyncHandler(async (req, res) => {
  const data = await getPendingBudgetsService();

  res.json(
    new ApiResponse({
      message: "Pending budgets fetched successfully",
      data,
    }),
  );
});

export const getBudgetReview = asyncHandler(async (req, res) => {
  const data = await getBudgetReviewService(Number(req.params.budgetId));

  res.json(
    new ApiResponse({
      message: "Budget review fetched successfully",
      data,
    }),
  );
});

export const approveBudget = asyncHandler(async (req, res) => {
  const data = await approveBudgetService({
    budgetId: Number(req.params.budgetId),
    body: req.body,
    user: req.user,
  });

  res.json(
    new ApiResponse({
      message: "Budget approved successfully",
      data,
    }),
  );
});

export const returnBudget = asyncHandler(async (req, res) => {
  const data = await returnBudgetService({
    budgetId: Number(req.params.budgetId),
    body: req.body,
    user: req.user,
  });

  res.json(
    new ApiResponse({
      message: "Budget returned successfully",
      data,
    }),
  );
});


export const getBudgetComparison = asyncHandler(async (req, res) => {
  const data = await getBudgetComparisonService();

  res.json(
    new ApiResponse({
      message: "Budget comparison fetched successfully",
      data,
    }),
  );
});