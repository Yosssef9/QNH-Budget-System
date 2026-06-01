import { poolPromise, sql } from "../config/db.js";

export async function getBudgetItemDetails(itemId) {
  const pool = await poolPromise;

  const result = await pool.request().input("itemId", sql.BigInt, itemId)
    .query(`
      SELECT
          bi.id,
          bi.budget_id,
          bi.type_id,
          bi.total_amount,

          b.financial_year_id,
          b.status,

          bt.name,
          bt.expense_type

      FROM BS_budget_items bi

      INNER JOIN BS_budgets b
          ON b.id = bi.budget_id

      INNER JOIN BS_budget_types bt
          ON bt.id = bi.type_id

      WHERE bi.id = @itemId
    `);

  return result.recordset[0] || null;
}
export async function getTransferEligibleItems(financialYearId = null) {
  const pool = await poolPromise;

  const request = pool.request();

  let whereClause = `
      b.status = 'APPROVED'
      AND bi.is_active = 1
  `;

  if (financialYearId) {
    request.input("financialYearId", sql.Int, financialYearId);

    whereClause += `
      AND b.financial_year_id = @financialYearId
    `;
  }

  const result = await request.query(`
    SELECT
        bi.id,
        bi.budget_id,

        bt.name,
        bt.expense_type,

        bi.total_amount,

        b.department_id,
        b.financial_year_id

    FROM BS_budget_items bi

    INNER JOIN BS_budgets b
        ON b.id = bi.budget_id

    INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id

    WHERE ${whereClause}

    ORDER BY bt.name
  `);

  return result.recordset;
}
