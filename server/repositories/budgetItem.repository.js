import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";
export async function getBudgetItemDetails(itemId) {
  const pool = await poolPromise;

  const result = await pool.request().input("itemId", sql.BigInt, itemId)
    .query(`
     SELECT
    bi.id,
    bi.budget_id,
    bi.type_id,

    bi.quantity,
    bi.unit_price,
    bi.total_amount,
    bi.is_project,

    bi.distribution_method,
    bi.distribution_level,

    b.financial_year_id,
    b.status,

    bt.name,
    bt.expense_type,

    fy.status AS financial_year_status

FROM BS_budget_items bi

INNER JOIN BS_budgets b
    ON b.id = bi.budget_id

INNER JOIN BS_budget_types bt
    ON bt.id = bi.type_id

INNER JOIN BS_financial_years fy
    ON fy.id = b.financial_year_id

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
export async function budgetItemTypeExistsRepo(budgetId, typeId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.BigInt, budgetId)
    .input("typeId", sql.BigInt, typeId).query(`
      SELECT TOP 1 id
      FROM BS_budget_items
      WHERE budget_id = @budgetId
        AND type_id = @typeId
        AND is_active = 1
    `);

  return result.recordset.length > 0;
}

export async function getAvailableTransferTypesRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT
          t.id,
          t.category_id,
          c.name AS category_name,
          t.name,
          t.expense_type,

          CASE
            WHEN EXISTS
            (
                SELECT 1
                FROM BS_budget_transfers tr

                INNER JOIN BS_budget_items bi
                    ON bi.id = tr.from_budget_item_id

                WHERE
                    tr.status = 'PENDING_APPROVAL'
                    AND tr.is_new_item = 1
                    AND tr.new_item_type_id = t.id
                    AND bi.budget_id = @budgetId
            )
            THEN 1
            ELSE 0
          END AS has_pending_request

      FROM BS_budget_types t

      INNER JOIN BS_budget_categories c
          ON c.id = t.category_id

      WHERE
          t.is_active = 1
          AND c.is_active = 1

          AND NOT EXISTS
          (
              SELECT 1
              FROM BS_budget_items bi
              WHERE
                  bi.type_id = t.id
                  AND bi.budget_id = @budgetId
                  AND bi.is_active = 1
          )

      ORDER BY
          c.name,
          t.name
    `);

  return result.recordset;
}
export async function createBudgetItemFromTransferRepo(
  {
    budgetId,
    typeId,

    quantity,
    unitPrice,
    amount,

    distributionMethod,
    distributionLevel,

    transferId,
    createdBy,
  },
  transaction = null,
) {
  const pool = await poolPromise;

  const request = createRequest(pool, transaction);

  const result = await request
    .input("budgetId", sql.BigInt, budgetId)
    .input("typeId", sql.Int, typeId)

    .input("quantity", sql.Decimal(18, 2), quantity)
    .input("unitPrice", sql.Decimal(18, 2), unitPrice)
    .input("amount", sql.Decimal(18, 2), amount)

    .input("distributionMethod", sql.VarChar(50), "MONTHLY")
    .input("distributionLevel", sql.VarChar(50), "MONTH")

    .input("transferId", sql.BigInt, transferId)
    .input("createdBy", sql.Int, createdBy).query(`
      INSERT INTO BS_budget_items
      (
        budget_id,
        type_id,

        quantity,
        unit_price,
        total_amount,

        distribution_method,
        distribution_level,

        created_at,
        is_active,
        created_by,

        created_from_transfer,
        source_transfer_id
      )

      OUTPUT INSERTED.*

      VALUES
      (
        @budgetId,
        @typeId,

        @quantity,
        @unitPrice,
        @amount,

        @distributionMethod,
        @distributionLevel,

        GETDATE(),
        1,
        @createdBy,

        1,
        @transferId
      )
    `);

  return result.recordset[0];
}
