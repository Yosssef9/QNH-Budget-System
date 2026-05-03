import { poolPromise } from "../config/db.js";

export async function getBudgetAccessDepartmentsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      id,
      name
    FROM BS_departments
    ORDER BY name
  `);

  return result.recordset;
}
