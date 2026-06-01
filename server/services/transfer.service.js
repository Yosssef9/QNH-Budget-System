import { ApiError } from "../utils/apiError.js";

import { calculateItemBalance } from "./budgetBalance.service.js";

import { getBudgetItemDetails } from "../repositories/budgetItem.repository.js";

import {
  createTransferRepo,
  getTransfersRepo,
  approveTransferRepo,
  rejectTransferRepo,
  getTransferByIdRepo,
  getPendingTransfersRepo,
} from "../repositories/transfer.repository.js";

export async function createTransferService({
  from_budget_item_id,
  to_budget_item_id,
  amount,
  reason,
  userId,
}) {
  const source = await getBudgetItemDetails(from_budget_item_id);

  const target = await getBudgetItemDetails(to_budget_item_id);

  if (!source) {
    throw new ApiError(404, "Source item not found");
  }

  if (!target) {
    throw new ApiError(404, "Target item not found");
  }

  if (source.status !== "APPROVED") {
    throw new ApiError(
      400,
      `Source budget status is ${source.status}. Transfers are only allowed on approved budgets.`,
    );
  }

  if (target.status !== "APPROVED") {
    throw new ApiError(
      400,
      `Target budget status is ${target.status}. Transfers are only allowed on approved budgets.`,
    );
  }

  if (source.financial_year_id !== target.financial_year_id) {
    throw new ApiError(400, "Items must belong to the same financial year");
  }

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Amount must be greater than zero");
  }

  const balance = await calculateItemBalance(from_budget_item_id);

  if (balance.availableForTransfer < amount) {
    throw new ApiError(
      400,
      `Insufficient balance. Maximum allowed: ${balance.availableForTransfer}`,
    );
  }

  return createTransferRepo({
    from_budget_item_id,
    to_budget_item_id,
    amount,
    reason,
    requested_by: userId,
  });
}
export async function getTransfersService() {
  return getTransfersRepo();
}

export async function approveTransferService(transferId, userId) {
  const transfer = await getTransferByIdRepo(transferId);

  if (!transfer) {
    throw new ApiError(404, "Transfer not found");
  }

  if (transfer.status !== "PENDING_APPROVAL") {
    throw new ApiError(400, `Transfer status is ${transfer.status}`);
  }

  return approveTransferRepo(transferId, userId);
}
export async function rejectTransferService(transferId, userId, note) {
  const transfer = await getTransferByIdRepo(transferId);

  if (!transfer) {
    throw new ApiError(404, "Transfer not found");
  }

  if (transfer.status !== "PENDING_APPROVAL") {
    throw new ApiError(400, `Transfer status is ${transfer.status}`);
  }

  if (!note?.trim()) {
    throw new ApiError(400, "Rejection note is required");
  }

  return rejectTransferRepo(transferId, userId, note);
}
export async function getPendingTransfersService() {
  return getPendingTransfersRepo();
}
export async function getTransferByIdService(id) {
  const transfer = await getTransferByIdRepo(id);

  if (!transfer) {
    throw new ApiError(404, "Transfer not found");
  }

  return transfer;
}
