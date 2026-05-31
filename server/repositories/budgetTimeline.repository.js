import { poolPromise, sql } from "../config/db.js";

export async function getBudgetTimelineRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.NVarChar(100), String(budgetId)).query(`
      SELECT
        id,
        action,
        description,
        user_name,
        user_code,
      created_at
      FROM BS_audit_logs
      WHERE
        entity_type = 'BUDGET'
        AND entity_id = @budgetId
      ORDER BY created_at ASC
    `);

  return result.recordset || [];
}
