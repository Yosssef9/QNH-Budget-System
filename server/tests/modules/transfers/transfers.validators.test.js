import { describe, expect, it } from "vitest";

import { validateTransferItemsQuery } from "../../../modules/transfers/transfers.validators.js";

describe("transfer validators", () => {
  it("accepts an optional financial year for balance reads", () => {
    expect(validateTransferItemsQuery({})).toEqual({
      financialYearId: null,
    });
    expect(
      validateTransferItemsQuery({ financialYearId: "12" }),
    ).toEqual({
      financialYearId: 12,
    });
  });

  it("rejects an invalid financial year", () => {
    expect(() =>
      validateTransferItemsQuery({ financialYearId: "0" }),
    ).toThrow("Financial year id is invalid");
  });
});
