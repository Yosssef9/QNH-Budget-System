import express from "express";
import {
  createBudgetSubItem,
  deactivateBudgetSubItem,
  getBudgetSubItems,
  updateBudgetSubItem,
} from "../controllers/budgetSubItems.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get("/", getBudgetSubItems);
router.post("/", createBudgetSubItem);
router.patch("/:subItemId", updateBudgetSubItem);
router.delete("/:subItemId", deactivateBudgetSubItem);

export default router;
