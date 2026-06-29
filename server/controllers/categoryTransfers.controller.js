import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { auditLog } from "../utils/audit.js";
import {
  approveCategoryTransferService,
  createCategoryTransferService,
  getCategoryTransferDetailsService,
  getEligibleCategoryTransferItemsService,
  getMyCategoryTransfersService,
  getPendingCategoryTransfersForCfoService,
  rejectCategoryTransferService,
} from "../services/categoryTransfers.service.js";
import {
  validateCategoryTransferCreatePayload,
  validateCategoryTransferRejectPayload,
  validateCategoryTransferStatus,
  validateTransferId,
} from "../validators/categoryTransfers.validator.js";

export const getEligibleCategoryTransferItems = asyncHandler(
  async (req, res) => {
    const data = await getEligibleCategoryTransferItemsService({
      budgetAccess: req.budgetAccess,
    });

    return res.json(
      new ApiResponse({
        message: "Eligible category transfer items fetched successfully",
        data,
      }),
    );
  },
);

export const createCategoryTransfer = asyncHandler(async (req, res) => {
  const payload = validateCategoryTransferCreatePayload(req.body);
  const data = await createCategoryTransferService({
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CREATE_CATEGORY_TRANSFER",
    entityType: "CATEGORY_TRANSFER",
    entityId: String(data.transfer.id),
    entityName: "Category Budget Transfer",
    description: "Created category budget transfer request",
    newValues: data,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Category transfer request created successfully",
      data,
    }),
  );
});

export const getMyCategoryTransfers = asyncHandler(async (req, res) => {
  const status = validateCategoryTransferStatus(req.query.status);
  const data = await getMyCategoryTransfersService({
    status,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category transfers fetched successfully",
      data,
    }),
  );
});

export const getPendingCategoryTransfersForCfo = asyncHandler(
  async (req, res) => {
    const status = validateCategoryTransferStatus(
      req.query.status || "PENDING_APPROVAL",
    );
    const data = await getPendingCategoryTransfersForCfoService({
      status,
      budgetAccess: req.budgetAccess,
    });

    return res.json(
      new ApiResponse({
        message: "CFO category transfers fetched successfully",
        data,
      }),
    );
  },
);

export const getCategoryTransferDetails = asyncHandler(async (req, res) => {
  const transferId = validateTransferId(req.params.transferId);
  const data = await getCategoryTransferDetailsService({
    transferId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category transfer details fetched successfully",
      data,
    }),
  );
});

export const approveCategoryTransfer = asyncHandler(async (req, res) => {
  const transferId = validateTransferId(req.params.transferId);
  const data = await approveCategoryTransferService({
    transferId,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "APPROVE_CATEGORY_TRANSFER",
    entityType: "CATEGORY_TRANSFER",
    entityId: String(transferId),
    entityName: "Category Budget Transfer",
    description: "Approved category budget transfer request",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Category transfer approved successfully",
      data,
    }),
  );
});

export const rejectCategoryTransfer = asyncHandler(async (req, res) => {
  const transferId = validateTransferId(req.params.transferId);
  const payload = validateCategoryTransferRejectPayload(req.body);
  const data = await rejectCategoryTransferService({
    transferId,
    payload,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "REJECT_CATEGORY_TRANSFER",
    entityType: "CATEGORY_TRANSFER",
    entityId: String(transferId),
    entityName: "Category Budget Transfer",
    description: "Rejected category budget transfer request",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Category transfer rejected successfully",
      data,
    }),
  );
});
