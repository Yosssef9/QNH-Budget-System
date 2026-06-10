import {
  createTransferService,
  getTransfersService,
  approveTransferService,
  rejectTransferService,
  getTransferByIdService,
  getTransferItemsService,
  getMyTransfersService,
  getTransferDashboardService,
} from "../services/transfer.service.js";

import { auditLog } from "../utils/audit.js";
import { ApiResponse } from "../utils/apiResponse.js";
export async function createTransfer(req, res, next) {
  try {
    const result = await createTransferService({
      ...req.body,
      user: req.user,
    });

    await auditLog(req, {
      action: "CREATE_TRANSFER",
      entityName: `Transfer ${result.id}`,
      entityType: "TRANSFER",
      entityId: String(result.id),
      description: `Created transfer request for ${result.amount} SAR`,
      newValues: result,
    });

    return res.status(201).json(
      new ApiResponse({
        message: "Transfer request created successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getTransfers(req, res, next) {
  try {
    const result = await getTransfersService(
      req.query.status,
      req.query.financialYearId ? Number(req.query.financialYearId) : null,
    );

    return res.json(
      new ApiResponse({
        message: "Transfers fetched successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function approveTransfer(req, res, next) {
  try {
    const result = await approveTransferService(req.params.id, req.user);

    await auditLog(req, {
      action: "APPROVE_TRANSFER",
      entityName: `Transfer ${result.id}`,
      entityType: "TRANSFER",
      entityId: String(result.id),
      description: `Approved transfer #${result.id}`,
      newValues: result,
    });

    return res.json(
      new ApiResponse({
        message: "Transfer approved successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function rejectTransfer(req, res, next) {
  try {
    const result = await rejectTransferService(
      req.params.id,
      req.user,
      req.body.note,
    );

    await auditLog(req, {
      action: "REJECT_TRANSFER",
      entityName: `Transfer ${result.id}`,
      entityType: "TRANSFER",
      entityId: String(result.id),
      description: `Rejected transfer #${result.id}`,
      newValues: result,
    });

    return res.json(
      new ApiResponse({
        message: "Transfer rejected successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getTransferById(req, res, next) {
  try {
    const result = await getTransferByIdService(req.params.id);

    return res.json(
      new ApiResponse({
        message: "Transfer fetched successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getTransferItems(req, res, next) {
  try {
    const result = await getTransferItemsService({
      budgetAccess: req.budgetAccess,
    });

    return res.json(
      new ApiResponse({
        message: "Transfer items fetched successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getMyTransfers(req, res, next) {
  try {
    const result = await getMyTransfersService(
      req.user.userId,
      req.query.financialYearId ? Number(req.query.financialYearId) : null,
    );

    return res.json(
      new ApiResponse({
        message: "My transfers fetched successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getTransferDashboard(req, res, next) {
  try {
    const data = await getTransferDashboardService(
      req.user.userId,
      req.budgetAccess?.department?.id,
      req.budgetAccess?.permissions?.can_approve_transfer === true,
    );

    return res.json(
      new ApiResponse({
        message: "Transfer dashboard fetched successfully",
        data,
      }),
    );
  } catch (err) {
    next(err);
  }
}
