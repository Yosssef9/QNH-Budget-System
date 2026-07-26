import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { verifyPortalJwt } from "../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../shared/middleware/resolveBudgetWorkspace.js";

const router = express.Router();

router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

router.get("/stats", getDashboardStats);

export default router;
