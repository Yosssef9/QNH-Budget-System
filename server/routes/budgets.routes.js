import express from "express";
import { getMyBudgets } from "../controllers/budgets.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";

const router = express.Router();

// Get my budgets (HOD / Admin / Approver)
router.get(
  "/my",
  verifyPortalJwt,
  verifyBudgetAccess,
  getMyBudgets
);

export default router;