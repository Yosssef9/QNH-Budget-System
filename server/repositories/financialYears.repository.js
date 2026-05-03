import { poolPromise, sql } from "../config/db.js";

export async function findFinancialYearByYear(year) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("year", sql.Int, year)
    .query(`
      SELECT TOP 1
        id,
        year,
        status,
        started_by,
        started_at,
        closed_by,
        closed_at
      FROM BS_financial_years
      WHERE year = @year
    `);

  return result.recordset[0] || null;
}

export async function createFinancialYearRepo({ year, startedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("year", sql.Int, year)
    .input("startedBy", sql.Int, startedBy)
    .query(`
      INSERT INTO BS_financial_years (
        year,
        status,
        started_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @year,
        'OPEN',
        @startedBy
      )
    `);

  return result.recordset[0];
}

export async function getActiveDepartmentsCount() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT COUNT(*) AS count
    FROM BS_departments
    WHERE is_active = 1
  `);

  return result.recordset[0].count;
}

export async function createDraftBudgetsForFinancialYear({
  financialYearId,
  createdBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      INSERT INTO BS_budgets (
        financial_year_id,
        department_id,
        status,
        created_by
      )
      SELECT
        @financialYearId,
        d.id,
        'DRAFT',
        @createdBy
      FROM BS_departments d
      WHERE d.is_active = 1;

      SELECT @@ROWCOUNT AS createdCount;
    `);

  return result.recordset[0].createdCount;
}