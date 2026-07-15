import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

const boundaryPaths = [
  "server/modules/access-management",
  "server/modules/department-budgets",
  "server/modules/financial-years",
  "server/modules/item-requests",
  "server/modules/master-catalog",
  "server/shared/middleware",
  "server/notifications",
  "server/repositories/notificationRecipients.repository.js",
  "client/src/helpers",
  "client/src/context",
  "client/src/routes",
  "client/src/layouts",
  "client/src/config",
  "client/src/pages/BudgetAccessManagementPage.jsx",
  "client/src/pages/BudgetSetupPage.jsx",
  "client/src/pages/budget",
  "client/src/api/itemRequests.api.js",
  "client/src/api/budget.api.js",
  "client/src/api/budgetSetup.api.js",
];

const allowedFiles = new Set([
  path.normalize("server/tests/modules/access-management/access.constants.test.js"),
  path.normalize("shared/permissions/permissionCodes.js"),
]);

const rawPermissionPattern = /["']can_[a-z_]+["']/g;
const legacyNamePattern =
  /can_(view_budget|edit_budget|request_transfer|approve_transfer|approve_budget|manage_users|manage_categories|view_reports|manage_financial_years|view_po_links|request_po_links|view_all_po_link_requests|approve_po_links)\b/g;
const dynamicPermissionSqlPattern =
  /(permissionColumn|r\.\$\{|brp\.\$\{|COALESCE\(r\.|LEGACY_PERMISSION_ALIASES|buildPermissionMap)/g;

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function walk(targetPath) {
  if (!fs.existsSync(targetPath)) return [];

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];

  return fs.readdirSync(targetPath).flatMap((entry) => {
    if (["node_modules", "dist", "build", "coverage", ".git"].includes(entry)) {
      return [];
    }

    return walk(path.join(targetPath, entry));
  });
}

const files = boundaryPaths.flatMap((relativePath) =>
  walk(path.join(repoRoot, relativePath)),
);
const violations = [];

for (const file of files) {
  if (!/\.(js|jsx|mjs)$/.test(file)) continue;

  const relative = path.normalize(path.relative(repoRoot, file));
  if (allowedFiles.has(relative)) continue;

  const source = fs.readFileSync(file, "utf8");
  const rawMatches = source.match(rawPermissionPattern) || [];
  const legacyMatches = source.match(legacyNamePattern) || [];
  const dynamicMatches = source.match(dynamicPermissionSqlPattern) || [];

  if (rawMatches.length || legacyMatches.length || dynamicMatches.length) {
    violations.push({
      file: toRepoRelative(file),
      rawMatches: [...new Set(rawMatches)],
      legacyMatches: [...new Set(legacyMatches)],
      dynamicMatches: [...new Set(dynamicMatches)],
    });
  }
}

if (violations.length) {
  console.error("Permission boundary scan failed:");
  for (const violation of violations) {
    console.error(JSON.stringify(violation, null, 2));
  }
  process.exitCode = 1;
} else {
  console.log("Permission boundary scan passed.");
}
