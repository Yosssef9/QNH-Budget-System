import { describe, expect, it } from "vitest";
import {
  validateDepartmentBudgetId,
  validateDepartmentCategoryBudgetId,
  validateSaveCategoryItemsPayload,
} from "../../../modules/department-budgets/departmentBudgets.validators.js";

describe("department budgets validators", () => {
  it("validates route ids", () => {
    expect(validateDepartmentBudgetId("12")).toBe(12);
    expect(validateDepartmentCategoryBudgetId("44")).toBe(44);
    expect(() => validateDepartmentBudgetId("0")).toThrow(
      "departmentBudgetId must be a positive integer",
    );
  });

  it("accepts generic catalog item requests with distributions", () => {
    expect(
      validateSaveCategoryItemsPayload({
        items: [
          {
            catalog_item_id: "10",
            requested_quantity: "12",
            distribution_method: "MONTHLY",
            is_project: true,
            distribution: [
              { period_type: "MONTH", period_no: "1", quantity: "12" },
            ],
          },
        ],
      }),
    ).toEqual({
      items: [
        {
          id: null,
          catalog_item_id: 10,
          requested_quantity: 12,
          distribution_method: "MONTHLY",
          is_project: true,
          distribution: [
            { period_type: "MONTH", period_no: 1, quantity: 12 },
          ],
        },
      ],
    });
  });

  it("rejects malformed catalog item requests", () => {
    expect(() =>
      validateSaveCategoryItemsPayload({
        items: [{ requested_quantity: 1, distribution_method: "MONTHLY" }],
      }),
    ).toThrow("items[0].catalog_item_id must be a positive integer");

    expect(() =>
      validateSaveCategoryItemsPayload({
        items: [
          {
            catalog_item_id: 1,
            requested_quantity: 0,
            distribution_method: "MONTHLY",
          },
        ],
      }),
    ).toThrow("items[0].requested_quantity must be greater than 0");
  });
});
