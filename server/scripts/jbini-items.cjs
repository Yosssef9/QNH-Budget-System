const XLSX = require("xlsx");
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:4000")
  .replace(/\/+$/, "");

const PORTAL_TOKEN = process.env.PORTAL_TOKEN;
const BUDGET_USER_ROLE_ID = String(
  process.env.BUDGET_USER_ROLE_ID || "1"
).trim();

const DRY_RUN = process.argv.includes("--dry-run");

const excelArg = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith("--"));

if (!excelArg) {
  console.error(`
Missing Jibini Excel file.

Dry run:
  node scripts\\importJbiniItems.cjs "scripts\\data\\jibin-budget-catalog-import-with-original-item.xlsx" --dry-run

Actual import:
  node scripts\\importJbiniItems.cjs "scripts\\data\\jibin-budget-catalog-import-with-original-item.xlsx"
`);
  process.exit(1);
}

const EXCEL_PATH = path.resolve(excelArg);
const SHEET_NAME = "Import";

const REPORT_PATH = path.resolve(
  process.cwd(),
  "import-jbini-items-report.json"
);

// ============================================================
// CONSTANTS
// ============================================================

const VALID_CATEGORIES = new Set([
  "IT",
  "BIOMEDICAL",
  "GENERAL",
]);

const VALID_EXPENSE_TYPES = new Set([
  "CAPEX",
  "OPEX",
]);

const VALID_UNITS = new Set([
  "UNIT",
  "LICENSE",
  "SERVICE",
  "CONTRACT",
]);

const REQUIRED_COLUMNS = [
  "Item",
  "Category",
  "CAPEX/OPEX",
  "Unit of Measure",
  "Original Item",
];

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCatalogCode(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

function buildHeaders() {
  return {
    Authorization: `Bearer ${PORTAL_TOKEN}`,
    "Content-Type": "application/json",
    "x-budget-user-role-id": BUDGET_USER_ROLE_ID,
  };
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  const rawText = await response.text();

  let body = null;

  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { message: rawText };
    }
  }

  if (!response.ok) {
    const error = new Error(
      body?.message ||
        body?.error?.message ||
        `Request failed with HTTP ${response.status}`
    );

    error.status = response.status;
    error.body = body;

    throw error;
  }

  return body;
}

// ============================================================
// READ EXCEL
// ============================================================

function readExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(
      `Excel file does not exist:\n${EXCEL_PATH}`
    );
  }

  const workbook = XLSX.readFile(EXCEL_PATH);

  if (!workbook.SheetNames.includes(SHEET_NAME)) {
    throw new Error(
      `Excel sheet "${SHEET_NAME}" was not found.`
    );
  }

  const sheet = workbook.Sheets[SHEET_NAME];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error(
      `Excel sheet "${SHEET_NAME}" contains no data rows.`
    );
  }

  return rows;
}

// ============================================================
// EXCEL VALIDATION
// ============================================================

function validateExcelRows(rows) {
  const errors = [];
  const columns = Object.keys(rows[0] || {});

  for (const requiredColumn of REQUIRED_COLUMNS) {
    if (!columns.includes(requiredColumn)) {
      errors.push(
        `Missing required column: "${requiredColumn}"`
      );
    }
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  const seenNames = new Map();
  const generatedCodes = new Map();

  const cleanedRows = rows.map((row, index) => {
    const excelRow = index + 2;

    const item = normalizeText(row.Item);
    const category = normalizeText(row.Category).toUpperCase();
    const expenseType = normalizeText(
      row["CAPEX/OPEX"]
    ).toUpperCase();
    const unitCode = normalizeText(
      row["Unit of Measure"]
    ).toUpperCase();
    const originalItem = normalizeText(
      row["Original Item"]
    );

    if (!item) {
      errors.push(`Row ${excelRow}: Item is empty`);
    } else if (item.length > 200) {
      errors.push(
        `Row ${excelRow}: Item exceeds 200 characters`
      );
    }

    if (!originalItem) {
      errors.push(
        `Row ${excelRow}: Original Item is empty`
      );
    } else if (originalItem.length > 1000) {
      errors.push(
        `Row ${excelRow}: Original Item exceeds 1000 characters`
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      errors.push(
        `Row ${excelRow}: Invalid Category "${category}"`
      );
    }

    if (!VALID_EXPENSE_TYPES.has(expenseType)) {
      errors.push(
        `Row ${excelRow}: Invalid CAPEX/OPEX "${expenseType}"`
      );
    }

    if (!VALID_UNITS.has(unitCode)) {
      errors.push(
        `Row ${excelRow}: Invalid Unit of Measure "${unitCode}"`
      );
    }

    const nameKey =
      `${category}|${item.toLowerCase()}`;

    if (seenNames.has(nameKey)) {
      errors.push(
        `Row ${excelRow}: Duplicate Item "${item}" in ${category}. ` +
        `First found at row ${seenNames.get(nameKey)}`
      );
    } else {
      seenNames.set(nameKey, excelRow);
    }

    const itemCode = normalizeCatalogCode(item);
    const codeOwner = generatedCodes.get(itemCode);

    if (codeOwner) {
      if (
        codeOwner.item.toLowerCase() !== item.toLowerCase() ||
        codeOwner.category !== category
      ) {
        errors.push(
          `Rows ${codeOwner.row} and ${excelRow}: ` +
          `both generate item_code "${itemCode}"`
        );
      }
    } else {
      generatedCodes.set(itemCode, {
        row: excelRow,
        item,
        category,
      });
    }

    return {
      excelRow,
      item,
      category,
      expenseType,
      unitCode,
      originalItem,
      itemCode,
    };
  });

  if (errors.length) {
    console.error("\nExcel validation failed:\n");

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    throw new Error(
      `Excel validation failed with ${errors.length} error(s).`
    );
  }

  return cleanedRows;
}

// ============================================================
// BACKEND MAPS
// ============================================================

function createCategoryMap(categories) {
  const map = new Map();

  for (const category of categories) {
    if (category.is_active === false) continue;

    const code = normalizeText(
      category.category_code || category.code
    ).toUpperCase();

    if (code) {
      map.set(code, category);
    }
  }

  return map;
}

function createUnitMap(units) {
  const map = new Map();

  for (const unit of units) {
    if (unit.is_active === false) continue;

    const code = normalizeText(
      unit.unit_code || unit.code
    ).toUpperCase();

    if (code) {
      map.set(code, unit);
    }
  }

  return map;
}

// ============================================================
// IMPORT
// ============================================================

async function main() {
  console.log("\n========================================");
  console.log("QNH JIBINI MASTER CATALOG ITEM IMPORT");
  console.log("========================================\n");

  if (!PORTAL_TOKEN) {
    throw new Error(
      "PORTAL_TOKEN environment variable is required."
    );
  }

  console.log(`API:   ${API_BASE_URL}`);
  console.log(`Excel: ${EXCEL_PATH}`);
  console.log(`Sheet: ${SHEET_NAME}`);
  console.log(
    `Budget workspace/user role: ${BUDGET_USER_ROLE_ID}`
  );
  console.log(
    `Mode:  ${DRY_RUN ? "DRY RUN" : "IMPORT"}\n`
  );

  console.log("Reading Jibini Excel...");

  const rawRows = readExcel();

  console.log(`Rows found: ${rawRows.length}`);

  const rows = validateExcelRows(rawRows);

  console.log(
    `Excel validation passed: ${rows.length} items\n`
  );

  // ----------------------------------------------------------
  // Categories
  // ----------------------------------------------------------

  console.log("Loading categories...");

  const categoriesResponse = await apiRequest(
    "/api/master-catalog/categories"
  );

  const categoryMap = createCategoryMap(
    categoriesResponse?.data || []
  );

  console.log(
    "Categories:",
    [...categoryMap.keys()].join(", ")
  );

  // ----------------------------------------------------------
  // Units
  // ----------------------------------------------------------

  console.log("\nLoading units of measure...");

  const unitsResponse = await apiRequest(
    "/api/master-catalog/units-of-measure"
  );

  const unitMap = createUnitMap(
    unitsResponse?.data || []
  );

  console.log(
    "Units:",
    [...unitMap.keys()].join(", ")
  );

  // ----------------------------------------------------------
  // Mapping validation
  // ----------------------------------------------------------

  const mappingErrors = [];

  for (const row of rows) {
    if (!categoryMap.has(row.category)) {
      mappingErrors.push(
        `Excel row ${row.excelRow}: ` +
        `Category "${row.category}" does not exist in backend.`
      );
    }

    if (!unitMap.has(row.unitCode)) {
      mappingErrors.push(
        `Excel row ${row.excelRow}: ` +
        `Unit "${row.unitCode}" does not exist in backend.`
      );
    }
  }

  if (mappingErrors.length) {
    console.error("\nMapping errors:");

    for (const error of mappingErrors) {
      console.error(`- ${error}`);
    }

    throw new Error(
      "Backend category/UOM mapping validation failed."
    );
  }

  console.log(
    "\nBackend mappings validated successfully."
  );

  // ----------------------------------------------------------
  // Existing catalog items
  // Same category route used by the application.
  // ----------------------------------------------------------

  console.log("\nLoading existing catalog items...");

  const usedCategories = [
    ...new Set(rows.map((row) => row.category)),
  ];

  const existingItems = [];

  for (const categoryCode of usedCategories) {
    const category = categoryMap.get(categoryCode);

    const response = await apiRequest(
      `/api/master-catalog/categories/${category.id}/catalog-items?includeInactive=true`
    );

    existingItems.push(...(response?.data || []));
  }

  const existingNameCategory = new Map();
  const existingCodeMap = new Map();

  for (const existing of existingItems) {
    const categoryCode = normalizeText(
      existing.category_code
    ).toUpperCase();

    const name = normalizeText(
      existing.name
    ).toLowerCase();

    const itemCode = normalizeText(
      existing.item_code
    ).toUpperCase();

    if (categoryCode && name) {
      existingNameCategory.set(
        `${categoryCode}|${name}`,
        existing
      );
    }

    if (itemCode) {
      existingCodeMap.set(itemCode, existing);
    }
  }

  // ----------------------------------------------------------
  // Code conflict pre-check
  // ----------------------------------------------------------

  const conflicts = [];

  for (const row of rows) {
    const existing = existingCodeMap.get(row.itemCode);

    if (!existing) continue;

    const sameName =
      normalizeText(existing.name).toLowerCase() ===
      row.item.toLowerCase();

    const sameCategory =
      normalizeText(existing.category_code).toUpperCase() ===
      row.category;

    if (!sameName || !sameCategory) {
      conflicts.push({
        excelRow: row.excelRow,
        item: row.item,
        itemCode: row.itemCode,
        existingItem: existing.name,
        existingCategory: existing.category_code,
      });
    }
  }

  if (conflicts.length) {
    console.error(
      "\nDatabase item-code conflicts detected:\n"
    );

    for (const conflict of conflicts) {
      console.error(
        `- Row ${conflict.excelRow}: ` +
        `"${conflict.item}" generates "${conflict.itemCode}", ` +
        `already used by "${conflict.existingItem}" ` +
        `(${conflict.existingCategory})`
      );
    }

    throw new Error(
      "Import stopped because existing database item codes conflict."
    );
  }

  // ----------------------------------------------------------
  // Import
  // ----------------------------------------------------------

  const results = {
    total: rows.length,
    wouldCreate: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    dryRun: DRY_RUN,
    createdItems: [],
    skippedItems: [],
    failedItems: [],
  };

  console.log(
    `\nStarting ${DRY_RUN ? "dry run" : "import"}...\n`
  );

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const position = `[${index + 1}/${rows.length}]`;

    const existingKey =
      `${row.category}|${row.item.toLowerCase()}`;

    if (existingNameCategory.has(existingKey)) {
      console.log(
        `${position} SKIP    ${row.item} ` +
        `(${row.category}) - already exists`
      );

      results.skipped++;
      results.skippedItems.push({
        excelRow: row.excelRow,
        item: row.item,
        category: row.category,
        reason: "Already exists",
      });

      continue;
    }

    const category = categoryMap.get(row.category);
    const unit = unitMap.get(row.unitCode);

    const payload = {
      name: row.item,
      description: row.originalItem,
      expense_type: row.expenseType,
      unit_of_measure_id: Number(unit.id),
    };

    if (DRY_RUN) {
      console.log(
        `${position} DRYRUN  ${row.item} ` +
        `(${row.category}) -> ` +
        `categoryId=${category.id}, ` +
        `unitId=${unit.id}`
      );

      results.wouldCreate++;
      continue;
    }

    try {
      const response = await apiRequest(
        `/api/master-catalog/categories/${category.id}/catalog-items`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const created = response?.data;

      console.log(
        `${position} CREATED ${row.item} ` +
        `(${row.category}) ` +
        `id=${created?.id ?? "?"}`
      );

      results.created++;

      results.createdItems.push({
        excelRow: row.excelRow,
        item: row.item,
        category: row.category,
        catalogItemId: created?.id ?? null,
        itemCode:
          created?.item_code ?? row.itemCode,
      });

      existingNameCategory.set(
        existingKey,
        created || payload
      );
    } catch (error) {
      if (error.status === 409) {
        console.log(
          `${position} SKIP    ${row.item} ` +
          `(${row.category}) - ${error.message}`
        );

        results.skipped++;

        results.skippedItems.push({
          excelRow: row.excelRow,
          item: row.item,
          category: row.category,
          reason: error.message,
        });

        continue;
      }

      console.error(
        `${position} FAILED  ${row.item} ` +
        `(${row.category}) - ${error.message}`
      );

      results.failed++;

      results.failedItems.push({
        excelRow: row.excelRow,
        item: row.item,
        category: row.category,
        status: error.status || null,
        error: error.message,
      });
    }
  }

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(results, null, 2),
    "utf8"
  );

  console.log("\n========================================");
  console.log(
    DRY_RUN ? "DRY RUN COMPLETE" : "IMPORT COMPLETE"
  );
  console.log("========================================");

  console.log(`Total:        ${results.total}`);

  if (DRY_RUN) {
    console.log(
      `Would create: ${results.wouldCreate}`
    );
  } else {
    console.log(`Created:      ${results.created}`);
  }

  console.log(`Skipped:      ${results.skipped}`);
  console.log(`Failed:       ${results.failed}`);

  console.log(
    `\nReport:\n${REPORT_PATH}`
  );

  if (results.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\n========================================");
  console.error("IMPORT STOPPED");
  console.error("========================================");
  console.error(error.message);

  if (error.body) {
    console.error(
      JSON.stringify(error.body, null, 2)
    );
  }

  process.exit(1);
});
