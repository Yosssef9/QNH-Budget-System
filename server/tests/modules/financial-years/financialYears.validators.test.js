import { describe, expect, it } from "vitest";
import {
  validateCreateFinancialYear,
  validateFinancialYearId,
} from "../../../modules/financial-years/financialYears.validators.js";

describe("financial years validators", () => {
  it("accepts valid financial years from the database-supported range", () => {
    expect(validateCreateFinancialYear({ year: 2200 })).toEqual({ year: 2200 });
  });

  it("rejects missing or malformed financial years", () => {
    expect(() => validateCreateFinancialYear({})).toThrow("Year is required");
    expect(() => validateCreateFinancialYear({ year: "bad" })).toThrow(
      "Year must be an integer between 2000 and 2200",
    );
    expect(() => validateCreateFinancialYear({ year: 2201 })).toThrow(
      "Year must be an integer between 2000 and 2200",
    );
  });

  it("validates route ids", () => {
    expect(validateFinancialYearId("12")).toBe(12);
    expect(() => validateFinancialYearId("0")).toThrow(
      "Financial year id must be a positive integer",
    );
  });
});
