import express from "express";

import {
  getTransferItems,
  getAvailableTransferTypes,
} from "../controllers/budgetItem.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get(
  "/transfer-items",
  requirePermission("can_edit_budget"),
  getTransferItems,
);

router.get(
  "/available-transfer-types",
  requirePermission("can_edit_budget"),
  getAvailableTransferTypes,
);

export default router;
