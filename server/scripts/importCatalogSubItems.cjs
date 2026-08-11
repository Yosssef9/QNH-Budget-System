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

const positionalArgs = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"));

const subItemsArg = positionalArgs[0];

if (!subItemsArg) {
  console.error(`
Missing Sub-Items Excel file.

Usage (recommended):
  node scripts\\importCatalogSubItems.cjs "scripts\\data\\sub-items.xlsx" --dry-run

Actual import:
  node scripts\\importCatalogSubItems.cjs "scripts\\data\\sub-items.xlsx"

Optional: explicitly provide Generic Items Excel as second argument:
  node scripts\\importCatalogSubItems.cjs "scripts\\data\\sub-items.xlsx" "scripts\\data\\generic-items.xlsx" --dry-run
`);
  process.exit(1);
}

const SUB_ITEMS_EXCEL_PATH = path.resolve(subItemsArg);
const GENERIC_ITEMS_EXCEL_PATH = positionalArgs[1]
  ? path.resolve(positionalArgs[1])
  : path.resolve(path.dirname(SUB_ITEMS_EXCEL_PATH), "generic-items.xlsx");

const REPORT_PATH = path.resolve(
  process.cwd(),
  "import-catalog-sub-items-report.json"
);

// Limit parallel GET requests while checking existing Sub-Items.
const LOOKUP_CONCURRENCY = 10;

// ============================================================
// CONSTANTS
// ============================================================

const VALID_CATEGORIES = new Set([
  "IT",
  "BIOMEDICAL",
  "GENERAL",
]);

const VALID_UNITS = new Set([
  "UNIT",
  "LICENSE",
  "SERVICE",
]);

const SUB_ITEM_REQUIRED_COLUMNS = [
  "Asset Code",
  "Category",
  "Item",
  "Sub-Item",
  "Unit of Measure",
];

const GENERIC_REQUIRED_COLUMNS = [
  "Category",
  "Item",
  "CAPEX/OPEX",
  "Unit of Measure",
];

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

/*
Matches the backend normalizeCatalogCode behavior.
Example: Patient Monitor -> PATIENT_MONITOR
*/
function normalizeCatalogCode(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

function parentKey(category, item) {
  return `${normalizeText(category).toUpperCase()}|${normalizeKey(item)}`;
}

function subItemNameKey(name) {
  return normalizeKey(name);
}

function subItemCodeKey(code) {
  return normalizeText(code).toUpperCase();
}

function unwrapData(response) {
  return response?.data ?? [];
}

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} does not exist:\n${filePath}`);
  }
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

  // Important: call /auth/me WITHOUT a workspace header first.
  const response = await fetch(
    `${API_BASE_URL}/api/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${PORTAL_TOKEN}`,
      },
    }
  );

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
    throw new Error(
      body?.message || "Unable to load user workspaces"
    );
  }

  const workspaces = body?.budgetAccess?.workspaces || [];

  if (!workspaces.length) {
    throw new Error("This user has no Budget System workspaces.");
  }

  const catalogWorkspace = workspaces.find(
    (workspace) =>
      Array.isArray(workspace.permissionCodes) &&
      workspace.permissionCodes.includes("can_manage_budget_catalog")
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

  BUDGET_USER_ROLE_ID = String(catalogWorkspace.userRoleId);

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
      body = { message: rawText };
    }
  }

  if (!response.ok) {
    const error = new Error(
      body?.message || `Request failed with HTTP ${response.status}`
    );

    error.status = response.status;
    error.body = body;
    error.url = url;

    throw error;
  }

  return body;
}

function readExcel(filePath, label) {
  assertFileExists(filePath, label);

  const workbook = XLSX.readFile(filePath);

  if (!workbook.SheetNames.length) {
    throw new Error(`${label} contains no sheets.`);
  }

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error(`${label} contains no data rows.`);
  }

  return {
    sheetName: firstSheetName,
    rows,
  };
}

function validateRequiredColumns(rows, requiredColumns, label) {
  const columns = Object.keys(rows[0] || {});
  const missing = requiredColumns.filter(
    (column) => !columns.includes(column)
  );

  if (missing.length) {
    throw new Error(
      `${label} is missing required column(s): ${missing
        .map((column) => `"${column}"`)
        .join(", ")}`
    );
  }
}

// ============================================================
// GENERIC ITEMS EXCEL VALIDATION
// ============================================================

function validateGenericItemsExcel(rows) {
  validateRequiredColumns(
    rows,
    GENERIC_REQUIRED_COLUMNS,
    "Generic Items Excel"
  );

  const errors = [];
  const byParentKey = new Map();
  const byGeneratedCode = new Map();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const excelRow = index + 2;

    const category = normalizeText(row.Category).toUpperCase();
    const item = normalizeText(row.Item);
    const unitCode = normalizeText(row["Unit of Measure"]).toUpperCase();

    if (!VALID_CATEGORIES.has(category)) {
      errors.push(
        `Generic row ${excelRow}: Invalid Category "${category}"`
      );
    }

    if (!item) {
      errors.push(`Generic row ${excelRow}: Item is empty`);
    }

    if (item.length > 200) {
      errors.push(
        `Generic row ${excelRow}: Item exceeds backend limit of 200 characters`
      );
    }

    if (!VALID_UNITS.has(unitCode)) {
      errors.push(
        `Generic row ${excelRow}: Invalid Unit of Measure "${unitCode}"`
      );
    }

    const key = parentKey(category, item);

    if (byParentKey.has(key)) {
      errors.push(
        `Generic row ${excelRow}: Duplicate Category + Item ` +
        `"${category} | ${item}". First found at row ${byParentKey.get(key).excelRow}`
      );
    } else {
      byParentKey.set(key, {
        excelRow,
        category,
        item,
        unitCode,
        itemCode: normalizeCatalogCode(item),
      });
    }

    const itemCode = normalizeCatalogCode(item);

    if (itemCode) {
      const existingCode = byGeneratedCode.get(itemCode);

      if (existingCode && existingCode.key !== key) {
        errors.push(
          `Generic rows ${existingCode.excelRow} and ${excelRow}: ` +
          `both generate item_code "${itemCode}"`
        );
      } else if (!existingCode) {
        byGeneratedCode.set(itemCode, { excelRow, key, item });
      }
    }
  }

  if (errors.length) {
    console.error("\nGeneric Items Excel validation failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    throw new Error(
      `Generic Items Excel validation failed with ${errors.length} error(s).`
    );
  }

  return byParentKey;
}

// ============================================================
// SUB-ITEM EXCEL VALIDATION
// ============================================================

function validateSubItemsExcel(rows, genericMap) {
  validateRequiredColumns(
    rows,
    SUB_ITEM_REQUIRED_COLUMNS,
    "Sub-Items Excel"
  );

  const errors = [];
  const seenAssetCodes = new Map();
  const seenNamesByParent = new Map();
  const seenCodesByParent = new Map();
  const referencedParents = new Set();

  const cleanedRows = rows.map((row, index) => {
    const excelRow = index + 2;

    const assetCode = normalizeText(row["Asset Code"]);
    const category = normalizeText(row.Category).toUpperCase();
    const item = normalizeText(row.Item);
    const subItem = normalizeText(row["Sub-Item"]);
    const unitCode = normalizeText(row["Unit of Measure"]).toUpperCase();

    if (!assetCode) {
      errors.push(`Row ${excelRow}: Asset Code is empty`);
    } else if (assetCode.length > 100) {
      errors.push(
        `Row ${excelRow}: Asset Code exceeds backend limit of 100 characters`
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      errors.push(
        `Row ${excelRow}: Invalid Category "${category}"`
      );
    }

    if (!item) {
      errors.push(`Row ${excelRow}: Item is empty`);
    } else if (item.length > 200) {
      errors.push(
        `Row ${excelRow}: Item exceeds backend limit of 200 characters`
      );
    }

    if (!subItem) {
      errors.push(`Row ${excelRow}: Sub-Item is empty`);
    } else if (subItem.length > 300) {
      errors.push(
        `Row ${excelRow}: Sub-Item exceeds backend limit of 300 characters`
      );
    }

    if (normalizeKey(subItem) === "general") {
      errors.push(
        `Row ${excelRow}: "General" must not be imported; ` +
        `the backend creates it automatically for each Generic Item`
      );
    }

    if (normalizeKey(subItem) === normalizeKey(item)) {
      errors.push(
        `Row ${excelRow}: Sub-Item "${subItem}" is identical to its parent Item`
      );
    }

    if (!VALID_UNITS.has(unitCode)) {
      errors.push(
        `Row ${excelRow}: Invalid Unit of Measure "${unitCode}"`
      );
    }

    const pKey = parentKey(category, item);
    referencedParents.add(pKey);

    const generic = genericMap.get(pKey);

    if (!generic) {
      errors.push(
        `Row ${excelRow}: Parent "${category} | ${item}" ` +
        `does not exist in Generic Items Excel`
      );
    } else if (generic.unitCode !== unitCode) {
      errors.push(
        `Row ${excelRow}: UOM mismatch for parent "${category} | ${item}". ` +
        `Generic Item uses ${generic.unitCode}, Sub-Item row uses ${unitCode}`
      );
    }

    const globalAssetKey = subItemCodeKey(assetCode);

    if (globalAssetKey) {
      if (seenAssetCodes.has(globalAssetKey)) {
        errors.push(
          `Row ${excelRow}: Duplicate Asset Code "${assetCode}". ` +
          `First found at row ${seenAssetCodes.get(globalAssetKey)}`
        );
      } else {
        seenAssetCodes.set(globalAssetKey, excelRow);
      }
    }

    const parentNameKey = `${pKey}|${subItemNameKey(subItem)}`;
    if (seenNamesByParent.has(parentNameKey)) {
      errors.push(
        `Row ${excelRow}: Duplicate Sub-Item name "${subItem}" under ` +
        `"${category} | ${item}". First found at row ${seenNamesByParent.get(parentNameKey)}`
      );
    } else {
      seenNamesByParent.set(parentNameKey, excelRow);
    }

    const parentCodeKey = `${pKey}|${subItemCodeKey(assetCode)}`;
    if (seenCodesByParent.has(parentCodeKey)) {
      errors.push(
        `Row ${excelRow}: Duplicate Sub-Item code "${assetCode}" under ` +
        `"${category} | ${item}". First found at row ${seenCodesByParent.get(parentCodeKey)}`
      );
    } else {
      seenCodesByParent.set(parentCodeKey, excelRow);
    }

    return {
      excelRow,
      assetCode,
      category,
      item,
      subItem,
      unitCode,
      parentKey: pKey,
    };
  });

  if (errors.length) {
    console.error("\nSub-Items Excel validation failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    throw new Error(
      `Sub-Items Excel validation failed with ${errors.length} error(s).`
    );
  }

  return {
    rows: cleanedRows,
    referencedParents,
  };
}

// ============================================================
// BACKEND LOOKUP MAPS
// ============================================================

function createUnitMap(units) {
  const map = new Map();

  for (const unit of units) {
    if (unit.is_active === false) continue;

    const code = normalizeText(
      unit.unit_code || unit.code
    ).toUpperCase();

    if (code) map.set(code, unit);
  }

  return map;
}

function createBackendCatalogMap(items) {
  const map = new Map();
  const duplicateKeys = [];

  for (const item of items) {
    if (item.is_active === false) continue;

    const category = normalizeText(item.category_code).toUpperCase();
    const name = normalizeText(item.name);

    if (!category || !name) continue;

    const key = parentKey(category, name);

    if (map.has(key)) {
      duplicateKeys.push({
        key,
        firstId: map.get(key)?.id,
        secondId: item.id,
      });
      continue;
    }

    map.set(key, item);
  }

  if (duplicateKeys.length) {
    console.error("\nDuplicate Category + Item keys found in backend:\n");
    for (const duplicate of duplicateKeys) {
      console.error(
        `- ${duplicate.key}: IDs ${duplicate.firstId} and ${duplicate.secondId}`
      );
    }
    throw new Error(
      "Backend catalog contains duplicate parent keys. Import stopped."
    );
  }

  return map;
}

function resolveParents({
  rows,
  referencedParents,
  genericMap,
  backendCatalogMap,
  unitMap,
}) {
  const errors = [];
  const resolvedParents = new Map();

  for (const pKey of referencedParents) {
    const generic = genericMap.get(pKey);
    const backendItem = backendCatalogMap.get(pKey);

    if (!generic) {
      errors.push(`Parent ${pKey} is missing from Generic Items Excel.`);
      continue;
    }

    if (!backendItem) {
      errors.push(
        `Parent "${generic.category} | ${generic.item}" ` +
        `does not exist as an active Generic Item in the backend.`
      );
      continue;
    }

    const actualCategory = normalizeText(
      backendItem.category_code
    ).toUpperCase();

    const actualName = normalizeText(backendItem.name);
    const actualItemCode = normalizeText(
      backendItem.item_code
    ).toUpperCase();
    const actualUnitCode = normalizeText(
      backendItem.unit_code
    ).toUpperCase();

    const expectedItemCode = normalizeCatalogCode(generic.item);

    if (actualCategory !== generic.category) {
      errors.push(
        `Backend parent ID ${backendItem.id}: Category mismatch for ` +
        `"${generic.item}". Expected ${generic.category}, got ${actualCategory}`
      );
    }

    if (normalizeKey(actualName) !== normalizeKey(generic.item)) {
      errors.push(
        `Backend parent ID ${backendItem.id}: Item name mismatch. ` +
        `Expected "${generic.item}", got "${actualName}"`
      );
    }

    if (actualItemCode !== expectedItemCode) {
      errors.push(
        `Backend parent ID ${backendItem.id}: item_code mismatch for ` +
        `"${generic.category} | ${generic.item}". ` +
        `Expected ${expectedItemCode}, got ${actualItemCode}`
      );
    }

    if (actualUnitCode !== generic.unitCode) {
      errors.push(
        `Backend parent ID ${backendItem.id}: UOM mismatch for ` +
        `"${generic.category} | ${generic.item}". ` +
        `Excel expects ${generic.unitCode}, backend has ${actualUnitCode}`
      );
    }

    if (!backendItem.general_sub_item_id) {
      errors.push(
        `Backend parent ID ${backendItem.id}: ` +
        `"${generic.category} | ${generic.item}" has no active General Sub-Item.`
      );
    }

    resolvedParents.set(pKey, {
      ...generic,
      parentKey: pKey,
      backendItem,
      catalogItemId: Number(backendItem.id),
      generalSubItemId: Number(backendItem.general_sub_item_id),
    });
  }

  // Validate every Sub-Item UOM against the live UOM lookup as well.
  for (const row of rows) {
    if (!unitMap.has(row.unitCode)) {
      errors.push(
        `Excel row ${row.excelRow}: Unit "${row.unitCode}" ` +
        `does not exist as an active UOM in the backend.`
      );
    }
  }

  if (errors.length) {
    console.error("\nParent/UOM backend pre-flight failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    throw new Error(
      `Backend parent/UOM pre-flight failed with ${errors.length} error(s).`
    );
  }

  return resolvedParents;
}

// ============================================================
// EXISTING SUB-ITEM LOOKUPS
// ============================================================

async function runWithConcurrency(values, concurrency, worker) {
  let nextIndex = 0;
  const results = new Array(values.length);

  async function runner() {
    while (true) {
      const index = nextIndex++;
      if (index >= values.length) return;
      results[index] = await worker(values[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    () => runner()
  );

  await Promise.all(workers);
  return results;
}

async function loadExistingSubItems(resolvedParents) {
  const parents = [...resolvedParents.values()];
  const existingByParent = new Map();
  let completed = 0;

  console.log(
    `Loading existing Sub-Items for ${parents.length} referenced parents...`
  );

  await runWithConcurrency(
    parents,
    LOOKUP_CONCURRENCY,
    async (parent) => {
      const response = await apiRequest(
        `/api/master-catalog/catalog-items/${parent.catalogItemId}/sub-items`
      );

      const existing = unwrapData(response);
      const codeMap = new Map();
      const nameMap = new Map();

      for (const subItem of existing) {
        const codeKey = subItemCodeKey(subItem.sub_item_code);
        const nameKey = subItemNameKey(subItem.name);

        if (codeKey) codeMap.set(codeKey, subItem);
        if (nameKey) nameMap.set(nameKey, subItem);
      }

      existingByParent.set(parent.parentKey, {
        items: existing,
        codeMap,
        nameMap,
      });

      completed++;
      if (completed % 25 === 0 || completed === parents.length) {
        console.log(
          `  Existing Sub-Item lookup: ${completed}/${parents.length} parents`
        );
      }
    }
  );

  return existingByParent;
}

function buildImportPlan(rows, resolvedParents, existingByParent, unitMap) {
  const conflicts = [];
  const plan = [];

  for (const row of rows) {
    const parent = resolvedParents.get(row.parentKey);

    if (!parent) {
      conflicts.push(
        `Row ${row.excelRow}: Parent was not resolved for ` +
        `"${row.category} | ${row.item}"`
      );
      continue;
    }

    const unit = unitMap.get(row.unitCode);

    if (!unit) {
      conflicts.push(
        `Row ${row.excelRow}: UOM "${row.unitCode}" was not resolved.`
      );
      continue;
    }

    const existing = existingByParent.get(row.parentKey) || {
      codeMap: new Map(),
      nameMap: new Map(),
    };

    const existingByCode = existing.codeMap.get(
      subItemCodeKey(row.assetCode)
    );

    const existingByName = existing.nameMap.get(
      subItemNameKey(row.subItem)
    );

    if (!existingByCode && !existingByName) {
      plan.push({
        ...row,
        parent,
        unit,
        action: "CREATE",
      });
      continue;
    }

    // Exact same active record => safe rerun, skip it.
    if (
      existingByCode &&
      existingByName &&
      Number(existingByCode.id) === Number(existingByName.id)
    ) {
      plan.push({
        ...row,
        parent,
        unit,
        action: "SKIP_EXISTING",
        existingSubItem: existingByCode,
      });
      continue;
    }

    if (existingByCode) {
      conflicts.push(
        `Row ${row.excelRow}: Asset Code "${row.assetCode}" already exists ` +
        `under "${row.category} | ${row.item}" as ` +
        `"${existingByCode.name}" (Sub-Item ID ${existingByCode.id}), ` +
        `but Excel wants "${row.subItem}".`
      );
    }

    if (existingByName) {
      conflicts.push(
        `Row ${row.excelRow}: Sub-Item name "${row.subItem}" already exists ` +
        `under "${row.category} | ${row.item}" with code ` +
        `"${existingByName.sub_item_code}" (Sub-Item ID ${existingByName.id}), ` +
        `but Excel wants Asset Code "${row.assetCode}".`
      );
    }
  }

  if (conflicts.length) {
    console.error("\nExisting database Sub-Item conflicts detected:\n");
    for (const conflict of conflicts) console.error(`- ${conflict}`);
    throw new Error(
      `Import stopped because ${conflicts.length} existing Sub-Item conflict(s) were found.`
    );
  }

  return plan;
}

function writeReport(results) {
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(results, null, 2),
    "utf8"
  );
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n========================================");
  console.log("QNH MASTER CATALOG SUB-ITEM IMPORT");
  console.log("========================================\n");

  if (!PORTAL_TOKEN) {
    throw new Error(
      "PORTAL_TOKEN environment variable is required."
    );
  }

  console.log(`API: ${API_BASE_URL}`);
  console.log(`Sub-Items Excel: ${SUB_ITEMS_EXCEL_PATH}`);
  console.log(`Generic Items Excel: ${GENERIC_ITEMS_EXCEL_PATH}`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "IMPORT"}\n`);

  // ----------------------------------------------------------
  // 1. Read and validate both Excel files
  // ----------------------------------------------------------

  console.log("Reading Generic Items Excel...");
  const genericExcel = readExcel(
    GENERIC_ITEMS_EXCEL_PATH,
    "Generic Items Excel"
  );
  console.log(`Sheet: ${genericExcel.sheetName}`);
  console.log(`Rows found: ${genericExcel.rows.length}`);

  const genericMap = validateGenericItemsExcel(genericExcel.rows);
  console.log(
    `Generic Items Excel validation passed: ${genericMap.size} items\n`
  );

  console.log("Reading Sub-Items Excel...");
  const subItemsExcel = readExcel(
    SUB_ITEMS_EXCEL_PATH,
    "Sub-Items Excel"
  );
  console.log(`Sheet: ${subItemsExcel.sheetName}`);
  console.log(`Rows found: ${subItemsExcel.rows.length}`);

  const {
    rows,
    referencedParents,
  } = validateSubItemsExcel(subItemsExcel.rows, genericMap);

  console.log(
    `Sub-Items Excel validation passed: ${rows.length} Sub-Items`
  );
  console.log(
    `Unique Generic parents referenced: ${referencedParents.size}\n`
  );

  // ----------------------------------------------------------
  // 2. Resolve Master Catalog admin workspace
  // ----------------------------------------------------------

  await findMasterCatalogWorkspace();

  console.log(
    "Checking authentication and Master Catalog permission..."
  );

  let catalogItemsResponse;

  try {
    catalogItemsResponse = await apiRequest(
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
        "can_manage_budget_catalog permission."
      );
    }

    throw error;
  }

  console.log("Permission check passed.\n");

  // ----------------------------------------------------------
  // 3. Load live UOM + catalog items and resolve parent IDs
  // ----------------------------------------------------------

  console.log("Loading units of measure...");
  const unitsResponse = await apiRequest(
    "/api/master-catalog/units-of-measure"
  );
  const units = unwrapData(unitsResponse);
  const unitMap = createUnitMap(units);

  console.log(
    `Units: ${[...unitMap.keys()].join(", ")}\n`
  );

  const backendCatalogItems = unwrapData(catalogItemsResponse);
  const backendCatalogMap = createBackendCatalogMap(
    backendCatalogItems
  );

  console.log(
    `Active Generic Items returned by backend: ${backendCatalogMap.size}`
  );

  console.log("Resolving Excel parents to live database Item IDs...");

  const resolvedParents = resolveParents({
    rows,
    referencedParents,
    genericMap,
    backendCatalogMap,
    unitMap,
  });

  console.log(
    `Parent resolution passed: ${resolvedParents.size}/${referencedParents.size} parents resolved\n`
  );

  // ----------------------------------------------------------
  // 4. Load existing Sub-Items and build a safe import plan
  // ----------------------------------------------------------

  const existingByParent = await loadExistingSubItems(
    resolvedParents
  );

  const plan = buildImportPlan(
    rows,
    resolvedParents,
    existingByParent,
    unitMap
  );

  const toCreate = plan.filter(
    (row) => row.action === "CREATE"
  );
  const existingToSkip = plan.filter(
    (row) => row.action === "SKIP_EXISTING"
  );

  console.log("\n========================================");
  console.log("PRE-FLIGHT PASSED");
  console.log("========================================");
  console.log(`Excel Sub-Items:          ${rows.length}`);
  console.log(`Parents referenced:       ${referencedParents.size}`);
  console.log(`Parents resolved:         ${resolvedParents.size}`);
  console.log(`Already existing (exact): ${existingToSkip.length}`);
  console.log(`Ready to create:          ${toCreate.length}`);
  console.log("Conflicts:                0");

  // ----------------------------------------------------------
  // 5. Prepare report
  // ----------------------------------------------------------

  const results = {
    total: rows.length,
    parentsReferenced: referencedParents.size,
    parentsResolved: resolvedParents.size,
    readyToCreate: toCreate.length,
    created: 0,
    skipped: existingToSkip.length,
    failed: 0,
    dryRun: DRY_RUN,
    skippedItems: existingToSkip.map((row) => ({
      excelRow: row.excelRow,
      assetCode: row.assetCode,
      category: row.category,
      item: row.item,
      catalogItemId: row.parent.catalogItemId,
      subItem: row.subItem,
      catalogSubItemId: row.existingSubItem?.id ?? null,
      reason: "Exact Sub-Item already exists",
    })),
    createdItems: [],
    failedItems: [],
  };

  // ----------------------------------------------------------
  // 6. Dry run stops here: no POST requests
  // ----------------------------------------------------------

  if (DRY_RUN) {
    console.log("\nDRY RUN - no Sub-Items will be created.\n");

    for (let index = 0; index < toCreate.length; index++) {
      const row = toCreate[index];
      const position = `[${index + 1}/${toCreate.length}]`;

      console.log(
        `${position} DRYRUN  ${row.assetCode} | ` +
        `${row.category} | ${row.item} -> ` +
        `parentId=${row.parent.catalogItemId} | ` +
        `${row.subItem} | ${row.unitCode}->${row.unit.id}`
      );
    }

    writeReport(results);

    console.log("\n========================================");
    console.log("DRY RUN COMPLETE");
    console.log("========================================");
    console.log(`Total:           ${results.total}`);
    console.log(`Would create:    ${results.readyToCreate}`);
    console.log(`Already exists:  ${results.skipped}`);
    console.log(`Failed:          ${results.failed}`);
    console.log(`\nReport:\n${REPORT_PATH}`);
    return;
  }

  // ----------------------------------------------------------
  // 7. Actual import - sequential POST requests
  // ----------------------------------------------------------

  console.log("\nStarting Sub-Item import...\n");

  for (let index = 0; index < toCreate.length; index++) {
    const row = toCreate[index];
    const position = `[${index + 1}/${toCreate.length}]`;

    const payload = {
      sub_item_code: row.assetCode,
      name: row.subItem,
      default_specification: null,
      default_unit_of_measure_id: Number(row.unit.id),
      is_default_general: false,
    };

    try {
      const response = await apiRequest(
        `/api/master-catalog/catalog-items/${row.parent.catalogItemId}/sub-items`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const created = response?.data;

      console.log(
        `${position} CREATED ${row.assetCode} | ` +
        `${row.category} | ${row.item} | ` +
        `${row.subItem} | id=${created?.id ?? "?"}`
      );

      results.created++;
      results.createdItems.push({
        excelRow: row.excelRow,
        assetCode: row.assetCode,
        category: row.category,
        item: row.item,
        catalogItemId: row.parent.catalogItemId,
        subItem: row.subItem,
        catalogSubItemId: created?.id ?? null,
        subItemCode: created?.sub_item_code ?? row.assetCode,
        unitCode: row.unitCode,
        unitId: Number(row.unit.id),
      });
    } catch (error) {
      // Do NOT silently skip a 409 here. The active-record preflight already
      // skipped exact matches. A new 409 can represent an inactive duplicate
      // or another conflict and should be reviewed.
      console.error(
        `${position} FAILED  ${row.assetCode} | ` +
        `${row.category} | ${row.item} | ` +
        `${row.subItem} - ${error.message}`
      );

      results.failed++;
      results.failedItems.push({
        excelRow: row.excelRow,
        assetCode: row.assetCode,
        category: row.category,
        item: row.item,
        catalogItemId: row.parent.catalogItemId,
        subItem: row.subItem,
        status: error.status || null,
        error: error.message,
        errorBody: error.body || null,
      });
    }
  }

  // ----------------------------------------------------------
  // 8. Report + final summary
  // ----------------------------------------------------------

  writeReport(results);

  console.log("\n========================================");
  console.log("IMPORT COMPLETE");
  console.log("========================================");
  console.log(`Total Excel rows: ${results.total}`);
  console.log(`Created:          ${results.created}`);
  console.log(`Skipped existing: ${results.skipped}`);
  console.log(`Failed:           ${results.failed}`);
  console.log(`\nReport:\n${REPORT_PATH}`);

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
    console.error(JSON.stringify(error.body, null, 2));
  }

  process.exit(1);
});
