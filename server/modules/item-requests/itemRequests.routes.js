import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { ITEM_REQUEST_ADMIN_PERMISSION } from "./itemRequests.constants.js";
import {
  approveAndCreateItemRequest,
  approveItemRequest,
  createItemRequest,
  getDashboardItemRequests,
  getItemRequests,
  rejectItemRequest,
} from "./itemRequests.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get("/dashboard", getDashboardItemRequests);
router.post("/", createItemRequest);

router.use(requireBudgetPermission(ITEM_REQUEST_ADMIN_PERMISSION));

router.get("/", getItemRequests);
router.post("/:requestId/approve", approveItemRequest);
router.post("/:requestId/approve-manual", approveItemRequest);
router.post("/:requestId/approve-and-create", approveAndCreateItemRequest);
router.post("/:requestId/reject", rejectItemRequest);

export default router;
