import { poolPromise, sql } from "../config/db.js";

export async function getBudgetItemBalanceRepo(itemId) {
  const pool = await poolPromise;

  const result = await pool.request().input("itemId", sql.Int, itemId).query(`
      SELECT
        bi.id,

        bi.total_amount AS approved_amount,

        ISNULL((
            SELECT SUM(t.amount)
            FROM BS_budget_transfers t
            WHERE t.to_budget_item_id = bi.id
            AND t.status = 'APPROVED'
        ),0) AS transfer_in,

        ISNULL((
            SELECT SUM(t.amount)
            FROM BS_budget_transfers t
            WHERE t.from_budget_item_id = bi.id
            AND t.status = 'APPROVED'
        ),0) AS transfer_out,

        ISNULL((
            SELECT SUM(p.amount)
            FROM BS_budget_po_links p
            WHERE p.budget_item_id = bi.id
            AND p.is_active = 1
        ),0) AS po_used

      FROM BS_budget_items bi
      WHERE bi.id = @itemId
    `);

  return result.recordset[0] || null;
}
export async function getBudgetBalanceSummaryRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT
        bi.id,

        bt.name AS type_name,

        bi.total_amount AS approved_amount,

        bi.created_from_transfer,
        bi.source_transfer_id

      FROM BS_budget_items bi

      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id

      WHERE bi.budget_id = @budgetId
        AND bi.is_active = 1
    `);

  return result.recordset;
}
