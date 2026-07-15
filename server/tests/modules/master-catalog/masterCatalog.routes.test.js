import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("master catalog routes", () => {
  it("keeps operational lookup routes before the catalog administration permission boundary", () => {
    const source = readFileSync(
      resolve("modules/master-catalog/masterCatalog.routes.js"),
      "utf8",
    );

    const categoriesLookupIndex = source.indexOf(
      'router.get("/categories", getCategories)',
    );
    const itemsLookupIndex = source.indexOf(
      'router.get("/categories/:categoryId/catalog-items", getCatalogItemsByCategory)',
    );
    const managementBoundaryIndex = source.indexOf(
      "router.use(requireBudgetPermission(MASTER_CATALOG_PERMISSION))",
    );
    const createCategoryIndex = source.indexOf(
      'router.post("/categories", createCategory)',
    );

    expect(categoriesLookupIndex).toBeGreaterThan(-1);
    expect(itemsLookupIndex).toBeGreaterThan(-1);
    expect(managementBoundaryIndex).toBeGreaterThan(-1);
    expect(createCategoryIndex).toBeGreaterThan(-1);
    expect(categoriesLookupIndex).toBeLessThan(managementBoundaryIndex);
    expect(itemsLookupIndex).toBeLessThan(managementBoundaryIndex);
    expect(createCategoryIndex).toBeGreaterThan(managementBoundaryIndex);
  });
});
