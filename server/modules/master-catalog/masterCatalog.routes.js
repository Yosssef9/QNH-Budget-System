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
 * All Master Catalog routes require an authenticated Portal user
 * and a resolved active Budget workspace.
 */
router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);

/*
 * Shared operational catalog routes.
 *
 * These routes are required outside the Catalog Administration page.
 * Access permissions and category scope must be validated by the
 * Master Catalog service layer.
 */

/*
 * Categories lookup
 */
router.get("/categories", getCategories);

/*
 * Catalog items lookup by category
 */
router.get("/categories/:categoryId/catalog-items", getCatalogItemsByCategory);

/*
 * Units of measure lookup.
 *
 * Category Managers need this endpoint when creating reusable
 * catalog sub-items from the Category Package Workbench.
 */
router.get("/units-of-measure", getUnits);

/*
 * Reusable catalog sub-items lookup.
 *
 * Category Managers need this endpoint to populate the reusable
 * model dropdown for the selected generic package item.
 */
router.get("/catalog-items/:itemId/sub-items", getSubItemsByCatalogItem);

/*
 * Reusable catalog sub-item creation.
 *
 * Category Managers may use this endpoint only when:
 *
 * - They have can_manage_category_budget_sub_items.
 * - Their active workspace is CATEGORY.
 * - The parent catalog item belongs to their assigned category.
 *
 * Catalog Administrators may continue to create sub-items for any
 * catalog item.
 *
 * These checks must be enforced in the service layer.
 */
router.post("/catalog-items/:itemId/sub-items", createSubItem);

/*
 * Master Catalog administration boundary.
 *
 * Every route declared below this middleware requires:
 *
 * can_manage_budget_catalog
 */
router.use(requireBudgetPermission(MASTER_CATALOG_PERMISSION));

/*
 * Complete catalog-item lookup for Catalog Administration.
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
 * Generic Catalog Item administration
 */
router.post("/categories/:categoryId/catalog-items", createCatalogItem);

router.patch("/catalog-items/:itemId", updateCatalogItem);

router.patch("/catalog-items/:itemId/status", updateCatalogItemStatus);

router.get("/catalog-items/:itemId/usage", getCatalogItemUsage);

/*
 * Existing reusable Catalog Sub-Item administration.
 *
 * Updating an existing reusable model and changing its active
 * status remain Catalog Administrator actions.
 */
router.patch("/catalog-sub-items/:subItemId", updateSubItem);

router.patch("/catalog-sub-items/:subItemId/status", updateSubItemStatus);

export default router;
