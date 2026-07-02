import { describe, expect, it } from "vitest";
import {
  CATEGORY_CODES,
  categoryCodeFromName,
  normalizeCatalogCode,
} from "../../../modules/master-catalog/masterCatalog.constants.js";

describe("master catalog constants", () => {
  it("normalizes item and sub-item codes for SQL checks", () => {
    expect(normalizeCatalogCode("Dell Latitude 5440")).toBe("DELL_LATITUDE_5440");
  });

  it("maps approved category names to stable category codes", () => {
    expect(categoryCodeFromName("Information Technology")).toBe(
      CATEGORY_CODES.IT,
    );
    expect(categoryCodeFromName("Biomedical")).toBe(CATEGORY_CODES.BIOMEDICAL);
    expect(categoryCodeFromName("General")).toBe(CATEGORY_CODES.GENERAL);
  });
});

