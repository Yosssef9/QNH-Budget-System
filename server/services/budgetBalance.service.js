import { ApiError } from "../utils/apiError.js";
import { getBudgetItemBalanceRepo } from "../repositories/budgetBalance.repository.js";

export async function calculateItemBalance(itemId) {
  const row = await getBudgetItemBalanceRepo(itemId);

  if (!row) {
    throw new ApiError(404, "Budget item not found", "BUDGET_ITEM_NOT_FOUND");
  }

  const approvedAmount = Number(row.approved_amount || 0);
  const transferIn = Number(row.transfer_in || 0);
  const transferOut = Number(row.transfer_out || 0);
  const poUsed = Number(row.po_used || 0);

  const remainingAmount = approvedAmount + transferIn - transferOut - poUsed;

  return {
    approvedAmount,
    transferIn,
    transferOut,
    poUsed,

    remainingAmount,

    isExceeded: remainingAmount < 0,

    availableForTransfer: Math.max(0, remainingAmount),
  };
}
