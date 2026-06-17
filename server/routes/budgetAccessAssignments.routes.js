import express from "express";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import {
  getBudgetAccessAssignments,
  createBudgetAccessAssignment,
  updateBudgetAccessAssignment,
  updateBudgetAccessAssignmentStatus,
  deleteBudgetAccessAssignment,
} from "../controllers/budgetAccessAssignments.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(verifyBudgetAccess);
router.use(requirePermission("can_manage_users"));

router.get("/", getBudgetAccessAssignments);
router.post("/", createBudgetAccessAssignment);
router.put("/:id", updateBudgetAccessAssignment);
router.patch("/:id/status", updateBudgetAccessAssignmentStatus);
router.delete("/:id", deleteBudgetAccessAssignment);

export default router;
