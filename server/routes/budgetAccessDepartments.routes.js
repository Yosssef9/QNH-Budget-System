import express from "express";
import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { getBudgetAccessDepartments } from "../controllers/budgetAccessDepartments.controller.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(verifyBudgetAccess);
router.use(requirePermission("can_manage_users"));

router.get("/", getBudgetAccessDepartments);

export default router;
