import { poolPromise, sql } from "../config/db.js";
import {
  PERMISSION_CODE_VALUES,
} from "../../shared/permissions/permissionCodes.js";

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

async function main() {
  const expectedCodes = [...PERMISSION_CODE_VALUES].sort();
  const duplicateConstants = findDuplicates(expectedCodes);

  if (duplicateConstants.length) {
    throw new Error(
      `Duplicate permission constants: ${duplicateConstants.join(", ")}`,
    );
  }

  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT permission_code, is_active
    FROM dbo.BS_budget_permissions;

    SELECT p.permission_code
    FROM dbo.BS_budget_role_permissions AS rp
    INNER JOIN dbo.BS_budget_permissions AS p
      ON p.id = rp.permission_id
    WHERE p.is_active = 0;

    SELECT p.permission_code
    FROM dbo.BS_budget_user_permission_overrides AS o
    INNER JOIN dbo.BS_budget_permissions AS p
      ON p.id = o.permission_id
    WHERE o.is_active = 1
      AND p.is_active = 0;
  `);

  const dbRows = result.recordsets?.[0] || [];
  const inactiveRoleGrantRows = result.recordsets?.[1] || [];
  const inactiveOverrideRows = result.recordsets?.[2] || [];
  const activeDbCodes = dbRows
    .filter((row) => row.is_active)
    .map((row) => row.permission_code)
    .sort();
  const duplicateDbCodes = findDuplicates(dbRows.map((row) => row.permission_code));

  const missingInDb = expectedCodes.filter((code) => !activeDbCodes.includes(code));
  const missingInContract = activeDbCodes.filter(
    (code) => !expectedCodes.includes(code),
  );

  const failures = [];

  if (duplicateDbCodes.length) {
    failures.push(`Duplicate DB permission codes: ${duplicateDbCodes.join(", ")}`);
  }

  if (missingInDb.length) {
    failures.push(`Missing active DB permissions: ${missingInDb.join(", ")}`);
  }

  if (missingInContract.length) {
    failures.push(
      `Active DB permissions missing from contract: ${missingInContract.join(", ")}`,
    );
  }

  if (inactiveRoleGrantRows.length) {
    failures.push(
      `Inactive permissions used by role grants: ${inactiveRoleGrantRows
        .map((row) => row.permission_code)
        .join(", ")}`,
    );
  }

  if (inactiveOverrideRows.length) {
    failures.push(
      `Inactive permissions used by active overrides: ${inactiveOverrideRows
        .map((row) => row.permission_code)
        .join(", ")}`,
    );
  }

  if (failures.length) {
    throw new Error(failures.join("\n"));
  }

  console.log(
    `Canonical permission validation passed for ${expectedCodes.length} permissions.`,
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    sql.close();
  });
