import { poolPromise, sql } from "../config/db.js";

/**
 * Get budget basic info (for validation)
 */
export async function getBudgetByIdRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.Int, budgetId)
    .query(`
      SELECT 
        b.id,
        b.status,
        b.department_id,
        b.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status
      FROM BS_budgets b
      JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      WHERE b.id = @budgetId
        AND b.is_active = 1
    `);

  return result.recordset[0] || null;
}

/**
 * Validate category & type relation
 */
export async function validateTypeExistsRepo(typeId) {
  const pool = await poolPromise;

  const result = await pool.request().input("typeId", sql.Int, typeId).query(`
      SELECT TOP 1 id
      FROM BS_budget_types
      WHERE id = @typeId
        AND is_active = 1
    `);

  return !!result.recordset[0];
}

export async function getExistingBudgetItemTypeRepo(budgetId, typeId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.Int, budgetId)
    .input("typeId", sql.Int, typeId).query(`
      SELECT TOP 1 id
      FROM BS_budget_items
      WHERE budget_id = @budgetId
        AND type_id = @typeId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

/**
 * Insert budget item
 */
export async function createBudgetItemRepo({
  budgetId,
  typeId,
  quantity,
  unitPrice,
  totalAmount,
  distributionMethod,
  distributionLevel,
  createdBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.Int, budgetId)
    .input("typeId", sql.Int, typeId)
    .input("quantity", sql.Decimal(18, 2), quantity)
    .input("unitPrice", sql.Decimal(18, 2), unitPrice)
    .input("totalAmount", sql.Decimal(18, 2), totalAmount)
    .input("distributionMethod", sql.VarChar(50), distributionMethod)
    .input("distributionLevel", sql.VarChar(50), distributionLevel)
    .input("createdBy", sql.Int, createdBy).query(`
      INSERT INTO BS_budget_items (
        budget_id,
        type_id,
        quantity,
        unit_price,
        total_amount,
        distribution_method,
        distribution_level,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @budgetId,
        @typeId,
        @quantity,
        @unitPrice,
        @totalAmount,
        @distributionMethod,
        @distributionLevel,
        @createdBy
      )
    `);

  return result.recordset[0];
}

/**
 * Insert distribution rows
 */
export async function insertDistributionRepo(itemId, distributionRows) {
  if (!distributionRows.length) return;

  const pool = await poolPromise;

  const request = pool.request().input("itemId", sql.Int, itemId);

  const values = distributionRows
    .map((row, index) => {
      request.input(`period_type_${index}`, sql.VarChar(20), row.period_type);
      request.input(`period_no_${index}`, sql.Int, row.period_no);
      request.input(`quantity_${index}`, sql.Decimal(18, 2), row.quantity);

      return `(
        @itemId,
        @period_type_${index},
        @period_no_${index},
        @quantity_${index}
      )`;
    })
    .join(",");

  await request.query(`
    INSERT INTO BS_budget_item_distribution (
      budget_item_id,
      period_type,
      period_no,
      quantity
    )
    VALUES ${values}
  `);
}

export async function getBudgetItemsByBudgetIdRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.Int, budgetId)
    .query(`
      SELECT
        bi.id,
        bi.budget_id,
     t.category_id,
c.name AS category_name,
        bi.type_id,
        t.name AS type_name,
        t.expense_type,
        bi.quantity,
        bi.unit_price,
        bi.total_amount,
        bi.distribution_method,
        bi.distribution_level,

        d.period_type,
        d.period_no,
        d.quantity AS distribution_quantity
      FROM BS_budget_items bi
     INNER JOIN BS_budget_types t
  ON t.id = bi.type_id
INNER JOIN BS_budget_categories c
  ON c.id = t.category_id
      LEFT JOIN BS_budget_item_distribution d
        ON d.budget_item_id = bi.id
      WHERE bi.budget_id = @budgetId
        AND bi.is_active = 1
      ORDER BY bi.id ASC, d.period_no ASC
    `);

  return result.recordset;
}

export async function deleteBudgetItemRepo({ budgetId, itemId }) {
  const pool = await poolPromise;

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request1 = new sql.Request(transaction);

    // Delete distributions first because they depend on item_id
    await request1.input("itemId", sql.Int, itemId).query(`
        DELETE FROM BS_budget_item_distribution
        WHERE budget_item_id = @itemId
      `);

    const request2 = new sql.Request(transaction);

    const result = await request2
      .input("budgetId", sql.Int, budgetId)
      .input("itemId", sql.Int, itemId).query(`
        DELETE FROM BS_budget_items
        WHERE id = @itemId
          AND budget_id = @budgetId
      `);

    await transaction.commit();

    return result.rowsAffected[0] > 0;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function replaceBudgetItemsRepo({ budgetId, items, createdBy }) {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Delete old distributions
    await new sql.Request(transaction).input("budgetId", sql.Int, budgetId)
      .query(`
        DELETE d
        FROM BS_budget_item_distribution d
        INNER JOIN BS_budget_items i
          ON i.id = d.budget_item_id
        WHERE i.budget_id = @budgetId
      `);

    // 2. Delete old items
    await new sql.Request(transaction).input("budgetId", sql.Int, budgetId)
      .query(`
        DELETE FROM BS_budget_items
        WHERE budget_id = @budgetId
      `);

    // 3. Insert new items
    for (const item of items) {
      const totalAmount =
        Number(item.quantity || 0) * Number(item.unit_price || 0);

      const itemResult = await new sql.Request(transaction)
        .input("budgetId", sql.Int, budgetId)
        .input("typeId", sql.Int, Number(item.type_id))
        .input("quantity", sql.Decimal(18, 2), Number(item.quantity || 0))
        .input("unitPrice", sql.Decimal(18, 2), Number(item.unit_price || 0))
        .input("totalAmount", sql.Decimal(18, 2), totalAmount)
        .input("distributionMethod", sql.VarChar(30), item.distribution_method)
        .input("distributionLevel", sql.VarChar(30), item.distribution_level)
        .input("createdBy", sql.VarChar(50), createdBy).query(`
          INSERT INTO BS_budget_items (
            budget_id,
            type_id,
            quantity,
            unit_price,
            total_amount,
            distribution_method,
            distribution_level,
            created_by
          )
          OUTPUT INSERTED.id
          VALUES (
            @budgetId,
            @typeId,
            @quantity,
            @unitPrice,
            @totalAmount,
            @distributionMethod,
            @distributionLevel,
            @createdBy
          )
        `);

      const budgetItemId = itemResult.recordset[0].id;

      for (const period of item.distribution || []) {
        await new sql.Request(transaction)
          .input("budgetItemId", sql.Int, budgetItemId)
          .input("periodType", sql.VarChar(20), period.period_type)
          .input("periodNo", sql.Int, Number(period.period_no))
          .input("quantity", sql.Decimal(18, 2), Number(period.quantity || 0))
          .query(`
            INSERT INTO BS_budget_item_distribution (
              budget_item_id,
              period_type,
              period_no,
              quantity
            )
            VALUES (
              @budgetItemId,
              @periodType,
              @periodNo,
              @quantity
            )
          `);
      }
    }

    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
