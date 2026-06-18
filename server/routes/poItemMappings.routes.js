import express from "express";

import {
  createManualPOItemMapping,
  getPOItemMappings,
  searchBudgetTypesForMapping,
  searchPOItemsForMapping,
  setPOItemMappingStatus,
} from "../controllers/poItemMappings.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(verifyBudgetAccess);
router.use(requirePermission("can_manage_po_item_mappings"));

router.get("/", getPOItemMappings);
router.post("/", createManualPOItemMapping);
router.get("/budget-types", searchBudgetTypesForMapping);
router.get("/po-items", searchPOItemsForMapping);
router.patch("/:id/status", setPOItemMappingStatus);

export default router;
