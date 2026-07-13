import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { TRANSFER_PERMISSIONS } from "./transfers.constants.js";
import {
  approveTransfer,
  createTransfer,
  getMyTransfers,
  getTransferById,
  getTransferCatalogOptions,
  getTransferCatalogSubItems,
  getTransferDashboard,
  getTransferItems,
  getTransfers,
  rejectTransfer,
} from "./transfers.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get("/dashboard", getTransferDashboard);

router.get(
  "/items",
  requireBudgetPermission(TRANSFER_PERMISSIONS.CREATE),
  getTransferItems,
);

router.get(
  "/catalog-items",
  requireBudgetPermission(TRANSFER_PERMISSIONS.CREATE),
  getTransferCatalogOptions,
);

router.get(
  "/catalog-items/:catalogItemId/sub-items",
  requireBudgetPermission(TRANSFER_PERMISSIONS.CREATE),
  getTransferCatalogSubItems,
);

router.get(
  "/my",
  requireBudgetPermission(TRANSFER_PERMISSIONS.CREATE),
  getMyTransfers,
);

router.get(
  "/",
  requireBudgetPermission(TRANSFER_PERMISSIONS.APPROVE),
  getTransfers,
);

router.get("/:id", getTransferById);

router.post(
  "/",
  requireBudgetPermission(TRANSFER_PERMISSIONS.CREATE),
  createTransfer,
);

router.post(
  "/:id/approve",
  requireBudgetPermission(TRANSFER_PERMISSIONS.APPROVE),
  approveTransfer,
);

router.post(
  "/:id/reject",
  requireBudgetPermission(TRANSFER_PERMISSIONS.APPROVE),
  rejectTransfer,
);

export default router;
