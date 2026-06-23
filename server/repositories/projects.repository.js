import { poolPromise, sql } from "../config/db.js";

function applyProjectFilters(request, filters = {}) {
  const where = ["bi.is_active = 1", "bi.is_project = 1", "b.is_active = 1"];

  if (!filters.canSeeAll) {
    request.input("scopeDepartmentId", sql.Int, filters.scopeDepartmentId);
    where.push("b.department_id = @scopeDepartmentId");
  } else if (filters.filterDepartmentId) {
    request.input("filterDepartmentId", sql.Int, filters.filterDepartmentId);
    where.push("b.department_id = @filterDepartmentId");
  }

  if (filters.financialYearId) {
    request.input("financialYearId", sql.Int, filters.financialYearId);
    where.push("b.financial_year_id = @financialYearId");
  } else {
    where.push("fy.status = 'OPEN'");
  }

  if (filters.status) {
    request.input("status", sql.VarChar(50), filters.status);
    where.push("b.status = @status");
  }

  if (filters.budgetId) {
    request.input("budgetId", sql.BigInt, filters.budgetId);
    where.push("b.id = @budgetId");
  }

  if (filters.search) {
    request.input("search", sql.NVarChar(200), `%${filters.search}%`);
    where.push(`(
      bt.name LIKE @search
      OR d.name LIKE @search
      OR CAST(b.id AS NVARCHAR(30)) LIKE @search
      OR CAST(fy.year AS NVARCHAR(20)) LIKE @search
    )`);
  }

  return where.join("\n        AND ");
}

export async function getProjectBudgetItemsRepo(filters = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  const whereClause = applyProjectFilters(request, filters);

  const result = await request.query(`
    SELECT
      bi.id AS budget_item_id,
      bi.budget_id,
      bi.type_id,
      bt.name AS project_name,
      bt.expense_type,
      bc.id AS category_id,
      bc.name AS category_name,
      b.department_id,
      d.name AS department_name,
      b.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      b.status AS budget_status,
      b.created_by,
      created_user.USER_NAME AS created_by_name,
      b.created_at,
      b.submitted_at,
      b.approved_at,
      bi.quantity,
      bi.unit_price,
      bi.total_amount
    FROM BS_budget_items bi
    INNER JOIN BS_budgets b
      ON b.id = bi.budget_id
    INNER JOIN BS_budget_types bt
      ON bt.id = bi.type_id
    LEFT JOIN BS_budget_categories bc
      ON bc.id = bt.category_id
    INNER JOIN BS_departments d
      ON d.id = b.department_id
    INNER JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id
    LEFT JOIN users created_user
      ON created_user.USER_ID = b.created_by
    WHERE ${whereClause}
    ORDER BY fy.year DESC, d.name ASC, bt.name ASC
  `);

  return result.recordset;
}

export async function getProjectFilterOptionsRepo({ canSeeAll, departmentId }) {
  const pool = await poolPromise;
  const request = pool.request().input("canSeeAll", sql.Bit, canSeeAll ? 1 : 0);

  if (!canSeeAll) {
    request.input("departmentId", sql.Int, departmentId);
  } else {
    request.input("departmentId", sql.Int, null);
  }

  const result = await request.query(`
    SELECT DISTINCT
      fy.id AS financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      d.id AS department_id,
      d.name AS department_name,
      b.id AS budget_id,
      b.status AS budget_status
    FROM BS_budget_items bi
    INNER JOIN BS_budgets b
      ON b.id = bi.budget_id
    INNER JOIN BS_departments d
      ON d.id = b.department_id
    INNER JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id
    WHERE bi.is_active = 1
      AND bi.is_project = 1
      AND b.is_active = 1
      AND (
        @canSeeAll = 1
        OR b.department_id = @departmentId
      )
    ORDER BY fy.year DESC, d.name ASC, b.id DESC
  `);

  return result.recordset;
}

export async function getProjectBudgetItemDetailsRepo({
  budgetItemId,
  canSeeAll,
  departmentId,
}) {
  const pool = await poolPromise;
  const request = pool
    .request()
    .input("budgetItemId", sql.BigInt, budgetItemId)
    .input("canSeeAll", sql.Bit, canSeeAll ? 1 : 0)
    .input("departmentId", sql.Int, departmentId || null);

  const result = await request.query(`
    SELECT TOP 1
      bi.id AS budget_item_id,
      bi.budget_id,
      bi.type_id,
      bt.name AS project_name,
      bt.expense_type,
      bc.id AS category_id,
      bc.name AS category_name,
      b.department_id,
      d.name AS department_name,
      b.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      b.status AS budget_status,
      b.created_by,
      created_user.USER_NAME AS created_by_name,
      b.created_at,
      b.submitted_by,
      submitted_user.USER_NAME AS submitted_by_name,
      b.submitted_at,
      b.approved_by,
      approved_user.USER_NAME AS approved_by_name,
      b.approved_at,
      b.returned_by,
      returned_user.USER_NAME AS returned_by_name,
      b.returned_at,
      bi.quantity,
      bi.unit_price,
      bi.total_amount,
      bi.distribution_method,
      bi.distribution_level
    FROM BS_budget_items bi
    INNER JOIN BS_budgets b
      ON b.id = bi.budget_id
    INNER JOIN BS_budget_types bt
      ON bt.id = bi.type_id
    LEFT JOIN BS_budget_categories bc
      ON bc.id = bt.category_id
    INNER JOIN BS_departments d
      ON d.id = b.department_id
    INNER JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id
    LEFT JOIN users created_user
      ON created_user.USER_ID = b.created_by
    LEFT JOIN users submitted_user
      ON submitted_user.USER_ID = b.submitted_by
    LEFT JOIN users approved_user
      ON approved_user.USER_ID = b.approved_by
    LEFT JOIN users returned_user
      ON returned_user.USER_ID = b.returned_by
    WHERE bi.id = @budgetItemId
      AND bi.is_active = 1
      AND bi.is_project = 1
      AND b.is_active = 1
      AND (
        @canSeeAll = 1
        OR b.department_id = @departmentId
      )
  `);

  return result.recordset[0] || null;
}
