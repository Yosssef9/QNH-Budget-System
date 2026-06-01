import { getTransferEligibleItems } from "../repositories/budgetItem.repository.js";

export async function getTransferItemsService(financialYearId) {
  return getTransferEligibleItems(financialYearId);
}
