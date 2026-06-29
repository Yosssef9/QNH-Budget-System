import { ApiError } from "../utils/apiError.js";
import { withTransaction } from "../database/transaction.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
import { queueNotification } from "./notification.service.js";
import { findCategoryByCodeOrNameRepo } from "../repositories/categoryReviews.repository.js";
import {
  approveCategoryTransferRepo,
  createCategoryTransferRepo,
  getCategoryTransferByIdRepo,
  getCategoryTransferItemBalanceRepo,
  getCategoryTransferItemByIdRepo,
  getCategoryTransfersRepo,
  getEligibleCategoryTransferItemsRepo,
  getPreClosingFinancialYearRepo,
  rejectCategoryTransferRepo,
} from "../repositories/categoryTransfers.repository.js";

function normalizeCategoryCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "BIOMEDICAL") return "BIOMEDICAL";
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "IT") return "IT";

  return normalized;
}

async function resolveCategoryTransferScope(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type !== "CATEGORY_BUDGET_MANAGEMENT") {
    throw new ApiError(
      403,
      "Switch to a Category Budget Management Workspace to manage transfers",
      "INVALID_WORKSPACE",
    );
  }

  const categoryName = activeWorkspace?.category;

  if (!categoryName) {
    throw new ApiError(
      403,
      "No category scope found for the active workspace",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  const category = await findCategoryByCodeOrNameRepo(
    normalizeCategoryCode(categoryName),
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category scope was not found in budget categories",
      "CATEGORY_SCOPE_NOT_FOUND",
    );
  }

  return category;
}

function assertCfoTransferApprovalAccess(budgetAccess) {
  if (budgetAccess?.activeWorkspace?.type !== "CFO_REVIEW") {
    throw new ApiError(
      403,
      "Switch to the CFO Review Workspace to approve or reject transfers",
      "INVALID_WORKSPACE",
    );
  }
}

function assertApprovedTransferItem(item, label) {
  if (!item) {
    throw new ApiError(404, `${label} item not found`, "TRANSFER_ITEM_NOT_FOUND");
  }

  if (item.financial_year_status !== "PRE_CLOSING") {
    throw new ApiError(
      409,
      "Transfers are only allowed when the financial year is PRE-CLOSING",
      "FINANCIAL_YEAR_NOT_PRE_CLOSING",
    );
  }

  if (item.package_status !== "APPROVED") {
    throw new ApiError(
      409,
      `${label} category package is not approved`,
      "CATEGORY_PACKAGE_NOT_APPROVED",
    );
  }

  if (
    item.category_review_status !== "APPROVED" ||
    item.cfo_review_status !== "APPROVED"
  ) {
    throw new ApiError(
      409,
      `${label} item is not fully approved`,
      "CATEGORY_ITEM_NOT_APPROVED",
    );
  }
}

export async function getEligibleCategoryTransferItemsService({ budgetAccess }) {
  const category = await resolveCategoryTransferScope(budgetAccess);
  const financialYear = await getPreClosingFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      404,
      "No PRE-CLOSING financial year found",
      "PRE_CLOSING_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  const items = await getEligibleCategoryTransferItemsRepo({
    financialYearId: financialYear.id,
    categoryId: category.id,
  });

  return {
    financialYear,
    category,
    items,
  };
}

export async function createCategoryTransferService({
  payload,
  user,
  budgetAccess,
}) {
  const data = await withTransaction(async (transaction) => {
    const category = await resolveCategoryTransferScope(budgetAccess);
    const financialYear = await getPreClosingFinancialYearRepo(transaction);
    const source = await getCategoryTransferItemByIdRepo(
      payload.fromCategoryTypeReviewId,
      transaction,
    );
    const target = await getCategoryTransferItemByIdRepo(
      payload.toCategoryTypeReviewId,
      transaction,
    );

    if (!financialYear) {
      throw new ApiError(
        404,
        "No PRE-CLOSING financial year found",
        "PRE_CLOSING_FINANCIAL_YEAR_NOT_FOUND",
      );
    }

    assertApprovedTransferItem(source, "Source");
    assertApprovedTransferItem(target, "Target");

    if (Number(source.id) === Number(target.id)) {
      throw new ApiError(
        400,
        "Source and target items must be different",
        "SAME_TRANSFER_ITEM",
      );
    }

    if (Number(source.financial_year_id) !== Number(financialYear.id)) {
      throw new ApiError(
        400,
        "Source item does not belong to the PRE-CLOSING financial year",
        "FINANCIAL_YEAR_MISMATCH",
      );
    }

    if (Number(target.financial_year_id) !== Number(financialYear.id)) {
      throw new ApiError(
        400,
        "Target item does not belong to the PRE-CLOSING financial year",
        "FINANCIAL_YEAR_MISMATCH",
      );
    }

    if (
      Number(source.category_id) !== Number(category.id) ||
      Number(target.category_id) !== Number(category.id)
    ) {
      throw new ApiError(
        403,
        "Transfers must stay within your active category workspace",
        "CATEGORY_SCOPE_MISMATCH",
      );
    }

    if (Number(source.category_id) !== Number(target.category_id)) {
      throw new ApiError(
        400,
        "Cross-category transfers are not allowed",
        "CROSS_CATEGORY_TRANSFER_NOT_ALLOWED",
      );
    }

    const balance = await getCategoryTransferItemBalanceRepo(
      source.id,
      transaction,
    );
    const availableAmount = Number(balance?.available_amount || 0);

    if (availableAmount < Number(payload.amount)) {
      throw new ApiError(
        400,
        `Insufficient available balance. Maximum allowed: ${availableAmount}`,
        "INSUFFICIENT_TRANSFER_BALANCE",
      );
    }

    const transfer = await createCategoryTransferRepo({
      financialYearId: financialYear.id,
      categoryId: category.id,
      fromCategoryTypeReviewId: source.id,
      toCategoryTypeReviewId: target.id,
      amount: payload.amount,
      reason: payload.reason,
      requestedBy: user.userId,
      transaction,
    });

    return {
      transfer,
      financialYear,
      category,
      source,
      target,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_TRANSFER_SUBMITTED,
    entityType: "CATEGORY_TRANSFER",
    entityId: data.transfer.id,
    payload: {
      transferId: data.transfer.id,
      categoryId: data.category.id,
      categoryName: data.category.name,
      financialYear: data.financialYear.year,
      fromItemName: data.source.budget_type_name,
      toItemName: data.target.budget_type_name,
      amount: data.transfer.amount,
      reason: data.transfer.reason,
      requestedBy: user.userName,
    },
  });

  return data;
}

export async function getMyCategoryTransfersService({
  status,
  user,
  budgetAccess,
}) {
  const category = await resolveCategoryTransferScope(budgetAccess);

  return getCategoryTransfersRepo({
    status,
    categoryId: category.id,
    requestedBy: user.userId,
  });
}

export async function getPendingCategoryTransfersForCfoService({
  status,
  budgetAccess,
}) {
  assertCfoTransferApprovalAccess(budgetAccess);

  return getCategoryTransfersRepo({
    status,
  });
}

export async function getCategoryTransferDetailsService({
  transferId,
  budgetAccess,
}) {
  const transfer = await getCategoryTransferByIdRepo(transferId);

  if (!transfer) {
    throw new ApiError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
  }

  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type === "CATEGORY_BUDGET_MANAGEMENT") {
    const category = await resolveCategoryTransferScope(budgetAccess);

    if (Number(transfer.category_id) !== Number(category.id)) {
      throw new ApiError(
        403,
        "You cannot view transfers for another category",
        "FORBIDDEN",
      );
    }
  } else if (activeWorkspace?.type !== "CFO_REVIEW") {
    throw new ApiError(
      403,
      "Switch to a Category Budget Management or CFO Review workspace",
      "INVALID_WORKSPACE",
    );
  }

  const [sourceBalance, targetBalance] = await Promise.all([
    getCategoryTransferItemBalanceRepo(transfer.from_category_type_review_id),
    getCategoryTransferItemBalanceRepo(transfer.to_category_type_review_id),
  ]);

  return {
    transfer,
    sourceBalance,
    targetBalance,
  };
}

export async function approveCategoryTransferService({
  transferId,
  user,
  budgetAccess,
}) {
  assertCfoTransferApprovalAccess(budgetAccess);

  const data = await withTransaction(async (transaction) => {
    const transfer = await getCategoryTransferByIdRepo(transferId, transaction);

    if (!transfer) {
      throw new ApiError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
    }

    if (transfer.status !== "PENDING_APPROVAL") {
      throw new ApiError(
        409,
        `Transfer status is ${transfer.status}`,
        "TRANSFER_NOT_PENDING",
      );
    }

    if (transfer.financial_year_status !== "PRE_CLOSING") {
      throw new ApiError(
        409,
        "Transfers can only be approved while the financial year is PRE-CLOSING",
        "FINANCIAL_YEAR_NOT_PRE_CLOSING",
      );
    }

    const balance = await getCategoryTransferItemBalanceRepo(
      transfer.from_category_type_review_id,
      transaction,
    );
    const availableAmount = Number(balance?.available_amount || 0);

    if (availableAmount < Number(transfer.amount)) {
      throw new ApiError(
        400,
        `Transfer can no longer be approved. Available balance is ${availableAmount}`,
        "INSUFFICIENT_TRANSFER_BALANCE",
      );
    }

    const approved = await approveCategoryTransferRepo({
      transferId,
      approvedBy: user.userId,
      transaction,
    });

    if (!approved) {
      throw new ApiError(
        409,
        "Transfer could not be approved",
        "TRANSFER_APPROVAL_FAILED",
      );
    }

    return {
      approved,
      transfer,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_TRANSFER_APPROVED,
    entityType: "CATEGORY_TRANSFER",
    entityId: transferId,
    payload: {
      transferId,
      categoryTransferId: transferId,
      categoryName: data.transfer.category_name,
      financialYear: data.transfer.financial_year,
      fromItemName: data.transfer.from_budget_type_name,
      toItemName: data.transfer.to_budget_type_name,
      amount: data.transfer.amount,
      approvedBy: user.userName,
    },
  });

  return data.approved;
}

export async function rejectCategoryTransferService({
  transferId,
  payload,
  user,
  budgetAccess,
}) {
  assertCfoTransferApprovalAccess(budgetAccess);

  const data = await withTransaction(async (transaction) => {
    const transfer = await getCategoryTransferByIdRepo(transferId, transaction);

    if (!transfer) {
      throw new ApiError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
    }

    if (transfer.status !== "PENDING_APPROVAL") {
      throw new ApiError(
        409,
        `Transfer status is ${transfer.status}`,
        "TRANSFER_NOT_PENDING",
      );
    }

    if (transfer.financial_year_status !== "PRE_CLOSING") {
      throw new ApiError(
        409,
        "Transfers can only be rejected while the financial year is PRE-CLOSING",
        "FINANCIAL_YEAR_NOT_PRE_CLOSING",
      );
    }

    const rejected = await rejectCategoryTransferRepo({
      transferId,
      rejectedBy: user.userId,
      note: payload.note,
      transaction,
    });

    if (!rejected) {
      throw new ApiError(
        409,
        "Transfer could not be rejected",
        "TRANSFER_REJECTION_FAILED",
      );
    }

    return {
      rejected,
      transfer,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_TRANSFER_REJECTED,
    entityType: "CATEGORY_TRANSFER",
    entityId: transferId,
    payload: {
      transferId,
      categoryTransferId: transferId,
      categoryName: data.transfer.category_name,
      financialYear: data.transfer.financial_year,
      fromItemName: data.transfer.from_budget_type_name,
      toItemName: data.transfer.to_budget_type_name,
      amount: data.transfer.amount,
      rejectedBy: user.userName,
      reason: payload.note,
    },
  });

  return data.rejected;
}
