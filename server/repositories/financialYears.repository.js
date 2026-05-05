import { poolPromise, sql } from "../config/db.js";

export async function getFinancialYearsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      fy.id,
      fy.year,
      fy.status,
      fy.started_by,
      su.USER_NAME AS started_by_name,
      fy.started_at,
      fy.closed_by,
      cu.USER_NAME AS closed_by_name,
      fy.closed_at
    FROM BS_financial_years fy
    LEFT JOIN users su ON su.USER_ID = fy.started_by
    LEFT JOIN users cu ON cu.USER_ID = fy.closed_by
    ORDER BY fy.year DESC
  `);

  return result.recordset;
}

export async function findFinancialYearByYear(year) {
  const pool = await poolPromise;

  const result = await pool.request().input("year", sql.Int, year).query(`
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

export async function findFinancialYearById(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.Int, id).query(`
      SELECT TOP 1
        id,
        year,
        status,
        started_by,
        started_at,
        closed_by,
        closed_at
      FROM BS_financial_years
      WHERE id = @id
    `);

  return result.recordset[0] || null;
}

export async function findOpenFinancialYearRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT TOP 1
      id,
      year,
      status,
      started_by,
      started_at,
      closed_by,
      closed_at
    FROM BS_financial_years
    WHERE status = 'OPEN'
    ORDER BY started_at DESC, id DESC
  `);

  return result.recordset[0] || null;
}

export async function createFinancialYearRepo({ year, startedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("year", sql.Int, year)
    .input("startedBy", sql.Int, startedBy).query(`
      INSERT INTO BS_financial_years (
        year,
        status,
        started_by,
        started_at,
        closed_by,
        closed_at
      )
      OUTPUT INSERTED.*
      VALUES (
        @year,
        'OPEN',
        @startedBy,
        GETDATE(),
        NULL,
        NULL
      )
    `);

  return result.recordset[0];
}

export async function closeFinancialYearRepo({ id, closedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("closedBy", sql.Int, closedBy).query(`
      UPDATE BS_financial_years
      SET
        status = 'CLOSED',
        closed_by = @closedBy,
        closed_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
        AND status = 'OPEN'
    `);

  return result.recordset[0] || null;
}

export async function countNotApprovedBudgetsForYearRepo(year) {
  const pool = await poolPromise;

  const result = await pool.request().input("year", sql.Int, year).query(`
      SELECT COUNT(*) AS count
      FROM BS_budgets
      WHERE year = @year
        AND is_active = 1
        AND status <> 'APPROVED'
    `);

  return result.recordset[0]?.count || 0;
}
