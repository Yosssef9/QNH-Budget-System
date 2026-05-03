import { poolPromise } from "../config/db.js";

export async function getBudgetRolesRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      id,
      name
    FROM BS_budget_roles
    ORDER BY name
  `);

  return result.recordset;
}
