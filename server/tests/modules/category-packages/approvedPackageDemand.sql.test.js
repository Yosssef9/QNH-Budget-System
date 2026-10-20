import { describe, it, expect } from "vitest";
import { hasPositiveApprovedPackageDemandSql } from "../../../modules/category-packages/approvedPackageDemand.sql.js";

describe("purchasable approved demand SQL", () => {
  it("requires positive completed demand and the correct package year/category", () => {
    const sql = hasPositiveApprovedPackageDemandSql("packageItem");
    expect(sql).toContain("approvedItem.category_approved_quantity > 0");
    expect(sql).toContain("approvedCb.status = 'CATEGORY_REVIEW_COMPLETED'");
    expect(sql).toContain("approvedItem.review_status = 'CATEGORY_REVIEW_COMPLETED'");
    expect(sql).toContain("approvedPkg.id = packageItem.category_budget_package_id");
    expect(sql).toContain("approvedItem.catalog_item_id = packageItem.catalog_item_id");
  });
});
