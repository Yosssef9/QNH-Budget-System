import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";

function requestFor(transaction = null) {
  return transaction ? new sql.Request(transaction) : null;
}

function financialYearSelect() {
  return `
    SELECT
      fy.id,
      fy.year,
      fy.status,
      fy.opened_by,
      opened.USER_NAME AS opened_by_name,
      fy.opened_at,
      fy.pre_closed_by,
      preClosed.USER_NAME AS pre_closed_by_name,
      fy.pre_closed_at,
      fy.closed_by,
      closed.USER_NAME AS closed_by_name,
      fy.closed_at,
      fy.updated_by,
      fy.updated_at,
      fy.row_version,
      (
        SELECT COUNT(1)
        FROM dbo.BS_department_budgets AS db
        WHERE db.financial_year_id = fy.id
      ) AS department_budget_count,
      (
        SELECT COUNT(1)
        FROM dbo.BS_department_budgets AS db
        INNER JOIN dbo.BS_department_category_budgets AS dcb
          ON dcb.department_budget_id = db.id
        WHERE db.financial_year_id = fy.id
      ) AS department_category_budget_count,
      (
        SELECT COUNT(1)
        FROM dbo.BS_category_submission_windows AS csw
        WHERE csw.financial_year_id = fy.id
      ) AS submission_window_count,
      (
        SELECT COUNT(1)
        FROM dbo.BS_category_budget_packages AS cbp
        WHERE cbp.financial_year_id = fy.id
      ) AS category_package_count
    FROM dbo.BS_financial_years AS fy
    LEFT JOIN dbo.users AS opened ON opened.USER_ID = fy.opened_by
    LEFT JOIN dbo.users AS preClosed ON preClosed.USER_ID = fy.pre_closed_by
    LEFT JOIN dbo.users AS closed ON closed.USER_ID = fy.closed_by
  `;
}

export async function getFinancialYearsRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    ${financialYearSelect()}
    ORDER BY fy.year DESC;
  `);
  return result.recordset;
}

export async function findFinancialYearByIdRepo(id, transaction = null) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("id", sql.Int, id).query(`
    ${financialYearSelect()}
    WHERE fy.id = @id;
  `);
  return result.recordset[0] || null;
}

export async function findFinancialYearByYearRepo(year, transaction = null) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("year", sql.Int, year).query(`
    ${financialYearSelect()}
    WHERE fy.year = @year;
  `);
  return result.recordset[0] || null;
}

export async function findLatestFinancialYearRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    ${financialYearSelect()}
    ORDER BY fy.year DESC, fy.id DESC;
  `);
  return result.recordset[0] || null;
}

export async function findOpenFinancialYearRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    ${financialYearSelect()}
    WHERE fy.status = 'OPEN'
    ORDER BY fy.opened_at DESC, fy.id DESC;
  `);
  return result.recordset[0] || null;
}

export async function findActiveFinancialYearRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    ${financialYearSelect()}
    WHERE fy.status IN ('OPEN', 'PRE_CLOSING')
    ORDER BY fy.opened_at DESC, fy.id DESC;
  `);
  return result.recordset[0] || null;
}

export async function listActiveDepartmentsRepo(transaction) {
  const request = requestFor(transaction);
  const result = await request.query(`
    SELECT id, name, department_code, is_active
    FROM dbo.BS_departments
    WHERE is_active = 1
    ORDER BY name;
  `);
  return result.recordset;
}

export async function listActiveBudgetCategoriesRepo(transaction) {
  const request = requestFor(transaction);
  const result = await request.query(`
    SELECT id, category_code, name, sort_order, is_active
    FROM dbo.BS_budget_categories
    WHERE is_active = 1
    ORDER BY sort_order, name;
  `);
  return result.recordset;
}

export async function createFinancialYearRepo(transaction, payload) {
  const request = requestFor(transaction);
  const result = await request
    .input("year", sql.Int, payload.year)
    .input("openedBy", sql.Int, payload.opened_by).query(`
      DECLARE @Inserted TABLE (id INT NOT NULL);

      INSERT INTO dbo.BS_financial_years
      (
        year,
        status,
        opened_by,
        opened_at
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @year,
        'OPEN',
        @openedBy,
        SYSUTCDATETIME()
      );

      SELECT fy.*
      FROM dbo.BS_financial_years AS fy
      INNER JOIN @Inserted AS inserted ON inserted.id = fy.id;
    `);
  return result.recordset[0] || null;
}

export async function createDepartmentBudgetRepo(transaction, payload) {
  const request = requestFor(transaction);
  const result = await request
    .input("financialYearId", sql.Int, payload.financial_year_id)
    .input("departmentId", sql.Int, payload.department_id)
    .input("createdBy", sql.Int, payload.created_by).query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_department_budgets
      (
        financial_year_id,
        department_id,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @financialYearId,
        @departmentId,
        @createdBy
      );

      SELECT id FROM @Inserted;
    `);
  return result.recordset[0] || null;
}

export async function createDepartmentCategoryBudgetRepo(transaction, payload) {
  const request = requestFor(transaction);
  const result = await request
    .input("departmentBudgetId", sql.BigInt, payload.department_budget_id)
    .input("budgetCategoryId", sql.Int, payload.budget_category_id)
    .input("status", sql.VarChar(40), payload.status)
    .input("createdBy", sql.Int, payload.created_by).query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_department_category_budgets
      (
        department_budget_id,
        budget_category_id,
        status,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @departmentBudgetId,
        @budgetCategoryId,
        @status,
        @createdBy
      );

      SELECT id FROM @Inserted;
    `);
  return result.recordset[0] || null;
}

export async function createSubmissionWindowRepo(transaction, payload) {
  const request = requestFor(transaction);
  const result = await request
    .input("financialYearId", sql.Int, payload.financial_year_id)
    .input("budgetCategoryId", sql.Int, payload.budget_category_id)
    .input("status", sql.VarChar(20), payload.status).query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_category_submission_windows
      (
        financial_year_id,
        budget_category_id,
        status
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @financialYearId,
        @budgetCategoryId,
        @status
      );

      SELECT id FROM @Inserted;
    `);
  return result.recordset[0] || null;
}

export async function createCategoryPackageRepo(transaction, payload) {
  const request = requestFor(transaction);
  const result = await request
    .input("financialYearId", sql.Int, payload.financial_year_id)
    .input("budgetCategoryId", sql.Int, payload.budget_category_id)
    .input("status", sql.VarChar(40), payload.status)
    .input("createdBy", sql.Int, payload.created_by).query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_category_budget_packages
      (
        financial_year_id,
        budget_category_id,
        status,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @financialYearId,
        @budgetCategoryId,
        @status,
        @createdBy
      );

      SELECT id FROM @Inserted;
    `);
  return result.recordset[0] || null;
}

export async function createWorkflowHistoryRepo(transaction, payload) {
  const request = requestFor(transaction);
  await request
    .input("financialYearId", sql.Int, payload.financial_year_id)
    .input("entityType", sql.VarChar(80), payload.entity_type)
    .input("entityId", sql.BigInt, payload.entity_id)
    .input("action", sql.VarChar(100), payload.action)
    .input("oldStatus", sql.VarChar(40), payload.old_status ?? null)
    .input("newStatus", sql.VarChar(40), payload.new_status ?? null)
    .input("note", sql.NVarChar(sql.MAX), payload.note ?? null)
    .input("oldValues", sql.NVarChar(sql.MAX), payload.old_values_json ?? null)
    .input("newValues", sql.NVarChar(sql.MAX), payload.new_values_json ?? null)
    .input("userRoleId", sql.Int, payload.user_role_id ?? null)
    .input("actingWorkspace", sql.VarChar(80), payload.acting_workspace ?? null)
    .input("createdBy", sql.Int, payload.created_by).query(`
      INSERT INTO dbo.BS_budget_workflow_history
      (
        financial_year_id,
        entity_type,
        entity_id,
        action,
        old_status,
        new_status,
        note,
        old_values_json,
        new_values_json,
        user_role_id,
        acting_workspace,
        created_by
      )
      VALUES
      (
        @financialYearId,
        @entityType,
        @entityId,
        @action,
        @oldStatus,
        @newStatus,
        @note,
        @oldValues,
        @newValues,
        @userRoleId,
        @actingWorkspace,
        @createdBy
      );
    `);
}

export async function countDepartmentBudgetsForYearRepo(
  financialYearId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT COUNT(1) AS count
      FROM dbo.BS_department_budgets
      WHERE financial_year_id = @financialYearId;
    `);
  return Number(result.recordset[0]?.count || 0);
}

export async function countIncompleteCategoryPackagesForYearRepo(
  financialYearId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT COUNT(1) AS count
      FROM dbo.BS_category_budget_packages
      WHERE financial_year_id = @financialYearId
        AND status <> 'CFO_REVIEW_COMPLETED';
    `);
  return Number(result.recordset[0]?.count || 0);
}

export async function countOpenChangeRequestsForYearRepo(
  financialYearId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT COUNT(1) AS count
      FROM dbo.BS_budget_change_requests AS cr
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = cr.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      WHERE db.financial_year_id = @financialYearId
        AND cr.status NOT IN ('APPLIED', 'REJECTED', 'CANCELLED');
    `);
  return Number(result.recordset[0]?.count || 0);
}

export async function transitionFinancialYearToPreClosingRepo(transaction, payload) {
  const request = requestFor(transaction);
  const result = await request
    .input("id", sql.Int, payload.id)
    .input("preClosedBy", sql.Int, payload.pre_closed_by).query(`
      DECLARE @Updated TABLE (id INT NOT NULL);

      UPDATE dbo.BS_financial_years
      SET
        status = 'PRE_CLOSING',
        pre_closed_by = @preClosedBy,
        pre_closed_at = SYSUTCDATETIME(),
        updated_by = @preClosedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @id
        AND status = 'OPEN';

      SELECT fy.*
      FROM dbo.BS_financial_years AS fy
      INNER JOIN @Updated AS updated ON updated.id = fy.id;
    `);
  return result.recordset[0] || null;
}

export async function countPendingTransfersForYearRepo(
  financialYearId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT COUNT(1) AS count
      FROM dbo.BS_category_budget_transfers AS transfer
      INNER JOIN dbo.BS_category_budget_package_sub_items AS fromSubItem
        ON fromSubItem.id = transfer.from_package_sub_item_id
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.id = fromSubItem.category_budget_package_item_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = packageItem.category_budget_package_id
      WHERE pkg.financial_year_id = @financialYearId
        AND transfer.status = 'PENDING_APPROVAL';
    `);
  return Number(result.recordset[0]?.count || 0);
}

export async function countPendingPoLinksForYearRepo(
  financialYearId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT COUNT(1) AS count
      FROM dbo.BS_category_po_links AS poLink
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = poLink.category_budget_package_sub_item_id
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.id = subItem.category_budget_package_item_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = packageItem.category_budget_package_id
      WHERE pkg.financial_year_id = @financialYearId
        AND poLink.status = 'PENDING';
    `);
  return Number(result.recordset[0]?.count || 0);
}

export async function transitionFinancialYearToClosedRepo(transaction, payload) {
  const request = requestFor(transaction);
  const result = await request
    .input("id", sql.Int, payload.id)
    .input("closedBy", sql.Int, payload.closed_by).query(`
      DECLARE @Updated TABLE (id INT NOT NULL);

      UPDATE dbo.BS_financial_years
      SET
        status = 'CLOSED',
        closed_by = @closedBy,
        closed_at = SYSUTCDATETIME(),
        updated_by = @closedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @id
        AND status = 'PRE_CLOSING';

      SELECT fy.*
      FROM dbo.BS_financial_years AS fy
      INNER JOIN @Updated AS updated ON updated.id = fy.id;
    `);
  return result.recordset[0] || null;
}
