import express from "express";
import {
  createCategory,
  createType,
  getCategories,
  getTypesByCategory,
} from "../controllers/category.controller.js";

import { verifyPortalJwt } from "../middleware/verifyPortalJwt.middleware.js";
import { verifyBudgetAccess } from "../middleware/verifyBudgetAccess.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get("/", verifyPortalJwt, verifyBudgetAccess, getCategories);

router.post(
  "/",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  createCategory,
);

router.get(
  "/:categoryId/types",
  verifyPortalJwt,
  verifyBudgetAccess,
  getTypesByCategory,
);

router.post(
  "/:categoryId/types",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  createType,
);

export default router;
