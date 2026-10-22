import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourceAt = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const field = sourceAt("../../src/components/cfo-package-review/CfoSearchField.jsx");

describe("CFO search-field focus consistency", () => {
  it("focuses the whole search control instead of hiding the focus indication", () => {
    expect(field).toContain("focus-within:border-blue-500");
    expect(field).toContain("focus-within:ring-2");
    expect(field).toContain("focus-within:ring-blue-100");
    expect(field).toContain("group-focus-within:text-blue-600");
  });

  it.each([
    ["By Item", "../../src/pages/cfo-package-review/CfoPackageReviewPage.jsx", "Search item, model, category or note"],
    ["By Department", "../../src/components/cfo-package-review/CfoReviewTables.jsx", "Search department or requested item"],
    ["Department Details", "../../src/components/cfo-package-review/CfoDepartmentDetailsDrawer.jsx", "Search requested item or department"],
  ])("uses the shared focus style in %s", (_name, path, placeholder) => {
    const code = sourceAt(path);
    expect(code).toContain("<CfoSearchField");
    expect(code).toContain(`placeholder="${placeholder}"`);
  });
});
