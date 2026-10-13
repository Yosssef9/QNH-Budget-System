import { describe, expect, it } from "vitest";
import { mapPackageItem } from "../../../modules/category-packages/categoryPackages.mapper.js";

const baseRow = {
  id: 42,
  category_budget_package_id: 4,
  catalog_item_id: 18,
  catalog_item_name: "Abduction/Adduction Machine",
  requested_quantity: 22,
  approved_quantity: 22,
  allocated_quantity: 22,
  active_sub_item_count: 1,
  needs_reconciliation: false,
};

describe("mapPackageItem model price summary", () => {
  it("uses the SQL aggregate for the package list, not an empty sub-item array", () => {
    const item = mapPackageItem({
      ...baseRow,
      estimated_total: 0,
      category_manager_estimated_total: 66000,
      model_unit_prices_json: JSON.stringify([
        {
          id: 1,
          name: "General",
          category_manager_unit_price: 3000,
          unit_price: null,
        },
      ]),
    });

    expect(item.category_manager_estimated_total).toBe(66000);
    expect(item.estimated_total).toBe(0);
    expect(item.model_unit_prices).toEqual([
      { id: 1, name: "General", category_manager_unit_price: 3000, unit_price: null },
    ]);
    expect(item.reconciliation_status).toBe("RECONCILED");
  });

  it("preserves different prices and unset prices for multiple models", () => {
    const item = mapPackageItem({
      ...baseRow,
      active_sub_item_count: 3,
      category_manager_estimated_total: 24000,
      model_unit_prices_json: JSON.stringify([
        { id: 1, name: "General", category_manager_unit_price: 1000, unit_price: null },
        { id: 2, name: "Premium", category_manager_unit_price: 2000, unit_price: null },
        { id: 3, name: "Unpriced", category_manager_unit_price: null, unit_price: null },
      ]),
    });

    expect(item.model_unit_prices).toHaveLength(3);
    expect(item.model_unit_prices.map((model) => model.category_manager_unit_price)).toEqual([
      1000,
      2000,
      null,
    ]);
  });

  it("still calculates values from loaded sub-items for the detail API", () => {
    const item = mapPackageItem(baseRow, [
      { id: 1, name: "General", quantity: 12, category_manager_unit_price: 3000, unit_price: null },
      { id: 2, name: "Premium", quantity: 10, category_manager_unit_price: 4000, unit_price: null },
    ]);

    expect(item.category_manager_estimated_total).toBe(76000);
    expect(item.model_unit_prices).toHaveLength(2);
    expect(item.active_sub_item_count).toBe(2);
  });
});
