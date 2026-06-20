import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { auditLog } from "../utils/audit.js";
import {
  getPendingBudgetsService,
  getBudgetReviewService,
  getBudgetItemPriceIntelligenceService,
  approveBudgetService,
  returnBudgetService,
  getBudgetComparisonService,
  getApprovedBudgetsService,
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

export const getBudgetItemPriceIntelligence = asyncHandler(async (req, res) => {
  const data = await getBudgetItemPriceIntelligenceService({
    budgetId: Number(req.params.budgetId),
    budgetItemId: Number(req.params.budgetItemId),
  });

  res.json(
    new ApiResponse({
      message: "Budget item price intelligence fetched successfully",
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
  await auditLog(req, {
    action: "APPROVE_BUDGET",
    entityName: `${data?.department_name || "Department"} Budget`,
    entityType: "BUDGET",
    entityId: String(req.params.budgetId),
    description: `Approved ${data?.department_name || "Department"} budget`,
    newValues: {
      status: "APPROVED",
      generalNote: req.body?.generalNote || null,
      itemNotesCount: req.body?.itemNotes?.length || 0,
    },
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
  await auditLog(req, {
    action: "RETURN_BUDGET",
    entityName: `${data?.department_name || "Department"} Budget`,
    entityType: "BUDGET",
    entityId: String(req.params.budgetId),
    description: `Returned ${
      data?.department_name || "Department"
    } budget for revision`,
    newValues: {
      status: "RETURNED",
      generalNote: req.body?.generalNote || null,
      itemNotesCount: req.body?.itemNotes?.length || 0,
    },
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
export const getApprovedBudgets = asyncHandler(async (req, res) => {
  const data = await getApprovedBudgetsService();

  res.json(
    new ApiResponse({
      message: "Approved budgets fetched successfully",
      data,
    }),
  );
});
