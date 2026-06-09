import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";
export async function getFinancialYearsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
   SELECT
  fy.id,
  fy.year,
  fy.status,
  fy.started_by,
  su.USER_NAME AS started_by_name,
 started_at,

  fy.pre_closed_by,
  pcu.USER_NAME AS pre_closed_by_name,
 pre_closed_at,

  fy.closed_by,
  cu.USER_NAME AS closed_by_name,
 closed_at
FROM BS_financial_years fy
LEFT JOIN users su ON su.USER_ID = fy.started_by
LEFT JOIN users pcu ON pcu.USER_ID = fy.pre_closed_by
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
  pre_closed_by,
  pre_closed_at,
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
  pre_closed_by,
  pre_closed_at,
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
  pre_closed_by,
  pre_closed_at,
  closed_by,
  closed_at
FROM BS_financial_years
WHERE status = 'OPEN'
ORDER BY started_at DESC, id DESC
  `);

  return result.recordset[0] || null;
}

export async function createFinancialYearRepo(
  { year, startedBy },
  transaction = null,
) {
  const pool = await poolPromise;

  const request = createRequest(pool, transaction);

  const result = await request
    .input("year", sql.Int, year)
    .input("startedBy", sql.Int, startedBy).query(`
     INSERT INTO BS_financial_years (
  year,
  status,
  started_by,
  started_at,
  pre_closed_by,
  pre_closed_at,
  closed_by,
  closed_at
)
OUTPUT INSERTED.*
VALUES (
  @year,
  'OPEN',
  @startedBy,
  GETUTCDATE(),
  NULL,
  NULL,
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
        closed_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
       AND status = 'PRE_CLOSING'
    `);

  return result.recordset[0] || null;
}

export async function countNotApprovedBudgetsForYearRepo(financialYearId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT COUNT(*) AS count
      FROM BS_budgets
      WHERE financial_year_id = @financialYearId
        AND is_active = 1
        AND status <> 'APPROVED'
    `);

  return result.recordset[0]?.count || 0;
}
export async function findActiveFinancialYearRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT TOP 1 id, year, status
    FROM BS_financial_years
    WHERE status IN ('OPEN', 'PRE_CLOSING')
    ORDER BY started_at DESC, id DESC
  `);

  return result.recordset[0] || null;
}
export async function preCloseFinancialYearRepo({ id, preClosedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("preClosedBy", sql.Int, preClosedBy).query(`
      UPDATE BS_financial_years
      SET
        status = 'PRE_CLOSING',
        pre_closed_by = @preClosedBy,
        pre_closed_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
        AND status = 'OPEN'
    `);

  return result.recordset[0] || null;
}

export async function countPendingTransferRequestsForYearRepo(financialYearId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId).query(`
      IF OBJECT_ID('BS_budget_transfers', 'U') IS NULL
      BEGIN
        SELECT 0 AS count;
        RETURN;
      END;

      SELECT COUNT(*) AS count
      FROM BS_budget_transfers t
      INNER JOIN BS_budget_items bi
        ON bi.id = t.from_budget_item_id
      INNER JOIN BS_budgets b
        ON b.id = bi.budget_id
      WHERE b.financial_year_id = @financialYearId
        AND t.status IN ('PENDING', 'PENDING_APPROVAL')
    `);

  return result.recordset[0]?.count || 0;
}

// export async function countUnfinishedPOLinksForYearRepo(financialYearId) {
//   const pool = await poolPromise;

//   const result = await pool
//     .request()
//     .input("financialYearId", sql.Int, financialYearId).query(`
//       IF OBJECT_ID('BS_budget_po_links', 'U') IS NULL
//       BEGIN
//         SELECT 0 AS count;
//         RETURN;
//       END;

//       SELECT COUNT(*) AS count
//       FROM BS_budget_po_links pl
//       INNER JOIN BS_budget_items bi
//         ON bi.id = pl.budget_item_id
//       INNER JOIN BS_budgets b
//         ON b.id = bi.budget_id
//       WHERE b.financial_year_id = @financialYearId
//         AND ISNULL(pl.status, '') NOT IN ('COMPLETED', 'CANCELLED')
//     `);

//   return result.recordset[0]?.count || 0;
// }
export async function countUnfinishedPOLinksForYearRepo() {
  return 0;
}
export async function findLatestFinancialYearRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT TOP 1
      id,
      year,
      status
    FROM BS_financial_years
    ORDER BY year DESC
  `);

  return result.recordset[0] || null;
}

export async function countBudgetsForYearRepo(financialYearId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT COUNT(*) AS count
      FROM BS_budgets
      WHERE financial_year_id = @financialYearId
        AND is_active = 1
    `);

  return result.recordset[0]?.count || 0;
}
