import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import { hasPermission } from "../../../shared/permissions/permissionCodes.js";
import { TRANSFER_PERMISSIONS, TRANSFER_STATUS } from "./transfers.constants.js";
import {
  approveTransferRepo,
  createCategoryTransferRepo,
  ensureDestinationPackageSubItemRepo,
  findSubItemContextRepo,
  getTransferByIdRepo,
  listReusableSubItemsForCatalogItemRepo,
  listTransferDestinationCatalogRepo,
  listTransfersRepo,
  listTransferSubItemsRepo,
  rejectTransferRepo,
} from "./transfers.repository.js";
import { mapTransfer, mapTransferSubItem } from "./transfers.mapper.js";
import { createWorkflowHistoryRepo } from "../category-packages/categoryPackages.repository.js";

function getActorRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getCategoryId(budgetAccess) {
  return (
    budgetAccess?.budgetCategory?.id ??
    budgetAccess?.category?.id ??
    budgetAccess?.budgetCategoryId ??
    budgetAccess?.categoryId ??
    budgetAccess?.budget_category_id ??
    budgetAccess?.selectedWorkspace?.budgetCategory?.id ??
    budgetAccess?.selectedWorkspace?.category?.id ??
    budgetAccess?.selectedWorkspace?.budgetCategoryId ??
    budgetAccess?.selectedWorkspace?.categoryId ??
    null
  );
}

function assertPermission(budgetAccess, permission, message) {
  if (!hasPermission(budgetAccess, permission)) {
    throw new ApiError(403, message, "TRANSFER_PERMISSION_DENIED");
  }
}

function assertCategoryScope(budgetAccess) {
  const categoryId = getCategoryId(budgetAccess);
  if (!categoryId) {
    throw new ApiError(403, "Category workspace is required for transfers", "TRANSFER_CATEGORY_SCOPE_REQUIRED");
  }
  return Number(categoryId);
}

function assertPreClosing(context) {
  if (context.financial_year_status !== "PRE_CLOSING") {
    throw new ApiError(
      400,
      "Transfers are allowed only after the financial year reaches PRE_CLOSING",
      "TRANSFER_YEAR_NOT_PRE_CLOSING",
    );
  }
}

function assertTransferScope(source, target, categoryId) {
  if (Number(source.budget_category_id) !== Number(categoryId)) {
    throw new ApiError(403, "You cannot create transfers for another category", "TRANSFER_CATEGORY_SCOPE_DENIED");
  }
  if (Number(source.package_id) !== Number(target.package_id)) {
    throw new ApiError(400, "Transfer source and destination must belong to the same category package", "TRANSFER_PACKAGE_MISMATCH");
  }
  if (Number(source.id) === Number(target.id)) {
    throw new ApiError(400, "Source and destination package sub-items must be different", "TRANSFER_SAME_SUB_ITEM");
  }
}

function calculateTransferAmounts({ payload, source, target }) {
  const sourceUnitPrice = Number(source.unit_price || 0);
  const destinationUnitPrice =
    Number(payload.destination_unit_price || 0) || Number(target.unit_price || 0);

  if (sourceUnitPrice <= 0 || destinationUnitPrice <= 0) {
    throw new ApiError(400, "Source and destination unit prices must be greater than zero", "TRANSFER_UNIT_PRICE_REQUIRED");
  }

  const transferAmount =
    payload.transfer_amount || Number(payload.source_quantity) * sourceUnitPrice;
  const sourceQuantity = payload.source_quantity || transferAmount / sourceUnitPrice;
  const destinationQuantity =
    payload.destination_quantity || transferAmount / destinationUnitPrice;

  return {
    transferAmount,
    sourceQuantity,
    destinationQuantity,
    sourceUnitPrice,
    destinationUnitPrice,
  };
}

function buildTransferNotificationPayload(transfer, actorUserId, note = null) {
  return {
    transferId: transfer.id,
    categoryId: transfer.budget_category_id,
    categoryName: transfer.category_name,
    financialYear: transfer.financial_year,
    fromItemName: transfer.from_item_name,
    fromSubItemName: transfer.from_sub_item_name,
    toItemName: transfer.to_item_name,
    toSubItemName: transfer.to_sub_item_name,
    amount: transfer.transfer_amount ?? transfer.amount,
    sourceQuantity: transfer.source_quantity,
    destinationQuantity: transfer.destination_quantity,
    requestedBy: transfer.requested_by_name || transfer.requested_by,
    reason: note || transfer.rejection_note || transfer.reason,
    actorUserId,
  };
}

export async function getTransferItemsService({
  financialYearId = null,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.CREATE,
    "You do not have permission to create category transfers",
  );
  const categoryId = assertCategoryScope(budgetAccess);
  const rows = await listTransferSubItemsRepo({
    budgetCategoryId: categoryId,
    financialYearId,
  });
  return rows.map(mapTransferSubItem);
}

export async function getTransferCatalogOptionsService({ budgetAccess }) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.CREATE,
    "You do not have permission to create category transfers",
  );
  const categoryId = assertCategoryScope(budgetAccess);
  return listTransferDestinationCatalogRepo({ budgetCategoryId: categoryId });
}

export async function getTransferCatalogSubItemsService({
  catalogItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.CREATE,
    "You do not have permission to create category transfers",
  );
  const categoryId = assertCategoryScope(budgetAccess);
  return listReusableSubItemsForCatalogItemRepo({
    catalogItemId,
    budgetCategoryId: categoryId,
  });
}

export async function createTransferService({ payload, actorUserId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.CREATE,
    "You do not have permission to create category transfers",
  );
  const categoryId = assertCategoryScope(budgetAccess);
  const actorRoleId = getActorRoleId(budgetAccess);

  const created = await withTransaction(async (transaction) => {
    const source = await findSubItemContextRepo(
      { packageSubItemId: payload.from_package_sub_item_id },
      transaction,
    );

    if (!source) {
      throw new ApiError(404, "Source package sub-item not found", "TRANSFER_SOURCE_NOT_FOUND");
    }

    assertPreClosing(source);

    let target;
    if (payload.is_new_item) {
      target = await ensureDestinationPackageSubItemRepo(transaction, {
        package_id: source.package_id,
        catalog_item_id: payload.destination_catalog_item_id,
        catalog_sub_item_id: payload.destination_catalog_sub_item_id,
        unit_price: payload.destination_unit_price,
        actor_user_id: actorUserId,
      });
    } else {
      target = await findSubItemContextRepo(
        { packageSubItemId: payload.to_package_sub_item_id },
        transaction,
      );
    }

    if (!target) {
      throw new ApiError(404, "Destination package sub-item not found", "TRANSFER_DESTINATION_NOT_FOUND");
    }

    assertTransferScope(source, target, categoryId);

    const amounts = calculateTransferAmounts({ payload, source, target });
    const availableQuantity = Number(source.available_quantity ?? source.quantity ?? 0);
    const availableAmount =
      Number(source.available_amount) ||
      availableQuantity * Number(source.unit_price || 0);

    if (amounts.sourceQuantity > availableQuantity || amounts.transferAmount > availableAmount) {
      throw new ApiError(400, "Transfer exceeds available source balance", "TRANSFER_SOURCE_BALANCE_EXCEEDED");
    }

    const inserted = await createCategoryTransferRepo(transaction, {
      from_package_sub_item_id: source.id,
      to_package_sub_item_id: target.id,
      transfer_amount: amounts.transferAmount,
      source_quantity: amounts.sourceQuantity,
      source_unit_price_snapshot: amounts.sourceUnitPrice,
      destination_quantity: amounts.destinationQuantity,
      destination_unit_price_snapshot: amounts.destinationUnitPrice,
      reason: payload.reason,
      requested_by: actorUserId,
      requested_user_role_id: actorRoleId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: source.financial_year_id,
      entity_type: "CATEGORY_BUDGET_TRANSFER",
      entity_id: inserted.id,
      action: "CATEGORY_TRANSFER_CREATED",
      new_status: TRANSFER_STATUS.PENDING_APPROVAL,
      note: payload.reason,
      user_role_id: actorRoleId,
      acting_workspace: budgetAccess?.workspaceType ?? null,
      created_by: actorUserId,
    });

    return inserted;
  });

  const mapped = mapTransfer(await getTransferByIdRepo({ transferId: created.id }));

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.TRANSFER_CREATED,
    entityType: "CATEGORY_BUDGET_TRANSFER",
    entityId: mapped.id,
    payload: buildTransferNotificationPayload(mapped, actorUserId),
  });

  return mapped;
}

export async function getTransfersService({ query, budgetAccess }) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.APPROVE,
    "You do not have permission to approve category transfers",
  );
  const rows = await listTransfersRepo(query);
  return rows.map(mapTransfer);
}

export async function getMyTransfersService({ actorUserId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.CREATE,
    "You do not have permission to view category transfers",
  );
  const categoryId = assertCategoryScope(budgetAccess);
  const rows = await listTransfersRepo({
    budgetCategoryId: categoryId,
    requestedBy: actorUserId,
  });
  return rows.map(mapTransfer);
}

export async function getTransferByIdService({ transferId, budgetAccess }) {
  const transfer = await getTransferByIdRepo({ transferId });
  if (!transfer) throw new ApiError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
  const canApprove = hasPermission(budgetAccess, TRANSFER_PERMISSIONS.APPROVE);
  const canCreate = hasPermission(budgetAccess, TRANSFER_PERMISSIONS.CREATE);

  if (!canApprove && !canCreate) {
    throw new ApiError(403, "You do not have permission to view category transfers", "TRANSFER_PERMISSION_DENIED");
  }

  if (!canApprove) {
    const categoryId = assertCategoryScope(budgetAccess);
    if (Number(transfer.budget_category_id) !== Number(categoryId)) {
      throw new ApiError(403, "You cannot view another category transfer", "TRANSFER_CATEGORY_SCOPE_DENIED");
    }
  }

  return mapTransfer(transfer);
}

export async function approveTransferService({ transferId, actorUserId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.APPROVE,
    "You do not have permission to approve category transfers",
  );

  await withTransaction(async (transaction) => {
    const transfer = await getTransferByIdRepo({ transferId }, transaction);
    if (!transfer) throw new ApiError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
    if (transfer.status !== TRANSFER_STATUS.PENDING_APPROVAL) {
      throw new ApiError(400, "Only pending transfers can be approved", "TRANSFER_STATUS_INVALID");
    }
    if (Number(transfer.requested_by) === Number(actorUserId)) {
      throw new ApiError(400, "Requester cannot approve their own transfer", "TRANSFER_SELF_APPROVAL_BLOCKED");
    }

    const affected = await approveTransferRepo(transaction, {
      transfer_id: transferId,
      actor_user_id: actorUserId,
      actor_user_role_id: getActorRoleId(budgetAccess),
    });
    if (!affected) throw new ApiError(409, "Transfer changed before approval", "TRANSFER_CONFLICT");

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: transfer.financial_year_id,
      entity_type: "CATEGORY_BUDGET_TRANSFER",
      entity_id: transferId,
      action: "CATEGORY_TRANSFER_APPROVED",
      old_status: TRANSFER_STATUS.PENDING_APPROVAL,
      new_status: TRANSFER_STATUS.APPROVED,
      user_role_id: getActorRoleId(budgetAccess),
      acting_workspace: budgetAccess?.workspaceType ?? null,
      created_by: actorUserId,
    });
  });

  const mapped = mapTransfer(await getTransferByIdRepo({ transferId }));

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.TRANSFER_APPROVED,
    entityType: "CATEGORY_BUDGET_TRANSFER",
    entityId: transferId,
    payload: buildTransferNotificationPayload(mapped, actorUserId),
  });

  return mapped;
}

export async function rejectTransferService({ transferId, note, actorUserId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    TRANSFER_PERMISSIONS.APPROVE,
    "You do not have permission to reject category transfers",
  );

  await withTransaction(async (transaction) => {
    const transfer = await getTransferByIdRepo({ transferId }, transaction);
    if (!transfer) throw new ApiError(404, "Transfer not found", "TRANSFER_NOT_FOUND");
    if (transfer.status !== TRANSFER_STATUS.PENDING_APPROVAL) {
      throw new ApiError(400, "Only pending transfers can be rejected", "TRANSFER_STATUS_INVALID");
    }

    const affected = await rejectTransferRepo(transaction, {
      transfer_id: transferId,
      actor_user_id: actorUserId,
      actor_user_role_id: getActorRoleId(budgetAccess),
      reason: note,
    });
    if (!affected) throw new ApiError(409, "Transfer changed before rejection", "TRANSFER_CONFLICT");

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: transfer.financial_year_id,
      entity_type: "CATEGORY_BUDGET_TRANSFER",
      entity_id: transferId,
      action: "CATEGORY_TRANSFER_REJECTED",
      old_status: TRANSFER_STATUS.PENDING_APPROVAL,
      new_status: TRANSFER_STATUS.REJECTED,
      note,
      user_role_id: getActorRoleId(budgetAccess),
      acting_workspace: budgetAccess?.workspaceType ?? null,
      created_by: actorUserId,
    });
  });

  const mapped = mapTransfer(await getTransferByIdRepo({ transferId }));

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.TRANSFER_REJECTED,
    entityType: "CATEGORY_BUDGET_TRANSFER",
    entityId: transferId,
    payload: buildTransferNotificationPayload(mapped, actorUserId, note),
  });

  return mapped;
}

export async function getTransferDashboardService({ actorUserId, budgetAccess }) {
  const canApprove = hasPermission(budgetAccess, TRANSFER_PERMISSIONS.APPROVE);
  const canCreate = hasPermission(budgetAccess, TRANSFER_PERMISSIONS.CREATE);

  if (canApprove) {
    return {
      mode: "APPROVER_PENDING",
      requests: (await listTransfersRepo({ status: TRANSFER_STATUS.PENDING_APPROVAL })).map(mapTransfer),
    };
  }

  if (canCreate) {
    const categoryId = assertCategoryScope(budgetAccess);
    return {
      mode: "REQUESTER_HISTORY",
      requests: (
        await listTransfersRepo({
          budgetCategoryId: categoryId,
          requestedBy: actorUserId,
        })
      ).map(mapTransfer),
    };
  }

  return { mode: "NONE", requests: [] };
}
