import { poolPromise, sql } from "../config/db.js";

export async function findBudgetRoleByIdRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.Int, id).query(`
      SELECT *
      FROM BS_budget_roles
      WHERE id = @id
    `);

  return result.recordset[0] || null;
}
