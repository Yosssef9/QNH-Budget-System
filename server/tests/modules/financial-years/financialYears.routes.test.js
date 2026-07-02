import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("financial years routes", () => {
  it("keeps current/open lookups before the management permission boundary", () => {
    const source = readFileSync(
      resolve("modules/financial-years/financialYears.routes.js"),
      "utf8",
    );

    const currentLookupIndex = source.indexOf(
      'router.get("/current", getCurrentFinancialYear)',
    );
    const openLookupIndex = source.indexOf(
      'router.get("/open", getOpenFinancialYear)',
    );
    const managementBoundaryIndex = source.indexOf(
      "router.use(requireBudgetPermission(FINANCIAL_YEAR_PERMISSION))",
    );
    const createIndex = source.indexOf('router.post("/", createFinancialYear)');

    expect(currentLookupIndex).toBeGreaterThan(-1);
    expect(openLookupIndex).toBeGreaterThan(-1);
    expect(managementBoundaryIndex).toBeGreaterThan(-1);
    expect(createIndex).toBeGreaterThan(-1);
    expect(currentLookupIndex).toBeLessThan(managementBoundaryIndex);
    expect(openLookupIndex).toBeLessThan(managementBoundaryIndex);
    expect(createIndex).toBeGreaterThan(managementBoundaryIndex);
  });
});
