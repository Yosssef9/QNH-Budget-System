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


const DRY_RUN = process.argv.includes("--dry-run");

const excelArg = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith("--"));

if (!excelArg) {
  console.error(`
Missing Excel file.

Usage:
  node scripts/importCatalogItems.cjs "C:\\path\\genaric-items.xlsx" --dry-run

Then actual import:
  node scripts/importCatalogItems.cjs "C:\\path\\genaric-items.xlsx"
`);
  process.exit(1);
}

const EXCEL_PATH = path.resolve(excelArg);

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
]);

const REQUIRED_COLUMNS = [
  "Item",
  "Category",
  "CAPEX/OPEX",
  "Unit of Measure",
];

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value) {
  return String(value ?? "").trim();
}

/*
Matches the backend normalizeCatalogCode behavior:
Patient Monitor -> PATIENT_MONITOR
*/
function normalizeCatalogCode(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

let BUDGET_USER_ROLE_ID = null;

function buildHeaders() {
  const headers = {
    Authorization: `Bearer ${PORTAL_TOKEN}`,
    "Content-Type": "application/json",
  };

  if (BUDGET_USER_ROLE_ID) {
    headers["x-budget-user-role-id"] = BUDGET_USER_ROLE_ID;
  }

  return headers;
}
async function findMasterCatalogWorkspace() {
  console.log("Finding Master Catalog admin workspace...");

  // Important: call /auth/me WITHOUT a workspace header first
  const response = await fetch(
    `${API_BASE_URL}/api/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${PORTAL_TOKEN}`,
      },
    }
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      body?.message || "Unable to load user workspaces"
    );
  }

  const workspaces =
    body?.budgetAccess?.workspaces || [];

  if (!workspaces.length) {
    throw new Error(
      "This user has no Budget System workspaces."
    );
  }

  const catalogWorkspace = workspaces.find(
    (workspace) =>
      Array.isArray(workspace.permissionCodes) &&
      workspace.permissionCodes.includes(
        "can_manage_budget_catalog"
      )
  );

  if (!catalogWorkspace) {
    console.log("\nAvailable workspaces:");

    for (const workspace of workspaces) {
      console.log(
        `- ID=${workspace.userRoleId} | ` +
        `${workspace.label} | ` +
        `${workspace.role?.code || workspace.type}`
      );
    }

    throw new Error(
      "No workspace has can_manage_budget_catalog permission."
    );
  }

  BUDGET_USER_ROLE_ID =
    String(catalogWorkspace.userRoleId);

  console.log(
    `Master Catalog workspace found: ` +
    `${catalogWorkspace.label} ` +
    `(UserRoleId=${BUDGET_USER_ROLE_ID})`
  );

  return catalogWorkspace;
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
      body = {
        message: rawText,
      };
    }
  }

  if (!response.ok) {
    const error = new Error(
      body?.message ||
        `Request failed with HTTP ${response.status}`
    );

    error.status = response.status;
    error.body = body;
    error.url = url;

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

  if (!workbook.SheetNames.length) {
    throw new Error("Excel workbook contains no sheets.");
  }

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error("Excel sheet contains no data rows.");
  }

  return {
    sheetName: firstSheetName,
    rows,
  };
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

    const category = normalizeText(
      row.Category
    ).toUpperCase();

    const expenseType = normalizeText(
      row["CAPEX/OPEX"]
    ).toUpperCase();

    const unitCode = normalizeText(
      row["Unit of Measure"]
    ).toUpperCase();

    if (!item) {
      errors.push(
        `Row ${excelRow}: Item is empty`
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

    // ----------------------------------------
    // Duplicate Item check
    // ----------------------------------------

    const nameKey = item.toLowerCase();

    if (seenNames.has(nameKey)) {
      errors.push(
        `Row ${excelRow}: Duplicate Item "${item}". ` +
        `First found at row ${seenNames.get(nameKey)}`
      );
    } else {
      seenNames.set(nameKey, excelRow);
    }

    // ----------------------------------------
    // Generated backend Item Code collision
    // ----------------------------------------

    const itemCode = normalizeCatalogCode(item);

    if (generatedCodes.has(itemCode)) {
      const existing = generatedCodes.get(itemCode);

      if (existing.item !== item) {
        errors.push(
          `Rows ${existing.row} and ${excelRow}: ` +
          `"${existing.item}" and "${item}" both generate ` +
          `item_code "${itemCode}"`
        );
      }
    } else {
      generatedCodes.set(itemCode, {
        item,
        row: excelRow,
      });
    }

    return {
      excelRow,
      item,
      category,
      expenseType,
      unitCode,
      itemCode,
    };
  });

  if (errors.length) {
    console.error(
      "\nExcel validation failed:\n"
    );

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
// BUILD LOOKUP MAPS FROM BACKEND
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
  console.log("QNH MASTER CATALOG ITEM IMPORT");
  console.log("========================================\n");

  // ------------------------------------------
  // Token check
  // ------------------------------------------

  if (!PORTAL_TOKEN) {
    throw new Error(
      "PORTAL_TOKEN environment variable is required."
    );
  }

  console.log(`API: ${API_BASE_URL}`);
  console.log(`Excel: ${EXCEL_PATH}`);

  if (BUDGET_USER_ROLE_ID) {
    console.log(
      `Budget workspace/user role: ${BUDGET_USER_ROLE_ID}`
    );
  } else {
    console.log(
      "Budget workspace/user role: backend default"
    );
  }

  console.log(
    `Mode: ${DRY_RUN ? "DRY RUN" : "IMPORT"}\n`
  );

  // ------------------------------------------
  // Read + validate Excel
  // ------------------------------------------

  console.log("Reading Excel...");

  const {
    sheetName,
    rows: rawRows,
  } = readExcel();

  console.log(`Sheet: ${sheetName}`);
  console.log(`Rows found: ${rawRows.length}`);

  const rows = validateExcelRows(rawRows);

  console.log(
    `Excel validation passed: ${rows.length} items\n`
  );

  // ------------------------------------------
  // Permission check
  // GET /catalog-items is behind
  // can_manage_budget_catalog
  // ------------------------------------------
await findMasterCatalogWorkspace();
  console.log(
    "Checking authentication and Master Catalog permission..."
  );

  let existingResponse;

  try {
    existingResponse = await apiRequest(
      "/api/master-catalog/catalog-items"
    );
  } catch (error) {
    if (error.status === 401) {
      throw new Error(
        "Authentication failed. PORTAL_TOKEN is invalid or expired."
      );
    }

    if (error.status === 403) {
      throw new Error(
        "Access denied. The selected Budget workspace does not have " +
        "can_manage_budget_catalog permission. " +
        "Set BUDGET_USER_ROLE_ID to the correct Master Catalog admin workspace."
      );
    }

    throw error;
  }

  console.log("Permission check passed.\n");

  // ------------------------------------------
  // Load Categories
  // ------------------------------------------

  console.log("Loading categories...");

  const categoriesResponse = await apiRequest(
    "/api/master-catalog/categories"
  );

  const categories =
    categoriesResponse?.data || [];

  const categoryMap =
    createCategoryMap(categories);

  console.log(
    "Categories:",
    [...categoryMap.keys()].join(", ")
  );

  // ------------------------------------------
  // Load UOM
  // ------------------------------------------

  console.log(
    "\nLoading units of measure..."
  );

  const unitsResponse = await apiRequest(
    "/api/master-catalog/units-of-measure"
  );

  const units =
    unitsResponse?.data || [];

  const unitMap = createUnitMap(units);

  console.log(
    "Units:",
    [...unitMap.keys()].join(", ")
  );

  // ------------------------------------------
  // Validate backend mappings
  // ------------------------------------------

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

  // ------------------------------------------
  // Existing Catalog Items
  // ------------------------------------------

  const existingItems =
    existingResponse?.data || [];

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

  // ------------------------------------------
  // PRE-FLIGHT code conflicts with DB
  // ------------------------------------------

  const databaseCodeConflicts = [];

  for (const row of rows) {
    const existingByCode =
      existingCodeMap.get(row.itemCode);

    if (!existingByCode) continue;

    const sameName =
      normalizeText(existingByCode.name)
        .toLowerCase() ===
      row.item.toLowerCase();

    const sameCategory =
      normalizeText(existingByCode.category_code)
        .toUpperCase() ===
      row.category;

    if (!sameName || !sameCategory) {
      databaseCodeConflicts.push({
        excelRow: row.excelRow,
        item: row.item,
        generatedItemCode: row.itemCode,
        existingItem: existingByCode.name,
        existingCategory:
          existingByCode.category_code,
      });
    }
  }

  if (databaseCodeConflicts.length) {
    console.error(
      "\nDatabase item-code conflicts detected:"
    );

    for (const conflict of databaseCodeConflicts) {
      console.error(
        `- Row ${conflict.excelRow}: ` +
        `"${conflict.item}" generates ` +
        `"${conflict.generatedItemCode}", ` +
        `but that code already belongs to ` +
        `"${conflict.existingItem}" ` +
        `(${conflict.existingCategory}).`
      );
    }

    throw new Error(
      "Import stopped because existing database item codes conflict."
    );
  }

  // ------------------------------------------
  // Import counters
  // ------------------------------------------

  const results = {
    total: rows.length,
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

  // IMPORTANT:
  // Intentionally sequential, not Promise.all.
  //
  // The backend calculates the next sort_order
  // during each create operation.
  //
  // Sequential requests are safer and easier to
  // audit / retry.
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    const position =
      `[${index + 1}/${rows.length}]`;

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

    const category =
      categoryMap.get(row.category);

    const unit =
      unitMap.get(row.unitCode);

    const payload = {
      name: row.item,
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

      // Add to local sets so duplicate rows later
      // in the same run cannot be recreated.
      existingNameCategory.set(
        existingKey,
        created || payload
      );

      existingCodeMap.set(
        created?.item_code || row.itemCode,
        created || payload
      );
    } catch (error) {
      // Backend duplicate protection.
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

  // ------------------------------------------
  // Write report
  // ------------------------------------------

  const reportPath = path.resolve(
    process.cwd(),
    "import-catalog-items-report.json"
  );

  fs.writeFileSync(
    reportPath,
    JSON.stringify(results, null, 2),
    "utf8"
  );

  // ------------------------------------------
  // Final summary
  // ------------------------------------------

  console.log("\n========================================");
  console.log("IMPORT COMPLETE");
  console.log("========================================");

  console.log(`Total:   ${results.total}`);

  if (DRY_RUN) {
    console.log(
      `Dry run: ${results.total - results.skipped}`
    );
  } else {
    console.log(`Created: ${results.created}`);
  }

  console.log(`Skipped: ${results.skipped}`);
  console.log(`Failed:  ${results.failed}`);

  console.log(
    `\nReport:\n${reportPath}`
  );

  if (results.failed > 0) {
    process.exitCode = 1;
  }
}

// ============================================================
// START
// ============================================================

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