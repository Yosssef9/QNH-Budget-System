import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";

import { MASTER_CATALOG_PERMISSION } from "./masterCatalog.constants.js";

import {
  createCatalogItem,
  createCategory,
  createSubItem,
  deleteCategory,
  getAllCatalogItems,
  getCatalogItemsByCategory,
  getCatalogItemUsage,
  getCategories,
  getCategoryUsage,
  getSubItemsByCatalogItem,
  getUnits,
  updateCatalogItem,
  updateCatalogItemStatus,
  updateCategory,
  updateSubItem,
  updateSubItemStatus,
} from "./masterCatalog.controller.js";

const router = express.Router();

/*
 * Every Master Catalog request requires:
 *
 * 1. An authenticated Portal user.
 * 2. A valid active Budget workspace.
 */
router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

/*
 * Operational catalog lookup.
 *
 * These endpoints are also required outside the Budget Setup administration
 * page, such as when Department users choose catalog items while preparing
 * their category budgets.
 *
 * Access and category scope are validated by the service layer:
 *
 * Department workspace:
 * - Can read all active categories.
 * - Can read active items from all three categories.
 *
 * Category workspace:
 * - Can read only its assigned category.
 * - Can read items only from its assigned category.
 *
 * Master Catalog administrator:
 * - Can read all categories and items.
 */
router.get("/categories", getCategories);

router.get("/categories/:categoryId/catalog-items", getCatalogItemsByCategory);

/*
 * Master Catalog administration boundary.
 *
 * Every route registered below this middleware requires:
 *
 * can_manage_budget_catalog
 */
router.use(requireBudgetPermission(MASTER_CATALOG_PERMISSION));

/*
 * Units of Measure
 */
router.get("/units-of-measure", getUnits);

/*
 * Complete catalog item lookup for the Budget Setup administration page.
 */
router.get("/catalog-items", getAllCatalogItems);

/*
 * Budget Category administration
 */
router.post("/categories", createCategory);

router.patch("/categories/:categoryId", updateCategory);

router.delete("/categories/:categoryId", deleteCategory);

router.get("/categories/:categoryId/usage", getCategoryUsage);

/*
 * Catalog Item administration
 */
router.post("/categories/:categoryId/catalog-items", createCatalogItem);

router.patch("/catalog-items/:itemId", updateCatalogItem);

router.patch("/catalog-items/:itemId/status", updateCatalogItemStatus);

router.get("/catalog-items/:itemId/usage", getCatalogItemUsage);

/*
 * Reusable Catalog Sub-Item administration
 */
router.get("/catalog-items/:itemId/sub-items", getSubItemsByCatalogItem);

router.post("/catalog-items/:itemId/sub-items", createSubItem);

router.patch("/catalog-sub-items/:subItemId", updateSubItem);

router.patch("/catalog-sub-items/:subItemId/status", updateSubItemStatus);

export default router;
