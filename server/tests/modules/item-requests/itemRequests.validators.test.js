import { describe, expect, it } from "vitest";
import {
  validateCreateItemRequest,
  validateItemRequestStatus,
} from "../../../modules/item-requests/itemRequests.validators.js";

describe("item request validators", () => {
  it("accepts requests for an existing fixed category", () => {
    expect(
      validateCreateItemRequest({
        existingCategoryId: "1",
        requestedTypeName: "Printer Toner",
        expenseType: "opex",
      }),
    ).toEqual({
      existingCategoryId: 1,
      requestedCategoryName: null,
      requestedTypeName: "Printer Toner",
      expenseType: "OPEX",
    });
  });

  it("rejects missing, malformed, or new category requests", () => {
    expect(() =>
      validateCreateItemRequest({
        requestedTypeName: "Printer Toner",
        expenseType: "OPEX",
      }),
    ).toThrow("existingCategoryId must be a positive number");

    expect(() =>
      validateCreateItemRequest({
        existingCategoryId: 1,
        requestedCategoryName: "New Category",
        requestedTypeName: "Printer Toner",
        expenseType: "OPEX",
      }),
    ).toThrow("New category requests are not supported");
  });

  it("normalizes request statuses", () => {
    expect(validateItemRequestStatus(undefined)).toBe("PENDING");
    expect(validateItemRequestStatus("all")).toBe("ALL");
    expect(() => validateItemRequestStatus("OPEN")).toThrow(
      "Invalid request status",
    );
  });
});
