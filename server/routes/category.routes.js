import express from "express";
import {
  createCategory,
  createType,
  getCategories,
  getTypesByCategory,
  updateCategory,
  updateType,
  deleteCategory,
  deleteType,
  getCategoryUsage,
  getTypeUsage,
  getAllTypes,
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

router.patch(
  "/:categoryId",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  updateCategory,
);
router.get("/types/all", verifyPortalJwt, verifyBudgetAccess, getAllTypes);
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

router.patch(
  "/:categoryId/types/:typeId",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  updateType,
);

router.get(
  "/:categoryId/usage",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  getCategoryUsage,
);

router.delete(
  "/:categoryId",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  deleteCategory,
);

router.get(
  "/:categoryId/types/:typeId/usage",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  getTypeUsage,
);

router.delete(
  "/:categoryId/types/:typeId",
  verifyPortalJwt,
  verifyBudgetAccess,
  requirePermission("can_manage_categories"),
  deleteType,
);

export default router;
