import { describe, expect, it } from "vitest";
import {
  FINANCIAL_YEAR_PERMISSION,
  FINANCIAL_YEAR_STATUS,
  REQUIRED_CATEGORY_CODES,
} from "../../../modules/financial-years/financialYears.constants.js";

describe("financial years constants", () => {
  it("uses the normalized financial-year management permission", () => {
    expect(FINANCIAL_YEAR_PERMISSION).toBe("can_manage_financial_years");
  });

  it("uses the approved financial-year statuses", () => {
    expect(Object.values(FINANCIAL_YEAR_STATUS)).toEqual([
      "OPEN",
      "PRE_CLOSING",
      "CLOSED",
    ]);
  });

  it("initializes exactly the three approved budget categories", () => {
    expect(REQUIRED_CATEGORY_CODES).toEqual(["IT", "BIOMEDICAL", "GENERAL"]);
  });
});
