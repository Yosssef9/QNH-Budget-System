import express from "express";
import {
  getProjectBudgetItemDetails,
  getProjectFilterOptions,
  getProjectBudgetItems,
} from "../controllers/projects.controller.js";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";

const router = express.Router();

router.use(verifyPortalJwt, verifyBudgetAccess);

router.get("/", getProjectBudgetItems);
router.get("/filter-options", getProjectFilterOptions);
router.get("/:budgetItemId", getProjectBudgetItemDetails);

export default router;
