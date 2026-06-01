import {
  createTransferService,
  getTransfersService,
  approveTransferService,
  rejectTransferService,
  getTransferByIdService,
} from "../services/transfer.service.js";

import { auditLog } from "../utils/audit.js";
export async function createTransfer(req, res, next) {
  try {
    const result = await createTransferService({
      ...req.body,
      userId: req.user?.user_id || req.user?.id || 2410,
    });
    await auditLog(req, {
      action: "CREATE_TRANSFER",
      entityName: `Transfer ${result.id}`,
      entityType: "TRANSFER",
      entityId: String(result.id),
      description: `Created transfer request for ${result.amount} SAR`,
      newValues: {
        from_budget_item_id: result.from_budget_item_id,
        to_budget_item_id: result.to_budget_item_id,
        amount: result.amount,
        status: result.status,
      },
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTransfers(req, res, next) {
  try {
    const result = await getTransfersService();

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function approveTransfer(req, res, next) {
  try {
    const result = await approveTransferService(
      req.params.id,
      req.user?.user_id || 2410,
    );
    await auditLog(req, {
      action: "APPROVE_TRANSFER",
      entityName: `Transfer ${result.id}`,
      entityType: "TRANSFER",
      entityId: String(result.id),
      description: `Approved transfer #${result.id}`,
      newValues: {
        status: "APPROVED",
        approved_by: result.approved_by,
      },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function rejectTransfer(req, res, next) {
  try {
    const result = await rejectTransferService(
      req.params.id,
      req.user?.user_id || 2410,
      req.body.note,
    );
    await auditLog(req, {
      action: "REJECT_TRANSFER",
      entityName: `Transfer ${result.id}`,
      entityType: "TRANSFER",
      entityId: String(result.id),
      description: `Rejected transfer #${result.id}`,
      newValues: {
        status: "REJECTED",
        rejection_note: result.rejection_note,
      },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
export async function getPendingTransfers(req, res, next) {
  try {
    const result = await getPendingTransfersService();

    res.json(result);
  } catch (err) {
    next(err);
  }
}
export async function getTransferById(req, res, next) {
  try {
    const result = await getTransferByIdService(req.params.id);

    res.json(result);
  } catch (err) {
    next(err);
  }
}
