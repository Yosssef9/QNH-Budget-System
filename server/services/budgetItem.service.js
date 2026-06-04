import {
  getTransferEligibleItems,
  getAvailableTransferTypesRepo,
} from "../repositories/budgetItem.repository.js";
import { findLatestFinancialYearRepo } from "../repositories/financialYears.repository.js";

import { getCurrentBudgetRepo } from "../repositories/budgets.repository.js";
export async function getTransferItemsService(financialYearId) {
  return getTransferEligibleItems(financialYearId);
}

export async function getAvailableTransferTypesService(
  departmentId,
) {
  const financialYear =
    await findLatestFinancialYearRepo();

  if (!financialYear) {
    return [];
  }

  const budget = await getCurrentBudgetRepo({
    departmentId,
    financialYearId: financialYear.id,
  });

  if (!budget) {
    return [];
  }

  return getAvailableTransferTypesRepo(budget.id);
}