import { describe, expect, it } from "vitest";
import { packagePriceStatus, scopePackageItem } from "../../../../client/src/components/category-packages/packageStage2Filters.js";

describe("Stage 2 rejected-item financial presentation", () => {
  it("keeps rejected request visible without an unpriced financial total", () => {
    const item = { id: 1, requested_quantity: 1, approved_quantity: 0, allocated_quantity: 0,
      catalog_expense_type: "OPEX", model_unit_prices: [{ quantity: 0, category_manager_unit_price: null }] };
    expect(packagePriceStatus(item)).toBe("NOT_REQUIRED");
    expect(scopePackageItem(item).view_estimated_value).toBe(0);
  });

  it("keeps positive approved items priced even with an unused unpriced model", () => {
    const item = { id: 2, approved_quantity: 3, allocated_quantity: 3,
      category_manager_estimated_total: 12000,
      model_unit_prices: [
        { quantity: 3, category_manager_unit_price: 4000 },
        { quantity: 0, category_manager_unit_price: null },
      ] };
    expect(packagePriceStatus(item)).toBe("PRICED");
    expect(scopePackageItem(item).view_estimated_value).toBe(12000);
  });

  it("still requires a price for an allocated model", () => {
    const item = { id: 3, approved_quantity: 4, allocated_quantity: 4,
      model_unit_prices: [{ quantity: 4, category_manager_unit_price: null }] };
    expect(packagePriceStatus(item)).toBe("MISSING");
    expect(scopePackageItem(item).view_estimated_value).toBeNull();
  });
});
