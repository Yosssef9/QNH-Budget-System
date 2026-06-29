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
      DECLARE @oldWorkflowCount INT = 0;
      DECLARE @categoryPackageCount INT = 0;
      DECLARE @departmentCategoryCount INT = 0;

      IF OBJECT_ID('dbo.BS_budgets', 'U') IS NOT NULL
      BEGIN
        SELECT @oldWorkflowCount = COUNT(*)
        FROM dbo.BS_budgets
        WHERE financial_year_id = @financialYearId
          AND is_active = 1
          AND status NOT IN ('APPROVED', 'DRAFT');
      END;

      IF OBJECT_ID('dbo.BS_category_review_packages', 'U') IS NOT NULL
      BEGIN
        SELECT @categoryPackageCount = COUNT(*)
        FROM dbo.BS_category_review_packages
        WHERE financial_year_id = @financialYearId
          AND status NOT IN ('APPROVED', 'CANCELLED');
      END;

      IF OBJECT_ID('dbo.BS_department_category_budgets', 'U') IS NOT NULL
         AND OBJECT_ID('dbo.BS_department_budgets', 'U') IS NOT NULL
      BEGIN
        SELECT @departmentCategoryCount = COUNT(*)
        FROM dbo.BS_department_category_budgets dcb
        INNER JOIN dbo.BS_department_budgets db
          ON db.id = dcb.department_budget_id
        WHERE db.financial_year_id = @financialYearId
          AND db.is_active = 1
          AND dcb.status IN ('SUBMITTED', 'RETURNED');
      END;

      SELECT
        @oldWorkflowCount
        + @categoryPackageCount
        + @departmentCategoryCount AS count
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
      DECLARE @oldWorkflowCount INT = 0;
      DECLARE @categoryTransferCount INT = 0;

      IF OBJECT_ID('dbo.BS_budget_transfers', 'U') IS NOT NULL
      BEGIN
        SELECT @oldWorkflowCount = COUNT(*)
        FROM dbo.BS_budget_transfers t
        INNER JOIN dbo.BS_budget_items bi
          ON bi.id = t.from_budget_item_id
        INNER JOIN dbo.BS_budgets b
          ON b.id = bi.budget_id
        WHERE b.financial_year_id = @financialYearId
          AND t.status IN ('PENDING', 'PENDING_APPROVAL');
      END;

      IF OBJECT_ID('dbo.BS_category_budget_transfers', 'U') IS NOT NULL
      BEGIN
        SELECT @categoryTransferCount = COUNT(*)
        FROM dbo.BS_category_budget_transfers
        WHERE financial_year_id = @financialYearId
          AND status = 'PENDING_APPROVAL';
      END;

      SELECT @oldWorkflowCount + @categoryTransferCount AS count
    `);

  return result.recordset[0]?.count || 0;
}

export async function countUnfinishedPOLinksForYearRepo(financialYearId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId).query(`
      DECLARE @oldWorkflowCount INT = 0;
      DECLARE @categoryPoLinkCount INT = 0;

      IF OBJECT_ID('dbo.BS_PO_LINKS', 'U') IS NOT NULL
      BEGIN
        SELECT @oldWorkflowCount = COUNT(*)
        FROM dbo.BS_PO_LINKS pl
        INNER JOIN dbo.BS_budgets b
          ON b.id = pl.BUDGET_ID
        WHERE b.financial_year_id = @financialYearId
          AND pl.STATUS = 'PENDING';
      END;

      IF OBJECT_ID('dbo.BS_category_po_links', 'U') IS NOT NULL
      BEGIN
        SELECT @categoryPoLinkCount = COUNT(*)
        FROM dbo.BS_category_po_links pl
        INNER JOIN dbo.BS_category_type_review_sub_items rsi
          ON rsi.id = pl.category_type_review_sub_item_id
        INNER JOIN dbo.BS_category_type_reviews ctr
          ON ctr.id = rsi.category_type_review_id
        INNER JOIN dbo.BS_category_review_packages crp
          ON crp.id = ctr.category_review_package_id
        WHERE crp.financial_year_id = @financialYearId
          AND pl.status = 'PENDING';
      END;

      SELECT @oldWorkflowCount + @categoryPoLinkCount AS count
    `);

  return result.recordset[0]?.count || 0;
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
      DECLARE @oldWorkflowCount INT = 0;
      DECLARE @departmentBudgetCount INT = 0;

      IF OBJECT_ID('dbo.BS_budgets', 'U') IS NOT NULL
      BEGIN
        SELECT @oldWorkflowCount = COUNT(*)
        FROM dbo.BS_budgets
        WHERE financial_year_id = @financialYearId
          AND is_active = 1;
      END;

      IF OBJECT_ID('dbo.BS_department_budgets', 'U') IS NOT NULL
      BEGIN
        SELECT @departmentBudgetCount = COUNT(*)
        FROM dbo.BS_department_budgets
        WHERE financial_year_id = @financialYearId
          AND is_active = 1;
      END;

      SELECT @oldWorkflowCount + @departmentBudgetCount AS count
    `);

  return result.recordset[0]?.count || 0;
}
