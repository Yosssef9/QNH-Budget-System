import { describe, expect, it } from "vitest";

import {
  PRICE_INTELLIGENCE_STATUS,
  buildPackageItemOverallAveragePriceIntelligence,
} from "../../helpers/priceIntelligence.helper.js";

function model({
  id,
  name,
  quantity,
  unitPrice,
  benchmark,
  averageUnitCost,
  minUnitCost,
  maxUnitCost,
  lastPurchaseUnitCost,
  potentialImpact,
  potentialOverspend,
}) {
  return {
    packageSubItem: {
      package_sub_item_id: id,
      sub_item_name: name,
      quantity,
      unit_price: unitPrice,
    },
    priceIntelligence: {
      historical_benchmark: benchmark,
      average_unit_cost: averageUnitCost,
      min_unit_cost: minUnitCost,
      max_unit_cost: maxUnitCost,
      last_purchase_unit_cost: lastPurchaseUnitCost,
      potential_impact: potentialImpact,
      potential_overspend: potentialOverspend,
    },
  };
}

describe("buildPackageItemOverallAveragePriceIntelligence", () => {
  it("uses an equal-weight average and ignores model quantities", () => {
    const result = buildPackageItemOverallAveragePriceIntelligence(
      { id: 50 },
      [
        model({
          id: 1,
          name: "HP",
          quantity: 100,
          unitPrice: 120,
          benchmark: 100,
          averageUnitCost: 105,
          minUnitCost: 90,
          maxUnitCost: 125,
          lastPurchaseUnitCost: 110,
          potentialImpact: 2000,
          potentialOverspend: 2000,
        }),
        model({
          id: 2,
          name: "Dell",
          quantity: 1,
          unitPrice: 220,
          benchmark: 200,
          averageUnitCost: 205,
          minUnitCost: 180,
          maxUnitCost: 230,
          lastPurchaseUnitCost: 210,
          potentialImpact: 20,
          potentialOverspend: 20,
        }),
        model({
          id: 3,
          name: "General",
          quantity: 500,
          unitPrice: 90,
          benchmark: null,
          averageUnitCost: null,
          minUnitCost: null,
          maxUnitCost: null,
          lastPurchaseUnitCost: null,
          potentialImpact: null,
          potentialOverspend: 0,
        }),
      ],
      {
        purchase_count: 12,
        supplier_count: 3,
        mapped_item_codes: ["HP-1", "DELL-1"],
        last_purchase_at: new Date().toISOString(),
      },
    );

    expect(result.overall_average_benchmark).toBe(150);
    expect(result.average_current_unit_price).toBe(143.3333);
    expect(result.comparable_average_current_unit_price).toBe(170);
    expect(result.comparable_average_benchmark).toBe(150);
    expect(result.variance_amount).toBe(20);
    expect(result.variance_percent).toBe(13.33);
    expect(result.benchmarked_model_count).toBe(2);
    expect(result.model_count).toBe(3);
    expect(result.benchmark_coverage_percent).toBe(66.67);
    expect(result.is_partial_coverage).toBe(true);
    expect(result.status).toBe(
      PRICE_INTELLIGENCE_STATUS.REVIEW_PRICE,
    );
  });

  it("returns no benchmark status when no model has usable evidence", () => {
    const result = buildPackageItemOverallAveragePriceIntelligence(
      { id: 51 },
      [
        model({
          id: 1,
          name: "General",
          quantity: 5,
          unitPrice: 100,
          benchmark: null,
          potentialOverspend: 0,
        }),
      ],
    );

    expect(result.overall_average_benchmark).toBeNull();
    expect(result.comparable_average_current_unit_price).toBeNull();
    expect(result.variance_amount).toBeNull();
    expect(result.variance_percent).toBeNull();
    expect(result.benchmark_coverage_percent).toBe(0);
    expect(result.status).toBe(
      PRICE_INTELLIGENCE_STATUS.NO_BENCHMARK_AVAILABLE,
    );
  });
});
