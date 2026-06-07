import { ApiError } from "../utils/apiError.js";

import {
  getPendingBudgetsRepo,
  getBudgetHeaderRepo,
  getBudgetItemsForReviewRepo,
  approveBudgetRepo,
  returnBudgetRepo,
  getBudgetComparisonRepo,
  getApprovedBudgetsRepo,
} from "../repositories/budgetApproval.repository.js";
import { findLatestFinancialYearRepo } from "../repositories/financialYears.repository.js";
import { insertBudgetNoteRepo } from "../repositories/budgetNote.repository.js";
import { queueNotification } from "./notification.service.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
export async function getPendingBudgetsService() {
  const financialYear = await findLatestFinancialYearRepo();

  if (!financialYear) {
    return [];
  }

  return await getPendingBudgetsRepo(financialYear.id);
}

export async function getBudgetReviewService(budgetId) {
  const budget = await getBudgetHeaderRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }

  const items = await getBudgetItemsForReviewRepo(budgetId);

  return {
    budget,
    items,
  };
}

export async function approveBudgetService({ budgetId, body, user }) {
  const budget = await getBudgetHeaderRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }
  if (budget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Budget approval is only allowed while financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }
  if (budget.status !== "PENDING_APPROVAL") {
    throw new ApiError(
      400,
      "Only pending budgets can be approved",
      "INVALID_BUDGET_STATUS",
    );
  }

  await approveBudgetRepo({
    budgetId,
    approvedBy: user.userId,
  });

  const approved = await getBudgetHeaderRepo(budgetId);

  if (body?.generalNote?.trim()) {
    await insertBudgetNoteRepo({
      budgetId,
      budgetItemId: null,
      noteType: "GENERAL_APPROVAL",
      note: body.generalNote.trim(),
      createdBy: user.userId,
    });
  }

  for (const itemNote of body?.itemNotes || []) {
    if (!itemNote.note?.trim()) continue;

    await insertBudgetNoteRepo({
      budgetId,
      budgetItemId: itemNote.budgetItemId,
      noteType: "ITEM_APPROVAL",
      note: itemNote.note.trim(),
      createdBy: user.userId,
    });
  }
  await queueNotification({
    notificationType: NOTIFICATION_TYPES.BUDGET_APPROVED,

    entityType: "BUDGET",

    entityId: budgetId,

    payload: {
      budgetId,
      actorUserId: user.userId,
    },
  });
  return approved;
}

export async function returnBudgetService({ budgetId, body, user }) {
  const generalNote = body?.generalNote?.trim();

  if (!generalNote) {
    throw new ApiError(400, "Return note is required", "RETURN_NOTE_REQUIRED");
  }

  const budget = await getBudgetHeaderRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }
  if (budget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Budget return is only allowed while financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }
  if (budget.status !== "PENDING_APPROVAL") {
    throw new ApiError(
      400,
      "Only pending budgets can be returned",
      "INVALID_BUDGET_STATUS",
    );
  }

  await returnBudgetRepo({
    budgetId,
    returnedBy: user.userId,
  });

  const returned = await getBudgetHeaderRepo(budgetId);
  await insertBudgetNoteRepo({
    budgetId,
    budgetItemId: null,
    noteType: "GENERAL_RETURN",
    note: generalNote,
    createdBy: user.userId,
  });

  for (const itemNote of body?.itemNotes || []) {
    if (!itemNote.note?.trim()) continue;

    await insertBudgetNoteRepo({
      budgetId,
      budgetItemId: itemNote.budgetItemId,
      noteType: "ITEM_RETURN",
      note: itemNote.note.trim(),
      createdBy: user.userId,
    });
  }
  await queueNotification({
    notificationType: NOTIFICATION_TYPES.BUDGET_RETURNED,

    entityType: "BUDGET",

    entityId: budgetId,

    payload: {
      budgetId,
      actorUserId: user.userId,
    },
  });
  return returned;
}

export async function getBudgetComparisonService() {
  return await getBudgetComparisonRepo();
}
export async function getApprovedBudgetsService() {
  const financialYear = await findLatestFinancialYearRepo();

  if (!financialYear) {
    return [];
  }

  return await getApprovedBudgetsRepo(financialYear.id);
}
