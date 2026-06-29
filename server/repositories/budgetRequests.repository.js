import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function findOpenFinancialYearRepo(transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction).query(`
    SELECT TOP 1 id, year, status
    FROM dbo.BS_financial_years
    WHERE status = 'OPEN'
    ORDER BY started_at DESC, id DESC
  `);

  return result.recordset[0] || null;
}

export async function getActiveBudgetCategoriesRepo(transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction).query(`
    SELECT id, code, name
    FROM dbo.BS_budget_categories
    WHERE is_active = 1
    ORDER BY
      CASE code
        WHEN 'IT' THEN 1
        WHEN 'BIOMEDICAL' THEN 2
        WHEN 'GENERAL' THEN 3
        ELSE 4
      END,
      name
  `);

  return result.recordset || [];
}

export async function findBudgetTypeByIdRepo(typeId, transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("typeId", sql.Int, typeId)
    .query(`
      SELECT TOP 1
        t.id,
        t.category_id,
        t.name,
        t.expense_type,
        c.code AS category_code,
        c.name AS category_name
      FROM dbo.BS_budget_types t
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = t.category_id
      WHERE t.id = @typeId
        AND t.is_active = 1
        AND c.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function findDepartmentBudgetRepo({
  financialYearId,
  departmentId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("departmentId", sql.Int, departmentId)
    .query(`
      SELECT TOP 1
        db.id,
        db.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        db.department_id,
        d.name AS department_name,
        db.status,
        db.created_by,
        db.created_at,
        db.updated_by,
        db.updated_at
      FROM dbo.BS_department_budgets db
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = db.financial_year_id
      INNER JOIN dbo.BS_departments d
        ON d.id = db.department_id
      WHERE db.financial_year_id = @financialYearId
        AND db.department_id = @departmentId
        AND db.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function createDepartmentBudgetRepo({
  financialYearId,
  departmentId,
  createdBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("departmentId", sql.Int, departmentId)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      INSERT INTO dbo.BS_department_budgets (
        financial_year_id,
        department_id,
        status,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @financialYearId,
        @departmentId,
        'DRAFT',
        @createdBy
      )
    `);

  return result.recordset[0] || null;
}

export async function ensureDepartmentCategoryBudgetRepo({
  departmentBudgetId,
  categoryId,
  createdBy,
  transaction = null,
}) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction)
    .input("departmentBudgetId", sql.BigInt, departmentBudgetId)
    .input("categoryId", sql.Int, categoryId)
    .input("createdBy", sql.Int, createdBy);

  const result = await request.query(`
    IF NOT EXISTS (
      SELECT 1
      FROM dbo.BS_department_category_budgets
      WHERE department_budget_id = @departmentBudgetId
        AND category_id = @categoryId
    )
    BEGIN
      INSERT INTO dbo.BS_department_category_budgets (
        department_budget_id,
        category_id,
        status,
        created_by
      )
      VALUES (
        @departmentBudgetId,
        @categoryId,
        'DRAFT',
        @createdBy
      );
    END;

    SELECT TOP 1
      dcb.id,
      dcb.department_budget_id,
      dcb.category_id,
      c.code AS category_code,
      c.name AS category_name,
      dcb.status,
      dcb.submitted_by,
      dcb.submitted_at,
      dcb.returned_by,
      dcb.returned_at,
      dcb.return_note
    FROM dbo.BS_department_category_budgets dcb
    INNER JOIN dbo.BS_budget_categories c
      ON c.id = dcb.category_id
    WHERE dcb.department_budget_id = @departmentBudgetId
      AND dcb.category_id = @categoryId;
  `);

  return result.recordset[0] || null;
}

export async function getDepartmentCategoryBudgetsRepo(
  departmentBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("departmentBudgetId", sql.BigInt, departmentBudgetId)
    .query(`
      SELECT
        dcb.id,
        dcb.department_budget_id,
        dcb.category_id,
        c.code AS category_code,
        c.name AS category_name,
        dcb.status,
        dcb.submitted_by,
        dcb.submitted_at,
        dcb.returned_by,
        dcb.returned_at,
        dcb.return_note,
        COUNT(dri.id) AS items_count,
        ISNULL(SUM(dri.requested_quantity), 0) AS total_requested_quantity
      FROM dbo.BS_department_category_budgets dcb
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = dcb.category_id
      LEFT JOIN dbo.BS_department_budget_request_items dri
        ON dri.department_category_budget_id = dcb.id
       AND dri.is_active = 1
      WHERE dcb.department_budget_id = @departmentBudgetId
      GROUP BY
        dcb.id,
        dcb.department_budget_id,
        dcb.category_id,
        c.code,
        c.name,
        dcb.status,
        dcb.submitted_by,
        dcb.submitted_at,
        dcb.returned_by,
        dcb.returned_at,
        dcb.return_note
      ORDER BY
        CASE c.code
          WHEN 'IT' THEN 1
          WHEN 'BIOMEDICAL' THEN 2
          WHEN 'GENERAL' THEN 3
          ELSE 4
        END,
        c.name
    `);

  return result.recordset || [];
}

export async function getDepartmentCategoryBudgetByIdRepo(
  categoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .query(`
      SELECT TOP 1
        dcb.id,
        dcb.department_budget_id,
        dcb.category_id,
        c.code AS category_code,
        c.name AS category_name,
        dcb.status,
        db.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        db.department_id,
        d.name AS department_name
      FROM dbo.BS_department_category_budgets dcb
      INNER JOIN dbo.BS_department_budgets db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = db.financial_year_id
      INNER JOIN dbo.BS_departments d
        ON d.id = db.department_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = dcb.category_id
      WHERE dcb.id = @categoryBudgetId
        AND db.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getRequestItemsByCategoryBudgetRepo(categoryBudgetId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .query(`
      SELECT
        dri.id,
        dri.department_category_budget_id,
        dri.budget_type_id,
        bt.name AS budget_type_name,
        bt.expense_type,
        dri.requested_quantity,
        dri.distribution_method,
        dri.distribution_level,
        dri.review_status,
        dri.is_reviewed,
        dri.is_edit_locked,
        dri.review_note,
        dri.created_by,
        dri.created_at,
        dri.updated_by,
        dri.updated_at,
        d.period_type,
        d.period_no,
        d.quantity AS distribution_quantity
      FROM dbo.BS_department_budget_request_items dri
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = dri.budget_type_id
      LEFT JOIN dbo.BS_department_budget_request_distribution d
        ON d.request_item_id = dri.id
      WHERE dri.department_category_budget_id = @categoryBudgetId
        AND dri.is_active = 1
      ORDER BY bt.name, dri.id, d.period_no
    `);

  return result.recordset || [];
}

export async function findRequestItemByIdRepo(requestItemId, transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("requestItemId", sql.BigInt, requestItemId)
    .query(`
      SELECT TOP 1
        dri.*,
        dcb.status AS category_budget_status,
        dcb.category_id,
        db.financial_year_id,
        fy.status AS financial_year_status,
        db.department_id
      FROM dbo.BS_department_budget_request_items dri
      INNER JOIN dbo.BS_department_category_budgets dcb
        ON dcb.id = dri.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = db.financial_year_id
      WHERE dri.id = @requestItemId
        AND dri.is_active = 1
        AND db.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function findRequestItemByTypeRepo({
  categoryBudgetId,
  budgetTypeId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .query(`
      SELECT TOP 1 id
      FROM dbo.BS_department_budget_request_items
      WHERE department_category_budget_id = @categoryBudgetId
        AND budget_type_id = @budgetTypeId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function createRequestItemRepo({
  categoryBudgetId,
  budgetTypeId,
  requestedQuantity,
  distributionMethod,
  distributionLevel,
  createdBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .input("requestedQuantity", sql.Decimal(18, 4), requestedQuantity)
    .input("distributionMethod", sql.VarChar(50), distributionMethod)
    .input("distributionLevel", sql.VarChar(50), distributionLevel)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      INSERT INTO dbo.BS_department_budget_request_items (
        department_category_budget_id,
        budget_type_id,
        requested_quantity,
        distribution_method,
        distribution_level,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @categoryBudgetId,
        @budgetTypeId,
        @requestedQuantity,
        @distributionMethod,
        @distributionLevel,
        @createdBy
      )
    `);

  return result.recordset[0] || null;
}

export async function replaceRequestItemDistributionRepo({
  requestItemId,
  distributionRows,
  transaction = null,
}) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction).input(
    "requestItemId",
    sql.BigInt,
    requestItemId,
  );

  await request.query(`
    DELETE FROM dbo.BS_department_budget_request_distribution
    WHERE request_item_id = @requestItemId
  `);

  for (const [index, row] of distributionRows.entries()) {
    await createRequest(pool, transaction)
      .input("requestItemId", sql.BigInt, requestItemId)
      .input("periodType", sql.VarChar(20), row.period_type)
      .input("periodNo", sql.Int, row.period_no)
      .input("quantity", sql.Decimal(18, 4), row.quantity)
      .query(`
        INSERT INTO dbo.BS_department_budget_request_distribution (
          request_item_id,
          period_type,
          period_no,
          quantity
        )
        VALUES (
          @requestItemId,
          @periodType,
          @periodNo,
          @quantity
        )
      `);
  }
}

export async function updateRequestItemRepo({
  requestItemId,
  requestedQuantity,
  distributionMethod,
  distributionLevel,
  reviewNote,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("requestItemId", sql.BigInt, requestItemId)
    .input("requestedQuantity", sql.Decimal(18, 4), requestedQuantity)
    .input("distributionMethod", sql.VarChar(50), distributionMethod)
    .input("distributionLevel", sql.VarChar(50), distributionLevel)
    .input("reviewNote", sql.NVarChar(1000), reviewNote)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_department_budget_request_items
      SET
        requested_quantity = COALESCE(@requestedQuantity, requested_quantity),
        distribution_method = COALESCE(@distributionMethod, distribution_method),
        distribution_level = @distributionLevel,
        review_note = COALESCE(@reviewNote, review_note),
        review_status = 'NOT_REVIEWED',
        is_reviewed = 0,
        is_edit_locked = 0,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestItemId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function deactivateRequestItemRepo({
  requestItemId,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("requestItemId", sql.BigInt, requestItemId)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_department_budget_request_items
      SET
        is_active = 0,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestItemId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function countRequestItemsRepo(categoryBudgetId, transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .query(`
      SELECT COUNT(*) AS count
      FROM dbo.BS_department_budget_request_items
      WHERE department_category_budget_id = @categoryBudgetId
        AND is_active = 1
    `);

  return Number(result.recordset[0]?.count || 0);
}

export async function getRequestTypeIdsRepo(categoryBudgetId, transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .query(`
      SELECT DISTINCT budget_type_id
      FROM dbo.BS_department_budget_request_items
      WHERE department_category_budget_id = @categoryBudgetId
        AND is_active = 1
    `);

  return result.recordset.map((row) => Number(row.budget_type_id));
}

export async function submitDepartmentCategoryBudgetRepo({
  categoryBudgetId,
  submittedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .input("submittedBy", sql.Int, submittedBy)
    .query(`
      UPDATE dbo.BS_department_category_budgets
      SET
        status = 'SUBMITTED',
        submitted_by = @submittedBy,
        submitted_at = SYSUTCDATETIME(),
        returned_by = NULL,
        returned_at = NULL,
        return_note = NULL,
        updated_by = @submittedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @categoryBudgetId
        AND status IN ('DRAFT', 'RETURNED')
    `);

  return result.recordset[0] || null;
}

export async function updateDepartmentBudgetStatusRepo({
  departmentBudgetId,
  status,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  await createRequest(pool, transaction)
    .input("departmentBudgetId", sql.BigInt, departmentBudgetId)
    .input("status", sql.VarChar(40), status)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_department_budgets
      SET
        status = @status,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      WHERE id = @departmentBudgetId
    `);
}
