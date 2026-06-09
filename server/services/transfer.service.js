import { ApiError } from "../utils/apiError.js";

import { calculateItemBalance } from "./budgetBalance.service.js";
import { withTransaction } from "../database/transaction.js";
import {
  getBudgetItemDetails,
  budgetItemTypeExistsRepo,
  createBudgetItemFromTransferRepo,
} from "../repositories/budgetItem.repository.js";
import {
  createTransferRepo,
  getTransfersRepo,
  approveTransferRepo,
  rejectTransferRepo,
  getTransferByIdRepo,
  getTransferItemsRepo,
  getMyTransfersRepo,
  getTransferDashboardRepo,
  findPendingTransferForItemsRepo,
  findPendingNewItemTransferRepo,
} from "../repositories/transfer.repository.js";
import { queueNotification } from "./notification.service.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
export async function createTransferService({
  from_budget_item_id,
  to_budget_item_id,

  is_new_item = false,

  new_item_type_id,
  new_item_quantity,
  new_item_unit_price,

  amount,
  reason,
  user,
}) {
  const source = await getBudgetItemDetails(from_budget_item_id);

  if (!source) {
    throw new ApiError(404, "Source item not found");
  }

  if (source.status !== "APPROVED") {
    throw new ApiError(
      400,
      `Source budget status is ${source.status}. Transfers are only allowed on approved budgets.`,
    );
  }

  if (source.financial_year_status !== "PRE_CLOSING") {
    throw new ApiError(
      400,
      `Transfers are only allowed when the financial year is PRE_CLOSING. Current status is ${source.financial_year_status}`,
    );
  }

  let target = null;

  if (!is_new_item) {
    target = await getBudgetItemDetails(to_budget_item_id);

    if (Number(from_budget_item_id) === Number(to_budget_item_id)) {
      throw new ApiError(
        400,
        "Source and destination budget items must be different",
      );
    }

    if (!target) {
      throw new ApiError(404, "Target item not found");
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
  } else {
    const exists = await budgetItemTypeExistsRepo(
      source.budget_id,
      new_item_type_id,
    );

    if (exists) {
      throw new ApiError(400, "This item already exists in your budget.");
    }
    const pending = await findPendingNewItemTransferRepo(
      source.budget_id,
      new_item_type_id,
    );

    if (pending) {
      throw new ApiError(
        400,
        "A pending request already exists for this item type.",
      );
    }
    if (!new_item_type_id) {
      throw new ApiError(400, "New item type is required");
    }

    if (!new_item_quantity || Number(new_item_quantity) <= 0) {
      throw new ApiError(400, "Quantity must be greater than zero");
    }

    if (!new_item_unit_price || Number(new_item_unit_price) <= 0) {
      throw new ApiError(400, "Unit price must be greater than zero");
    }

    amount = Number(new_item_quantity) * Number(new_item_unit_price);
  }

  if (!amount || Number(amount) <= 0) {
    throw new ApiError(400, "Amount must be greater than zero");
  }

  const balance = await calculateItemBalance(from_budget_item_id);

  if (balance.availableForTransfer < amount) {
    throw new ApiError(
      400,
      `Insufficient balance. Maximum allowed: ${balance.availableForTransfer}`,
    );
  }

  if (!is_new_item) {
    const lockedTransfer = await findPendingTransferForItemsRepo(
      from_budget_item_id,
      to_budget_item_id,
    );

    if (lockedTransfer) {
      throw new ApiError(
        400,
        "One or more selected budget items are already involved in a pending transfer request.",
      );
    }
  }

  const transfer = await createTransferRepo({
    from_budget_item_id,
    to_budget_item_id: is_new_item ? null : to_budget_item_id,

    is_new_item,

    new_item_type_id,
    new_item_quantity,
    new_item_unit_price,
    new_item_total_amount: is_new_item ? amount : null,

    amount,
    reason,

    requested_by: user.userId,
  });
  const transferDetails = await getTransferByIdRepo(transfer.id);
  await queueNotification({
    notificationType: NOTIFICATION_TYPES.TRANSFER_CREATED,

    entityType: "TRANSFER",

    entityId: transfer.id,

    payload: {
      transferId: transfer.id,

      budgetName: transferDetails.department_name,

      amount: transfer.amount,

      requestedBy: user.userName,
    },
  });

  return transfer;
}
export async function getTransfersService(status) {
  return getTransfersRepo(status);
}

export async function approveTransferService(transferId, user) {
  const transfer = await getTransferByIdRepo(transferId);

  if (!transfer) {
    throw new ApiError(404, "Transfer not found");
  }

  if (transfer.status !== "PENDING_APPROVAL") {
    throw new ApiError(400, `Transfer status is ${transfer.status}`);
  }

  const balance = await calculateItemBalance(transfer.from_budget_item_id);

  if (balance.availableForTransfer < Number(transfer.amount)) {
    throw new ApiError(
      400,
      `Transfer can no longer be approved. Available balance is ${balance.availableForTransfer}`,
    );
  }

  const approvedTransfer = await withTransaction(async (trx) => {
    const approvedTransfer = await approveTransferRepo(
      transferId,
      user.userId,
      trx,
    );

    if (transfer.is_new_item) {
      const sourceItem = await getBudgetItemDetails(
        transfer.from_budget_item_id,
      );

      const exists = await budgetItemTypeExistsRepo(
        sourceItem.budget_id,
        transfer.new_item_type_id,
      );

      if (exists) {
        throw new ApiError(400, "Budget item already exists.");
      }

      await createBudgetItemFromTransferRepo(
        {
          budgetId: sourceItem.budget_id,

          typeId: transfer.new_item_type_id,

          quantity: transfer.new_item_quantity,

          unitPrice: transfer.new_item_unit_price,

          amount: transfer.new_item_total_amount,

          distributionMethod: "MONTHLY",

          distributionLevel: "MONTH",

          transferId,
          createdBy: user.userId,
        },
        trx,
      );
    }

    return approvedTransfer;
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.TRANSFER_APPROVED,

    entityType: "TRANSFER",

    entityId: transferId,

    payload: {
      transferId,

      budgetName: transfer.department_name,

      amount: transfer.amount,

      approvedBy: user.userName,
    },
  });

  return approvedTransfer;
}
export async function rejectTransferService(transferId, user, note) {
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

  const rejectedTransfer = await rejectTransferRepo(
    transferId,
    user.userId,
    note,
  );

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.TRANSFER_REJECTED,

    entityType: "TRANSFER",

    entityId: transferId,

    payload: {
      transferId,

      budgetName: transfer.department_name,

      amount: transfer.amount,

      rejectedBy: user.userName,

      reason: note,
    },
  });

  return rejectedTransfer;
}

export async function getTransferByIdService(id) {
  const transfer = await getTransferByIdRepo(id);

  if (!transfer) {
    throw new ApiError(404, "Transfer not found");
  }

  return transfer;
}
export async function getTransferItemsService({ budgetAccess }) {
  const departmentId = budgetAccess?.department?.id;

  if (!departmentId) {
    throw new ApiError(403, "You are not assigned to any department budget");
  }

  const items = await getTransferItemsRepo({
    departmentId,
  });

  const itemsWithBalance = await Promise.all(
    items.map(async (item) => {
      const balance = await calculateItemBalance(item.id);

      return {
        ...item,
        available_amount: balance.availableForTransfer,
      };
    }),
  );

  return itemsWithBalance;
}
export async function getMyTransfersService() {
  return getMyTransfersRepo();
}
export async function getTransferDashboardService(
  userId,
  departmentId,
  isApprover,
) {
  const requests = await getTransferDashboardRepo(
    userId,
    departmentId,
    isApprover,
  );

  return {
    mode: isApprover ? "APPROVER_PENDING" : "REQUESTER_HISTORY",
    requests,
  };
}
