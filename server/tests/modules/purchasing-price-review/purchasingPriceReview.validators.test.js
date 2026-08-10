import { describe, expect, it } from "vitest";
import {
  validateBulkPriceReviewPayload,
  validatePriceReviewPayload,
} from "../../../modules/purchasing-price-review/purchasingPriceReview.validators.js";

describe("Purchasing price review validators", () => {
  it("requires a Purchasing price of at least 1", () => {
    expect(() =>
      validatePriceReviewPayload({
        purchasing_unit_price: 0.5,
        row_version: "AAAAAAAAAAE=",
      }),
    ).toThrowError(expect.objectContaining({ errorCode: "INVALID_PURCHASING_PRICE" }));
  });

  it("accepts a valid Purchasing price and concurrency token", () => {
    expect(
      validatePriceReviewPayload({
        purchasing_unit_price: 450,
        row_version: "AAAAAAAAAAE=",
      }),
    ).toMatchObject({ purchasing_unit_price: 450 });
  });

  it("normalizes an atomic bulk price-save payload", () => {
    const result = validateBulkPriceReviewPayload({
      row_version: "AAAAAAAAAAE=",
      prices: [
        {
          package_sub_item_id: 22,
          purchasing_unit_price: 450,
          row_version: "AAAAAAAAAAI=",
        },
      ],
    });

    expect(result.prices).toHaveLength(1);
    expect(result.prices[0]).toMatchObject({
      package_sub_item_id: 22,
      purchasing_unit_price: 450,
    });
  });

  it("rejects duplicate models in one bulk save", () => {
    expect(() =>
      validateBulkPriceReviewPayload({
        row_version: "AAAAAAAAAAE=",
        prices: [
          { package_sub_item_id: 22, purchasing_unit_price: 450, row_version: "AAAAAAAAAAI=" },
          { package_sub_item_id: 22, purchasing_unit_price: 425, row_version: "AAAAAAAAAAM=" },
        ],
      }),
    ).toThrowError(expect.objectContaining({ errorCode: "DUPLICATE_PURCHASING_PRICE" }));
  });
});
