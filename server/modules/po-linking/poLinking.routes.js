import express from "express";

import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { requireBudgetPermission } from "../../shared/middleware/requireBudgetPermission.js";
import { PO_LINK_PERMISSIONS } from "./poLinking.constants.js";
import {
  approvePOLink,
  createManualPOItemMapping,
  createPOLink,
  getAvailablePOs,
  getMyPOLinks,
  getPODashboard,
  getPOBudgetItems,
  getPOItemMappings,
  getPackageItemOverallAveragePriceIntelligence,
  getPackageSubItemPOLinks,
  getPackageSubItemPriceIntelligence,
  getPOLinkById,
  getPOLinksForApproval,
  getPOSuggestions,
  getPOTransparency,
  rejectPOLink,
  searchBudgetTypesForMapping,
  searchPOItemsForMapping,
  setPOItemMappingStatus,
} from "./poLinking.controller.js";
import {
  getPOItemMappingCategories,
  getPOItemMappingCatalogItems,
  getPOItemMappingCatalogSubItems,
} from "../../controllers/poItemMappings.controller.js";

export const poLinkingRoutes = express.Router();

poLinkingRoutes.use(verifyPortalJwt);
poLinkingRoutes.use(resolveBudgetWorkspace);

poLinkingRoutes.get(
  "/available-pos",
  requireBudgetPermission(PO_LINK_PERMISSIONS.REQUEST),
  getAvailablePOs,
);

poLinkingRoutes.get("/dashboard", getPODashboard);

poLinkingRoutes.get(
  "/budget-items",
  requireBudgetPermission(PO_LINK_PERMISSIONS.REQUEST),
  getPOBudgetItems,
);

poLinkingRoutes.get(
  "/suggestions",
  requireBudgetPermission(PO_LINK_PERMISSIONS.REQUEST),
  getPOSuggestions,
);

poLinkingRoutes.get(
  "/my",
  requireBudgetPermission(PO_LINK_PERMISSIONS.REQUEST),
  getMyPOLinks,
);

poLinkingRoutes.get(
  "/",
  requireBudgetPermission(PO_LINK_PERMISSIONS.APPROVE),
  getPOLinksForApproval,
);

poLinkingRoutes.get(
  "/pending",
  requireBudgetPermission(PO_LINK_PERMISSIONS.APPROVE),
  getPOLinksForApproval,
);

poLinkingRoutes.post(
  "/",
  requireBudgetPermission(PO_LINK_PERMISSIONS.REQUEST),
  createPOLink,
);

poLinkingRoutes.get(
  "/package-sub-items/:packageSubItemId/links",
  getPackageSubItemPOLinks,
);

poLinkingRoutes.get(
  "/package-sub-items/:packageSubItemId/price-intelligence",
  getPackageSubItemPriceIntelligence,
);

poLinkingRoutes.get(
  "/package-sub-items/:packageSubItemId/price-intelligence/overall-average",
  getPackageItemOverallAveragePriceIntelligence,
);

poLinkingRoutes.get("/po/:id/transparency", getPOTransparency);
poLinkingRoutes.get("/:id", getPOLinkById);

poLinkingRoutes.post(
  "/:id/approve",
  requireBudgetPermission(PO_LINK_PERMISSIONS.APPROVE),
  approvePOLink,
);

poLinkingRoutes.post(
  "/:id/reject",
  requireBudgetPermission(PO_LINK_PERMISSIONS.APPROVE),
  rejectPOLink,
);

export const poItemMappingsRoutes = express.Router();

poItemMappingsRoutes.use(verifyPortalJwt);
poItemMappingsRoutes.use(resolveBudgetWorkspace);
poItemMappingsRoutes.use(requireBudgetPermission(PO_LINK_PERMISSIONS.MANAGE_MAPPINGS));

poItemMappingsRoutes.get("/", getPOItemMappings);
poItemMappingsRoutes.post("/", createManualPOItemMapping);
poItemMappingsRoutes.get("/categories", getPOItemMappingCategories);
poItemMappingsRoutes.get(
  "/categories/:categoryId/catalog-items",
  getPOItemMappingCatalogItems,
);
poItemMappingsRoutes.get(
  "/catalog-items/:itemId/sub-items",
  getPOItemMappingCatalogSubItems,
);
poItemMappingsRoutes.get("/budget-types", searchBudgetTypesForMapping);
poItemMappingsRoutes.get("/catalog-sub-items", getPOItemMappingCatalogSubItems);
poItemMappingsRoutes.get("/po-items", searchPOItemsForMapping);
poItemMappingsRoutes.patch("/:id/status", setPOItemMappingStatus);

export default poLinkingRoutes;
