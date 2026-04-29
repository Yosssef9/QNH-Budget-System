import express from "express";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";

const router = express.Router();

router.get("/me", verifyPortalJwt, verifyBudgetAccess, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });
});

export default router;