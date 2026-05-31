import { poolPromise, sql } from "../config/db.js";

export async function getCurrentBudgetRepo({ departmentId, financialYearId }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId)
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT TOP 1
        b.id,
        b.department_id,
        d.name AS department_name,

        b.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,

        b.status,
        b.created_by,
        u.USER_NAME AS created_by_name,
        b.created_at,

        b.updated_at,
        b.submitted_by,
        b.submitted_at,
        b.approved_by,
        b.approved_at,
        b.returned_by,
        b.returned_at
      FROM BS_budgets b
      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      INNER JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN users u
        ON u.USER_ID = b.created_by
      WHERE b.department_id = @departmentId
        AND b.financial_year_id = @financialYearId
        AND b.is_active = 1
     AND b.status IN ('DRAFT', 'RETURNED', 'PENDING_APPROVAL', 'APPROVED')
      ORDER BY b.id DESC
    `);

  return result.recordset[0] || null;
}
export async function getMyBudgetsRepo({ departmentId, canSeeAll }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("canSeeAll", sql.Bit, canSeeAll)
    .input("departmentId", sql.Int, departmentId).query(`
      SELECT
        b.id,
        b.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        b.department_id,
        d.name AS department_name,
        b.status,
        b.created_by,
        b.created_at,
        b.updated_at,
        b.submitted_by,
        b.submitted_at,
        b.approved_by,
        b.approved_at,
        b.returned_by,
        b.returned_at,
        COUNT(bi.id) AS items_count,
        ISNULL(SUM(bi.total_amount), 0) AS total_amount
      FROM BS_budgets b
      JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN BS_budget_items bi
        ON bi.budget_id = b.id
       AND bi.is_active = 1
      WHERE
        @canSeeAll = 1
        OR b.department_id = @departmentId
      GROUP BY
        b.id,
        b.financial_year_id,
        fy.year,
        fy.status,
        b.department_id,
        d.name,
        b.status,
        b.created_by,
        b.created_at,
        b.updated_at,
        b.submitted_by,
        b.submitted_at,
        b.approved_by,
        b.approved_at,
        b.returned_by,
        b.returned_at
      ORDER BY fy.year DESC, d.name ASC
    `);

  return result.recordset;
}

export async function findOpenFinancialYearRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT TOP 1 id, year, status
    FROM BS_financial_years
    WHERE status = 'OPEN'
    ORDER BY started_at DESC, id DESC
  `);

  return result.recordset[0] || null;
}

export async function findActiveDepartmentByIdRepo(departmentId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId).query(`
      SELECT TOP 1 id, name
      FROM BS_departments
      WHERE id = @departmentId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function findBudgetByDepartmentAndYearRepo({
  departmentId,
  financialYearId,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId)
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT TOP 1
        b.id,
        b.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        b.department_id,
        d.name AS department_name,
        b.status,
        b.created_by,
        b.created_at,
        b.updated_at
      FROM BS_budgets b
      JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      JOIN BS_departments d
        ON d.id = b.department_id
      WHERE b.department_id = @departmentId
        AND b.financial_year_id = @financialYearId
        AND b.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function createBudgetRepo({
  departmentId,
  financialYearId,
  createdBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId)
    .input("financialYearId", sql.Int, financialYearId)
    .input("createdBy", sql.Int, createdBy).query(`
      INSERT INTO BS_budgets (
        department_id,
        financial_year_id,
        status,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @departmentId,
        @financialYearId,
        'DRAFT',
        @createdBy
      )
    `);

  return result.recordset[0];
}

export async function getBudgetForSubmitRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
     SELECT TOP 1
  b.id,
  b.department_id,
  b.financial_year_id,
  fy.status AS financial_year_status,
  b.status,
  b.is_active
FROM BS_budgets b
INNER JOIN BS_financial_years fy
  ON fy.id = b.financial_year_id
WHERE b.id = @budgetId
  AND b.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function countActiveBudgetItemsRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT COUNT(*) AS count
      FROM BS_budget_items
      WHERE budget_id = @budgetId
        AND is_active = 1
    `);

  return result.recordset[0]?.count || 0;
}

export async function submitBudgetRepo({ budgetId, submittedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.BigInt, budgetId)
    .input("submittedBy", sql.Int, submittedBy).query(`
      UPDATE BS_budgets
      SET
        status = 'PENDING_APPROVAL',
        submitted_by = @submittedBy,
        submitted_at = GETUTCDATE(),
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @budgetId
        AND status IN ('DRAFT', 'RETURNED')
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}
export async function getBudgetByIdRepo(budgetId) {
  const pool = await poolPromise;

  const budgetResult = await pool.request().input("budgetId", sql.Int, budgetId)
    .query(`
      SELECT TOP 1
        b.*,
        d.name AS department_name,
        fy.year AS financial_year,
        fy.status AS financial_year_status
      FROM BS_budgets b
      LEFT JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      WHERE b.id = @budgetId
        AND b.is_active = 1
    `);

  const budget = budgetResult.recordset[0] || null;

  if (!budget) {
    return null;
  }

  const itemsResult = await pool.request().input("budgetId", sql.Int, budgetId)
    .query(`
      SELECT
        bi.id,
        bi.budget_id,
        bi.type_id,
        bt.name AS type_name,
        bt.category_id,
        bc.name AS category_name,
        bt.expense_type,
        bi.quantity,
        bi.unit_price,
        bi.total_amount,
        bi.distribution_method,
        bi.distribution_level
      FROM BS_budget_items bi
      LEFT JOIN BS_budget_types bt
        ON bt.id = bi.type_id
      LEFT JOIN BS_budget_categories bc
        ON bc.id = bt.category_id
      WHERE bi.budget_id = @budgetId
        AND bi.is_active = 1
      ORDER BY bc.name, bt.name
    `);

  budget.items = itemsResult.recordset;

  return budget;
}
