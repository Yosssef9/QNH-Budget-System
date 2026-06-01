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
