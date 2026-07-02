import express from "express";
import { verifyPortalJwt } from "../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace as verifyBudgetAccess } from "../shared/middleware/resolveBudgetWorkspace.js";

const router = express.Router();

router.get("/me", verifyPortalJwt, verifyBudgetAccess, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });
});

export default router;
