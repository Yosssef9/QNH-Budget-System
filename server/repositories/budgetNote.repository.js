import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function insertBudgetNoteRepo(
  { budgetId, budgetItemId, noteType, note, createdBy },
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("budgetId", sql.BigInt, budgetId)
    .input("budgetItemId", sql.BigInt, budgetItemId)
    .input("noteType", sql.VarChar(50), noteType)
    .input("note", sql.NVarChar(sql.MAX), note)
    .input("createdBy", sql.Int, createdBy).query(`
      INSERT INTO BS_budget_notes (
        budget_id,
        budget_item_id,
        note_type,
        note,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @budgetId,
        @budgetItemId,
        @noteType,
        @note,
        @createdBy
      )
    `);

  return result.recordset[0];
}

export async function getBudgetNotesRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT
        n.id,
        n.budget_id,
        n.budget_item_id,
        n.note_type,
        n.note,
        n.created_by,
        u.USER_NAME AS created_by_name,
      created_at
      FROM BS_budget_notes n
      LEFT JOIN users u ON u.USER_ID = n.created_by
      WHERE n.budget_id = @budgetId
      ORDER BY n.created_at DESC
    `);

  return result.recordset;
}
