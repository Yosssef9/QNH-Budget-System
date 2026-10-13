import { describe, expect, it } from "vitest";

import {
  buildApprovedDistribution,
  isCountableUnit,
} from "../../../utils/approvedDistribution.js";

describe("approvedDistribution", () => {
  it("keeps countable-item distributions as whole numbers and exact totals", () => {
    const distribution = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      period_type: "MONTH",
      period_no: index + 1,
      quantity: 1,
    }));

    const approved = buildApprovedDistribution({
      distribution,
      requestedQuantity: 12,
      approvedQuantity: 10,
      unitCode: "UNIT",
      unitName: "Unit",
    });

    expect(approved.reduce((sum, row) => sum + row.quantity, 0)).toBe(10);
    expect(approved.every((row) => Number.isInteger(row.quantity))).toBe(true);
    expect(approved.filter((row) => row.quantity === 1)).toHaveLength(10);
    expect(approved.filter((row) => row.quantity === 0)).toHaveLength(2);
  });

  it("preserves a weighted timing pattern when reducing a countable item", () => {
    const approved = buildApprovedDistribution({
      distribution: [
        { id: 1, period_type: "MONTH", period_no: 1, quantity: 4 },
        { id: 2, period_type: "MONTH", period_no: 2, quantity: 2 },
        { id: 3, period_type: "MONTH", period_no: 3, quantity: 1 },
        { id: 4, period_type: "MONTH", period_no: 4, quantity: 5 },
      ],
      requestedQuantity: 12,
      approvedQuantity: 10,
      unitName: "Unit",
    });

    expect(approved.map((row) => row.quantity)).toEqual([3, 2, 1, 4]);
  });

  it("retains decimal precision for non-countable units", () => {
    const approved = buildApprovedDistribution({
      distribution: [
        { id: 1, period_type: "MONTH", period_no: 1, quantity: 1 },
        { id: 2, period_type: "MONTH", period_no: 2, quantity: 2 },
      ],
      requestedQuantity: 3,
      approvedQuantity: 2.5,
      unitName: "Kilogram",
    });

    expect(approved.map((row) => row.quantity)).toEqual([0.8333, 1.6667]);
    expect(approved.reduce((sum, row) => sum + row.quantity, 0)).toBe(2.5);
  });

  it("recognizes common countable unit labels", () => {
    expect(isCountableUnit({ unitCode: "UNIT" })).toBe(true);
    expect(isCountableUnit({ unitName: "License" })).toBe(true);
    expect(isCountableUnit({ unitName: "Contract" })).toBe(true);
    expect(isCountableUnit({ unitName: "Kilogram" })).toBe(false);
  });
});

