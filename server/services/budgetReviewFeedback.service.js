import { ApiError } from "../utils/apiError.js";

import {
  getBudgetReviewFeedbackRepo,
  getBudgetOwnerRepo,
} from "../repositories/budgetReviewFeedback.repository.js";

export async function getBudgetReviewFeedbackService({
  budgetId,
  budgetAccess,
}) {
  const budget = await getBudgetOwnerRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }

  const canSeeAll =
    budgetAccess.isGlobalAdmin === true ||
    budgetAccess.permissions?.can_approve_budget === true;

  const userDepartmentId = budgetAccess.department?.id || null;

  if (!canSeeAll && budget.department_id !== userDepartmentId) {
    throw new ApiError(
      403,
      "You cannot access this budget feedback",
      "FORBIDDEN",
    );
  }

  const notes = await getBudgetReviewFeedbackRepo(budgetId);

  const generalNotes = notes.filter(
    (note) => note.note_type === "GENERAL_RETURN",
  );

  const itemNotes = notes.filter(
    (note) => note.note_type === "ITEM_RETURN",
  );

  return {
    generalNotes,
    itemNotes,
  };
}