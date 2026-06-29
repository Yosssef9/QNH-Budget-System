import express from "express";
import {
  applyBudgetChangeRequest,
  createBudgetChangeRequest,
  decideCategoryBudgetChangeRequest,
  decideCfoBudgetChangeRequest,
  getBudgetChangeRequestDetails,
  getCategoryBudgetChangeRequests,
  getCfoBudgetChangeRequests,
  getMyBudgetChangeRequests,
} from "../controllers/budgetChangeRequests.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.post("/", requirePermission("can_edit_budget"), createBudgetChangeRequest);
router.get("/my", requirePermission("can_view_budget"), getMyBudgetChangeRequests);
router.get(
  "/category",
  getCategoryBudgetChangeRequests,
);
router.get(
  "/cfo",
  requirePermission("can_approve_budget"),
  getCfoBudgetChangeRequests,
);
router.get("/:requestId", getBudgetChangeRequestDetails);
router.patch(
  "/:requestId/category-decision",
  decideCategoryBudgetChangeRequest,
);
router.patch(
  "/:requestId/cfo-decision",
  requirePermission("can_approve_budget"),
  decideCfoBudgetChangeRequest,
);
router.patch(
  "/:requestId/apply",
  applyBudgetChangeRequest,
);

export default router;
