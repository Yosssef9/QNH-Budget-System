import { ApiError } from "../utils/apiError.js";
import {
  getBudgetItemBalanceRepo,
  getBudgetBalanceSummaryRepo,
} from "../repositories/budgetBalance.repository.js";

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
  const netTransfer = transferIn - transferOut;

  return {
    approvedAmount,

    transferIn,
    transferOut,
    netTransfer,

    poUsed,

    remainingAmount,

    isExceeded: remainingAmount < 0,

    availableForTransfer: Math.max(0, remainingAmount),
  };
}
export async function getBudgetBalanceSummaryService(budgetId) {
  const items = await getBudgetBalanceSummaryRepo(budgetId);

  const result = [];

  for (const item of items) {
    const balance = await calculateItemBalance(item.id);

   result.push({
  itemId: item.id,
  typeName: item.type_name,

  created_from_transfer: item.created_from_transfer,
  source_transfer_id: item.source_transfer_id,

  approvedAmount: balance.approvedAmount,

  transferIn: balance.transferIn,

  transferOut: balance.transferOut,

  netTransfer: balance.netTransfer,

  poUsed: balance.poUsed,

  remainingAmount: balance.remainingAmount,
});
  }

  return result;
}
