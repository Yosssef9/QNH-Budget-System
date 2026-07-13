import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { auditLog } from "../../utils/audit.js";
import {
  approveTransferService,
  createTransferService,
  getMyTransfersService,
  getTransferByIdService,
  getTransferCatalogOptionsService,
  getTransferCatalogSubItemsService,
  getTransferDashboardService,
  getTransferItemsService,
  getTransfersService,
  rejectTransferService,
} from "./transfers.service.js";
import {
  validateCreateTransferPayload,
  validateListTransfersQuery,
  validateRejectTransferPayload,
  validateTransferId,
} from "./transfers.validators.js";

export const getTransferItems = asyncHandler(async (req, res) => {
  const data = await getTransferItemsService({ budgetAccess: req.budgetAccess });
  res.json(new ApiResponse({ message: "Transfer items fetched", data }));
});

export const getTransferCatalogOptions = asyncHandler(async (req, res) => {
  const data = await getTransferCatalogOptionsService({
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Transfer catalog items fetched", data }));
});

export const getTransferCatalogSubItems = asyncHandler(async (req, res) => {
  const data = await getTransferCatalogSubItemsService({
    catalogItemId: validateTransferId(req.params.catalogItemId),
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Transfer models fetched", data }));
});

export const createTransfer = asyncHandler(async (req, res) => {
  const payload = validateCreateTransferPayload(req.body);
  const data = await createTransferService({
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CREATE_CATEGORY_TRANSFER",
    entityType: "CATEGORY_BUDGET_TRANSFER",
    entityId: String(data.id),
    entityName: `Category Transfer ${data.id}`,
    description: "Created category transfer request",
    newValues: data,
  });

  res.status(201).json(new ApiResponse({ message: "Transfer request created", data }));
});

export const getTransfers = asyncHandler(async (req, res) => {
  const query = validateListTransfersQuery(req.query);
  const data = await getTransfersService({ query, budgetAccess: req.budgetAccess });
  res.json(new ApiResponse({ message: "Transfers fetched", data }));
});

export const getMyTransfers = asyncHandler(async (req, res) => {
  const data = await getMyTransfersService({
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "My transfers fetched", data }));
});

export const getTransferById = asyncHandler(async (req, res) => {
  const data = await getTransferByIdService({
    transferId: validateTransferId(req.params.id),
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Transfer fetched", data }));
});

export const approveTransfer = asyncHandler(async (req, res) => {
  const data = await approveTransferService({
    transferId: validateTransferId(req.params.id),
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Transfer approved", data }));
});

export const rejectTransfer = asyncHandler(async (req, res) => {
  const payload = validateRejectTransferPayload(req.body);
  const data = await rejectTransferService({
    transferId: validateTransferId(req.params.id),
    note: payload.note,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Transfer rejected", data }));
});

export const getTransferDashboard = asyncHandler(async (req, res) => {
  const data = await getTransferDashboardService({
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });
  res.json(new ApiResponse({ message: "Transfer dashboard fetched", data }));
});
