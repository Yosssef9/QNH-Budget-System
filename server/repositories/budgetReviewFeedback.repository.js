import { poolPromise, sql } from "../config/db.js";

export async function getBudgetReviewFeedbackRepo(budgetId) {
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
        n.created_at,
        bi.type_id,
        t.name AS type_name,
        c.name AS category_name
      FROM BS_budget_notes n
      LEFT JOIN BS_budget_items bi
        ON bi.id = n.budget_item_id
      LEFT JOIN BS_budget_types t
        ON t.id = bi.type_id
      LEFT JOIN BS_budget_categories c
        ON c.id = t.category_id
      LEFT JOIN users u
        ON u.USER_ID = n.created_by
      WHERE n.budget_id = @budgetId
        AND n.note_type IN ('GENERAL_RETURN', 'ITEM_RETURN')
      ORDER BY n.created_at DESC, n.id DESC
    `);

  return result.recordset;
}

export async function getBudgetOwnerRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT
        id,
        department_id,
        status
      FROM BS_budgets
      WHERE id = @budgetId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}