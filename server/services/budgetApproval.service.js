import { ApiError } from "../utils/apiError.js";

import {
  getPendingBudgetsRepo,
  getBudgetHeaderRepo,
  getBudgetItemsForReviewRepo,
  getBudgetItemPriceIntelligenceRepo,
  getBudgetItemPriceIntelligenceDetailsRepo,
  approveBudgetRepo,
  returnBudgetRepo,
  getBudgetComparisonRepo,
  getApprovedBudgetsRepo,
} from "../repositories/budgetApproval.repository.js";
import {
  buildPriceIntelligence,
  summarizePriceIntelligence,
} from "../helpers/priceIntelligence.helper.js";
import { findLatestFinancialYearRepo } from "../repositories/financialYears.repository.js";
import { insertBudgetNoteRepo } from "../repositories/budgetNote.repository.js";
import { queueNotification } from "./notification.service.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
import { withTransaction } from "../database/transaction.js";
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
  const priceIntelligenceRows =
    await getBudgetItemPriceIntelligenceRepo(budgetId);
  const priceIntelligenceByItemId = new Map(
    priceIntelligenceRows.map((row) => [
      Number(row.budget_item_id),
      {
        ...row,
        mapped_item_codes: parseMappedItemCodes(row.mapped_item_codes),
      },
    ]),
  );

  const itemsWithPriceIntelligence = items.map((item) => ({
    ...item,
    price_intelligence: buildPriceIntelligence(
      item,
      priceIntelligenceByItemId.get(Number(item.id)),
    ),
  }));

  return {
    budget,
    items: itemsWithPriceIntelligence,
    priceIntelligenceSummary: summarizePriceIntelligence(
      itemsWithPriceIntelligence,
    ),
  };
}

function parseMappedItemCodes(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  return String(value)
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

export async function getBudgetItemPriceIntelligenceService({
  budgetId,
  budgetItemId,
}) {
  const { budgetItem, benchmark, recentPurchases } =
    await getBudgetItemPriceIntelligenceDetailsRepo({
      budgetId,
      budgetItemId,
    });

  if (!budgetItem) {
    throw new ApiError(
      404,
      "Budget item not found for this budget",
      "BUDGET_ITEM_NOT_FOUND",
    );
  }

  const normalizedBenchmark = {
    ...benchmark,
    mapped_item_codes: parseMappedItemCodes(benchmark?.mapped_item_codes),
  };

  return {
    budgetItem,
    priceIntelligence: buildPriceIntelligence(
      budgetItem,
      normalizedBenchmark,
    ),
    historicalPurchases: recentPurchases || [],
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

      budgetName: `${approved.department_name} Budget ${approved.financial_year}`,

      departmentName: approved.department_name,

      approvedBy: user.userName,
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

  await withTransaction(async (trx) => {
    const returnedBudget = await returnBudgetRepo(
      {
        budgetId,
        returnedBy: user.userId,
      },
      trx,
    );

    if (!returnedBudget) {
      throw new ApiError(
        409,
        "Budget is no longer pending approval",
        "BUDGET_RETURN_CONFLICT",
      );
    }

    await insertBudgetNoteRepo(
      {
        budgetId,
        budgetItemId: null,
        noteType: "GENERAL_RETURN",
        note: generalNote,
        createdBy: user.userId,
      },
      trx,
    );

    for (const itemNote of body?.itemNotes || []) {
      if (!itemNote.note?.trim()) {
        continue;
      }

      await insertBudgetNoteRepo(
        {
          budgetId,

          budgetItemId: itemNote.budgetItemId,

          noteType: "ITEM_RETURN",

          note: itemNote.note.trim(),

          createdBy: user.userId,
        },
        trx,
      );
    }
  });

  const returned = await getBudgetHeaderRepo(budgetId);

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.BUDGET_RETURNED,

    entityType: "BUDGET",

    entityId: budgetId,

    payload: {
      budgetId,

      budgetName: `${returned.department_name} Budget ${returned.financial_year}`,

      departmentName: returned.department_name,

      returnedBy: user.userName,

      reason: generalNote,
    },
  });
  return returned;
}

export async function getBudgetComparisonService() {
  const rows = await getBudgetComparisonRepo();

  return rows.map((row) => {
    const priceIntelligence = buildPriceIntelligence(row, {
      historical_benchmark: row.historical_benchmark,
      average_unit_cost: row.average_unit_cost,
      min_unit_cost: row.min_unit_cost,
      max_unit_cost: row.max_unit_cost,
      last_purchase_unit_cost: row.last_purchase_unit_cost,
      last_purchase_at: row.last_purchase_at,
      purchase_count: row.purchase_count,
      supplier_count: row.supplier_count,
      mapped_item_codes: parseMappedItemCodes(row.mapped_item_codes),
      evidence_window_used: row.evidence_window_used,
    });

    return {
      ...row,
      pi_benchmark_price: priceIntelligence.historical_benchmark,
      pi_variance_amount: priceIntelligence.variance_amount,
      pi_variance_percent: priceIntelligence.variance_percent,
      pi_potential_overspend: priceIntelligence.potential_overspend,
      pi_status: priceIntelligence.status,
      pi_status_label: priceIntelligence.status_label,
      pi_severity: priceIntelligence.severity,
      pi_purchase_count: priceIntelligence.purchase_count,
      pi_supplier_count: priceIntelligence.supplier_count,
    };
  });
}
export async function getApprovedBudgetsService() {
  const financialYear = await findLatestFinancialYearRepo();

  if (!financialYear) {
    return [];
  }

  return await getApprovedBudgetsRepo(financialYear.id);
}
