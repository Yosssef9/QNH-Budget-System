import { poolPromise, sql } from "../config/db.js";

/**
 * Get budget basic info (for validation)
 */
export async function getBudgetByIdRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.Int, budgetId)
    .query(`
      SELECT 
        b.id,
        b.status,
        b.department_id,
        b.financial_year_id,
        fy.status AS financial_year_status
      FROM BS_budgets b
      JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      WHERE b.id = @budgetId
    `);

  return result.recordset[0] || null;
}

/**
 * Validate category & type relation
 */
export async function validateCategoryTypeRepo(categoryId, typeId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("typeId", sql.Int, typeId)
    .query(`
      SELECT TOP 1 id
      FROM BS_budget_types
      WHERE id = @typeId
        AND category_id = @categoryId
        AND is_active = 1
    `);

  return !!result.recordset[0];
}

/**
 * Insert budget item
 */
export async function createBudgetItemRepo({
  budgetId,
  categoryId,
  typeId,
  quantity,
  unitPrice,
  totalAmount,
  expenseType,
  createdBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.Int, budgetId)
    .input("categoryId", sql.Int, categoryId)
    .input("typeId", sql.Int, typeId)
    .input("quantity", sql.Decimal(18, 2), quantity)
    .input("unitPrice", sql.Decimal(18, 2), unitPrice)
    .input("totalAmount", sql.Decimal(18, 2), totalAmount)
    .input("expenseType", sql.VarChar(20), expenseType)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      INSERT INTO BS_budget_items (
        budget_id,
        category_id,
        type_id,
        quantity,
        unit_price,
        total_amount,
        expense_type,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @budgetId,
        @categoryId,
        @typeId,
        @quantity,
        @unitPrice,
        @totalAmount,
        @expenseType,
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