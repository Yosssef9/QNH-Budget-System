import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  validateBudgetItemId,
  validateCreateBudget,
} from "../validators/budgets.validator.js";
import {
  createBudgetService,
  getMyBudgetsService,
  getCurrentBudgetService,
  submitBudgetService,
  getBudgetDetailsService,
  getBudgetHistoryItemsService,
  getApprovedBudgetHistoryService,
} from "../services/budgets.service.js";
import { getBudgetReviewFeedbackService } from "../services/budgetReviewFeedback.service.js";
import { getBudgetTimelineService } from "../services/budgetTimeline.service.js";
import { auditLog } from "../utils/audit.js";
import {
  getBudgetBalanceSummaryService,
  getBudgetItemPOLinksService,
} from "../services/budgetBalance.service.js";

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
export const getApprovedBudgetHistory = asyncHandler(async (req, res) => {
  const data = await getApprovedBudgetHistoryService(req.budgetAccess);

  return res.json(
    new ApiResponse({
      message: "Budget history fetched successfully",
      data,
    }),
  );
});

export const getBudgetHistoryItems = asyncHandler(async (req, res) => {
  const data = await getBudgetHistoryItemsService(
    Number(req.params.budgetId),
    req.budgetAccess,
  );

  return res.json(
    new ApiResponse({
      message: "Budget history items fetched successfully",
      data,
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
  if (!result.alreadyExists) {
    await auditLog(req, {
      action: "CREATE_BUDGET",
      entityName: `${req.budgetAccess?.department?.name || "Department"} Budget`,
      entityType: "BUDGET",
      entityId: String(result.budget.id),
      description: `Created ${
        req.budgetAccess?.department?.name || "Department"
      } budget for FY ${result.financialYear.year}`,
      newValues: {
        status: "DRAFT",
        financialYear: result.financialYear?.year,
      },
    });
  }
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
  await auditLog(req, {
    action: "SUBMIT_BUDGET",
    entityName: `${req.budgetAccess?.department?.name || "Department"} Budget`,
    entityType: "BUDGET",
    entityId: String(req.params.budgetId),
    description: `Submitted ${
      req.budgetAccess?.department?.name || "Department"
    } budget for approval`,
    newValues: {
      status: "PENDING_APPROVAL",
    },
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
export const getBudgetTimeline = asyncHandler(async (req, res) => {
  const budgetId = Number(req.params.budgetId);

  const timeline = await getBudgetTimelineService(budgetId);

  return res.json(
    new ApiResponse({
      message: "Budget timeline fetched successfully",
      data: timeline,
    }),
  );
});
export const getBudgetDetails = asyncHandler(async (req, res) => {
  const data = await getBudgetDetailsService(Number(req.params.budgetId));

  res.json(
    new ApiResponse({
      message: "Budget fetched successfully",
      data,
    }),
  );
});
export async function getBudgetBalanceSummary(req, res) {
  const result = await getBudgetBalanceSummaryService(
    Number(req.params.budgetId),
  );

  return res.json(
    new ApiResponse({
      message: "Budget balance summary fetched successfully",
      data: result,
    }),
  );
}

export const getBudgetItemPOLinks = asyncHandler(async (req, res) => {
  const result = await getBudgetItemPOLinksService({
    budgetItemId: validateBudgetItemId(req.params.budgetItemId),
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Budget item PO links fetched successfully",
      data: result,
    }),
  );
});
