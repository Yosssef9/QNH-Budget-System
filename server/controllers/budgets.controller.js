import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { validateCreateBudget } from "../validators/budgets.validator.js";
import {
  createBudgetService,
  getMyBudgetsService,
  getCurrentBudgetService,
  submitBudgetService,
} from "../services/budgets.service.js";
import { getBudgetReviewFeedbackService } from "../services/budgetReviewFeedback.service.js";
export async function getCurrentBudget(req, res, next) {
  try {
    const result = await getCurrentBudgetService({
      user: req.user,
      budgetAccess: req.budgetAccess,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
export const getMyBudgets = asyncHandler(async (req, res) => {
  const budgets = await getMyBudgetsService(req.budgetAccess);

  return res.json(
    new ApiResponse({
      message: "Budgets fetched successfully",
      data: budgets,
    }),
  );
});

export const createBudget = asyncHandler(async (req, res) => {
  const body = validateCreateBudget(req.body);

  const result = await createBudgetService({
    body,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.status(result.alreadyExists ? 200 : 201).json(
    new ApiResponse({
      message: result.alreadyExists
        ? "Editable budget already exists"
        : "Budget draft created successfully",
      data: result,
    }),
  );
});

export const submitBudget = asyncHandler(async (req, res) => {
  const result = await submitBudgetService({
    budgetId: Number(req.params.budgetId),
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Budget submitted for approval successfully",
      data: result,
    }),
  );
});
export const getBudgetReviewFeedback = asyncHandler(async (req, res) => {
  const data = await getBudgetReviewFeedbackService({
    budgetId: Number(req.params.budgetId),
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Budget review feedback fetched successfully",
      data,
    }),
  );
});
