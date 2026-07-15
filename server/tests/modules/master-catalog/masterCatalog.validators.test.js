import { describe, expect, it } from "vitest";

import { validateCreateCatalogItem } from "../../../modules/master-catalog/masterCatalog.validators.js";

describe("master catalog validators", () => {
  it("requires unit_of_measure_id when creating a catalog item", () => {
    expect(() =>
      validateCreateCatalogItem({
        name: "Laptop",
        expense_type: "CAPEX",
      }),
    ).toThrow("unit_of_measure_id is required");
  });

  it("rejects malformed unit_of_measure_id when creating a catalog item", () => {
    expect(() =>
      validateCreateCatalogItem({
        name: "Laptop",
        expense_type: "CAPEX",
        unit_of_measure_id: "abc",
      }),
    ).toThrow("unit_of_measure_id must be a positive integer");
  });

  it("accepts an active unit ID value shape for catalog item creation", () => {
    expect(
      validateCreateCatalogItem({
        name: "Laptop",
        expense_type: "CAPEX",
        unit_of_measure_id: "2",
      }),
    ).toEqual(
      expect.objectContaining({
        unit_of_measure_id: 2,
      }),
    );
  });
});
