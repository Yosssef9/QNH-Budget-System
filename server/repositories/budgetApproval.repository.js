import { poolPromise, sql } from "../config/db.js";

export async function getPendingBudgetsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      b.id,
      b.department_id,
      d.name AS department_name,
      b.financial_year_id,
      fy.year AS financial_year,
      b.status,
      b.submitted_by,
      u.USER_NAME AS submitted_by_name,
      b.submitted_at,
      COUNT(bi.id) AS items_count,
      ISNULL(SUM(bi.total_amount), 0) AS total_amount
    FROM BS_budgets b
    INNER JOIN BS_departments d ON d.id = b.department_id
    INNER JOIN BS_financial_years fy ON fy.id = b.financial_year_id
    LEFT JOIN users u ON u.USER_ID = b.submitted_by
    LEFT JOIN BS_budget_items bi
      ON bi.budget_id = b.id
     AND bi.is_active = 1
    WHERE b.status = 'PENDING_APPROVAL'
      AND b.is_active = 1
    GROUP BY
      b.id,
      b.department_id,
      d.name,
      b.financial_year_id,
      fy.year,
      b.status,
      b.submitted_by,
      u.USER_NAME,
      b.submitted_at
    ORDER BY b.submitted_at DESC
  `);

  return result.recordset;
}

export async function getBudgetHeaderRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT TOP 1
        b.id,
        b.department_id,
        d.name AS department_name,
        b.financial_year_id,
        fy.year AS financial_year,
        b.status,
        b.created_by,
        b.created_at,
        b.submitted_by,
        b.submitted_at,
        b.approved_by,
        b.approved_at,
        b.returned_by,
        b.returned_at
      FROM BS_budgets b
      INNER JOIN BS_departments d ON d.id = b.department_id
      INNER JOIN BS_financial_years fy ON fy.id = b.financial_year_id
      WHERE b.id = @budgetId
        AND b.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getBudgetItemsForReviewRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
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
        bi.distribution_level
      FROM BS_budget_items bi
      INNER JOIN BS_budget_types t
        ON t.id = bi.type_id
      INNER JOIN BS_budget_categories c
        ON c.id = t.category_id
      WHERE bi.budget_id = @budgetId
        AND bi.is_active = 1
      ORDER BY c.name, t.name
    `);

  return result.recordset;
}

export async function approveBudgetRepo({ budgetId, approvedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.BigInt, budgetId)
    .input("approvedBy", sql.Int, approvedBy).query(`
      UPDATE BS_budgets
      SET
        status = 'APPROVED',
        approved_by = @approvedBy,
        approved_at = GETDATE(),
        returned_by = NULL,
        returned_at = NULL,
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @budgetId
        AND status = 'PENDING_APPROVAL'
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function returnBudgetRepo({ budgetId, returnedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.BigInt, budgetId)
    .input("returnedBy", sql.Int, returnedBy).query(`
      UPDATE BS_budgets
      SET
        status = 'RETURNED',
        returned_by = @returnedBy,
        returned_at = GETDATE(),
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @budgetId
        AND status = 'PENDING_APPROVAL'
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getBudgetComparisonRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      b.id AS budget_id,
      b.department_id,
      d.name AS department_name,
      b.financial_year_id,
      fy.year AS financial_year,
      b.status,

      t.category_id,
      c.name AS category_name,
      bi.type_id,
      t.name AS type_name,
      t.expense_type,

      bi.quantity,
      bi.unit_price,
      bi.total_amount,
      bi.distribution_method,
      bi.distribution_level
    FROM BS_budgets b
    INNER JOIN BS_departments d
      ON d.id = b.department_id
    INNER JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id
    INNER JOIN BS_budget_items bi
      ON bi.budget_id = b.id
     AND bi.is_active = 1
    INNER JOIN BS_budget_types t
      ON t.id = bi.type_id
    INNER JOIN BS_budget_categories c
      ON c.id = t.category_id
    WHERE b.is_active = 1
    ORDER BY
      fy.year DESC,
      d.name,
      c.name,
      t.name
  `);

  return result.recordset;
}
export async function getApprovedBudgetsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      b.id,
      b.department_id,
      d.name AS department_name,
      b.financial_year_id,
      fy.year AS financial_year,
      b.status,
      b.approved_by,
      u.USER_NAME AS approved_by_name,
      b.approved_at,
      COUNT(bi.id) AS items_count,
      ISNULL(SUM(bi.total_amount), 0) AS total_amount
    FROM BS_budgets b
    INNER JOIN BS_departments d ON d.id = b.department_id
    INNER JOIN BS_financial_years fy ON fy.id = b.financial_year_id
    LEFT JOIN users u ON u.USER_ID = b.approved_by
    LEFT JOIN BS_budget_items bi
      ON bi.budget_id = b.id
     AND bi.is_active = 1
    WHERE b.status = 'APPROVED'
      AND b.is_active = 1
    GROUP BY
      b.id,
      b.department_id,
      d.name,
      b.financial_year_id,
      fy.year,
      b.status,
      b.approved_by,
      u.USER_NAME,
      b.approved_at
    ORDER BY b.approved_at DESC
  `);

  return result.recordset;
}
