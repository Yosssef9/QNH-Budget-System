import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import {
  DEPARTMENT_BUDGET_ITEM_STATUS,
  DEPARTMENT_CATEGORY_BUDGET_STATUS,
  GENERAL_SUB_ITEM_CODE,
} from "./departmentBudgets.constants.js";

function requestFor(transaction = null) {
  return transaction ? new sql.Request(transaction) : null;
}

function departmentBudgetSelect() {
  return `
    SELECT
      db.id,
      db.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      db.department_id,
      dept.name AS department_name,
      dept.department_code,
      db.created_by,
      createdUser.USER_NAME AS created_by_name,
      db.created_at,
      db.updated_by,
      db.updated_at,
      db.row_version,
      CASE
        WHEN SUM(CASE WHEN dcb.status = 'IN_CATEGORY_REVIEW' THEN 1 ELSE 0 END) > 0
          THEN 'IN_CATEGORY_REVIEW'
        WHEN COUNT(dcb.id) > 0
          AND SUM(CASE WHEN dcb.status = 'CATEGORY_REVIEW_COMPLETED' THEN 1 ELSE 0 END) = COUNT(dcb.id)
          THEN 'CATEGORY_REVIEW_COMPLETED'
        ELSE 'DRAFT'
      END AS overall_status,
      COUNT(DISTINCT CASE WHEN item.is_active = 1 THEN item.id END) AS items_count,
      COALESCE(SUM(CASE WHEN item.is_active = 1 THEN item.requested_quantity ELSE 0 END), 0) AS total_requested_quantity
    FROM dbo.BS_department_budgets AS db
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = db.financial_year_id
    INNER JOIN dbo.BS_departments AS dept
      ON dept.id = db.department_id
    LEFT JOIN dbo.users AS createdUser
      ON createdUser.USER_ID = db.created_by
    LEFT JOIN dbo.BS_department_category_budgets AS dcb
      ON dcb.department_budget_id = db.id
    LEFT JOIN dbo.BS_department_category_budget_items AS item
      ON item.department_category_budget_id = dcb.id
  `;
}

function departmentBudgetGroupBy() {
  return `
    GROUP BY
      db.id,
      db.financial_year_id,
      fy.year,
      fy.status,
      db.department_id,
      dept.name,
      dept.department_code,
      db.created_by,
      createdUser.USER_NAME,
      db.created_at,
      db.updated_by,
      db.updated_at,
      db.row_version
  `;
}

export async function findLatestFinancialYearRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT TOP 1 id, year, status
    FROM dbo.BS_financial_years
    ORDER BY year DESC, id DESC;
  `);
  return result.recordset[0] || null;
}

export async function findCurrentDepartmentBudgetRepo({ departmentId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId).query(`
      ${departmentBudgetSelect()}
      WHERE db.department_id = @departmentId
        AND fy.status IN ('OPEN', 'PRE_CLOSING')
      ${departmentBudgetGroupBy()}
      ORDER BY fy.year DESC, db.id DESC;
    `);
  return result.recordset[0] || null;
}

export async function listDepartmentBudgetsRepo({ departmentId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId).query(`
      ${departmentBudgetSelect()}
      WHERE db.department_id = @departmentId
      ${departmentBudgetGroupBy()}
      ORDER BY fy.year DESC, db.id DESC;
    `);
  return result.recordset;
}

export async function listCopyableCategoryBudgetHistoryRepo({ departmentId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId).query(`
      SELECT
        dcb.id,
        fy.year,
        db.department_id,
        dept.name AS department_name,
        dcb.budget_category_id,
        category.name AS category_name,
        dcb.status,
        COUNT(item.id) AS items_count,
        COALESCE(SUM(item.requested_quantity), 0) AS total_requested_quantity
      FROM dbo.BS_department_category_budgets AS dcb
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.is_active = 1
      WHERE db.department_id = @departmentId
        AND dcb.status IN ('IN_CATEGORY_REVIEW', 'CATEGORY_REVIEW_COMPLETED')
      GROUP BY
        dcb.id,
        fy.year,
        db.department_id,
        dept.name,
        dcb.budget_category_id,
        category.name,
        dcb.status
      ORDER BY fy.year DESC, category.name;
    `);
  return result.recordset;
}

export async function listHistoryItemsForCategoryBudgetRepo(
  departmentCategoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .query(`
      SELECT
        item.id AS item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        catalogItem.name AS catalog_item_name,
        catalogItem.expense_type,
        dcb.budget_category_id,
        category.category_code,
        category.name AS category_name,
        item.requested_quantity,
        item.category_approved_quantity,
        item.distribution_method,
        item.review_status,
        item.review_note,
        item.reviewed_by,
        reviewedUser.USER_NAME AS reviewed_by_name,
        item.reviewed_at,
        item.is_active,
        item.row_version AS item_row_version,
        distribution.id AS distribution_id,
        distribution.period_type,
        distribution.period_no,
        distribution.quantity AS distribution_quantity
      FROM dbo.BS_department_category_budget_items AS item
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalogItem
        ON catalogItem.id = item.catalog_item_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      LEFT JOIN dbo.BS_department_category_budget_item_distributions AS distribution
        ON distribution.department_budget_item_id = item.id
      LEFT JOIN dbo.users AS reviewedUser
        ON reviewedUser.USER_ID = item.reviewed_by
      WHERE item.department_category_budget_id = @departmentCategoryBudgetId
        AND item.is_active = 1
      ORDER BY catalogItem.name, item.id, distribution.period_type, distribution.period_no;
    `);
  return result.recordset;
}

export async function findDepartmentBudgetByIdRepo(
  departmentBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("departmentBudgetId", sql.BigInt, departmentBudgetId).query(`
      ${departmentBudgetSelect()}
      WHERE db.id = @departmentBudgetId
      ${departmentBudgetGroupBy()};
    `);
  return result.recordset[0] || null;
}

export async function listCategoryBudgetsForDepartmentBudgetRepo(
  departmentBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("departmentBudgetId", sql.BigInt, departmentBudgetId).query(`
      SELECT
        dcb.id AS department_category_budget_id,
        dcb.department_budget_id,
        dcb.budget_category_id,
        category.category_code,
        category.name AS category_name,
        dcb.status,
        dcb.submitted_by,
        submittedUser.USER_NAME AS submitted_by_name,
        dcb.submitted_at,
        dcb.returned_by,
        returnedUser.USER_NAME AS returned_by_name,
        dcb.returned_at,
        dcb.return_reason,
        dcb.row_version,
        COUNT(CASE WHEN item.is_active = 1 THEN item.id END) AS item_count,
        COALESCE(SUM(CASE WHEN item.is_active = 1 THEN item.requested_quantity ELSE 0 END), 0) AS total_requested_quantity
      FROM dbo.BS_department_category_budgets AS dcb
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      LEFT JOIN dbo.users AS submittedUser
        ON submittedUser.USER_ID = dcb.submitted_by
      LEFT JOIN dbo.users AS returnedUser
        ON returnedUser.USER_ID = dcb.returned_by
      LEFT JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.is_active = 1
      WHERE dcb.department_budget_id = @departmentBudgetId
      GROUP BY
        dcb.id,
        dcb.department_budget_id,
        dcb.budget_category_id,
        category.category_code,
        category.name,
        category.sort_order,
        dcb.status,
        dcb.submitted_by,
        submittedUser.USER_NAME,
        dcb.submitted_at,
        dcb.returned_by,
        returnedUser.USER_NAME,
        dcb.returned_at,
        dcb.return_reason,
        dcb.row_version
      ORDER BY category.sort_order, category.name;
    `);
  return result.recordset;
}

export async function listItemsForDepartmentBudgetRepo(
  departmentBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("departmentBudgetId", sql.BigInt, departmentBudgetId).query(`
      SELECT
        item.id AS item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        catalogItem.name AS catalog_item_name,
        catalogItem.expense_type,
        dcb.budget_category_id,
        category.category_code,
        category.name AS category_name,
        item.requested_quantity,
        item.category_approved_quantity,
        item.distribution_method,
        item.review_status,
        item.review_note,
        item.reviewed_by,
        reviewedUser.USER_NAME AS reviewed_by_name,
        item.reviewed_at,
        item.is_active,
        item.row_version AS item_row_version,
        distribution.id AS distribution_id,
        distribution.period_type,
        distribution.period_no,
        distribution.quantity AS distribution_quantity
      FROM dbo.BS_department_category_budgets AS dcb
      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.is_active = 1
      INNER JOIN dbo.BS_budget_catalog_items AS catalogItem
        ON catalogItem.id = item.catalog_item_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      LEFT JOIN dbo.BS_department_category_budget_item_distributions AS distribution
        ON distribution.department_budget_item_id = item.id
      LEFT JOIN dbo.users AS reviewedUser
        ON reviewedUser.USER_ID = item.reviewed_by
      WHERE dcb.department_budget_id = @departmentBudgetId
      ORDER BY category.sort_order, catalogItem.name, item.id, distribution.period_type, distribution.period_no;
    `);
  return result.recordset;
}

export async function findDepartmentCategoryBudgetRepo(
  departmentCategoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .query(`
      SELECT TOP 1
        dcb.id,
        dcb.department_budget_id,
        dcb.budget_category_id,
        dcb.status,
        dcb.submitted_by,
        dcb.submitted_at,
        dcb.returned_by,
        dcb.returned_at,
        dcb.return_reason,
        dcb.row_version,
        db.financial_year_id,
        db.department_id,
        dept.name AS department_name,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        category.category_code,
        category.name AS category_name
      FROM dbo.BS_department_category_budgets AS dcb
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      WHERE dcb.id = @departmentCategoryBudgetId;
    `);
  return result.recordset[0] || null;
}

export async function listItemsForCategoryBudgetRepo(
  departmentCategoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .query(`
      SELECT
        item.id AS item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.distribution_method,
        item.review_status,
        item.review_note,
        item.reviewed_by,
        reviewedUser.USER_NAME AS reviewed_by_name,
        item.reviewed_at,
        item.is_active,
        item.row_version AS item_row_version,
        distribution.id AS distribution_id,
        distribution.period_type,
        distribution.period_no,
        distribution.quantity AS distribution_quantity
      FROM dbo.BS_department_category_budget_items AS item
      LEFT JOIN dbo.BS_department_category_budget_item_distributions AS distribution
        ON distribution.department_budget_item_id = item.id
      LEFT JOIN dbo.users AS reviewedUser
        ON reviewedUser.USER_ID = item.reviewed_by
      WHERE item.department_category_budget_id = @departmentCategoryBudgetId
        AND item.is_active = 1
      ORDER BY item.id, distribution.period_type, distribution.period_no;
    `);
  return result.recordset;
}

export async function validateActiveCatalogItemForCategoryRepo({
  catalogItemId,
  budgetCategoryId,
  transaction = null,
}) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("catalogItemId", sql.Int, catalogItemId)
    .input("budgetCategoryId", sql.Int, budgetCategoryId).query(`
      SELECT TOP 1 id
      FROM dbo.BS_budget_catalog_items
      WHERE id = @catalogItemId
        AND budget_category_id = @budgetCategoryId
        AND is_active = 1;
    `);
  return Boolean(result.recordset[0]);
}

export async function deactivateCategoryBudgetItemsNotInListRepo(
  transaction,
  { departmentCategoryBudgetId, keepItemIds, actorUserId },
) {
  const request = requestFor(transaction)
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .input("actorUserId", sql.Int, actorUserId);

  const keepIds = keepItemIds.filter(Boolean).map(Number);

  if (!keepIds.length) {
    await request.query(`
      UPDATE dbo.BS_department_category_budget_items
      SET is_active = 0, updated_by = @actorUserId, updated_at = SYSUTCDATETIME()
      WHERE department_category_budget_id = @departmentCategoryBudgetId
        AND is_active = 1;
    `);
    return;
  }

  const placeholders = keepIds.map((id, index) => {
    request.input(`keepId${index}`, sql.BigInt, id);
    return `@keepId${index}`;
  });

  await request.query(`
    UPDATE dbo.BS_department_category_budget_items
    SET is_active = 0, updated_by = @actorUserId, updated_at = SYSUTCDATETIME()
    WHERE department_category_budget_id = @departmentCategoryBudgetId
      AND is_active = 1
      AND id NOT IN (${placeholders.join(", ")});
  `);
}

export async function upsertDepartmentCategoryBudgetItemRepo(
  transaction,
  payload,
) {
  const request = requestFor(transaction)
    .input("id", sql.BigInt, payload.id ?? null)
    .input("departmentCategoryBudgetId", sql.BigInt, payload.department_category_budget_id)
    .input("catalogItemId", sql.Int, payload.catalog_item_id)
    .input("requestedQuantity", sql.Decimal(18, 4), payload.requested_quantity)
    .input("distributionMethod", sql.VarChar(40), payload.distribution_method)
    .input("actorUserId", sql.Int, payload.actor_user_id);

  const result = await request.query(`
    DECLARE @Updated TABLE (id BIGINT NOT NULL);

    IF @id IS NOT NULL
    BEGIN
      UPDATE dbo.BS_department_category_budget_items
      SET
        catalog_item_id = @catalogItemId,
        requested_quantity = @requestedQuantity,
        distribution_method = @distributionMethod,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @id
        AND department_category_budget_id = @departmentCategoryBudgetId
        AND is_active = 1;
    END

    IF NOT EXISTS (SELECT 1 FROM @Updated)
    BEGIN
      INSERT INTO dbo.BS_department_category_budget_items
      (
        department_category_budget_id,
        catalog_item_id,
        requested_quantity,
        distribution_method,
        review_status,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @Updated (id)
      VALUES
      (
        @departmentCategoryBudgetId,
        @catalogItemId,
        @requestedQuantity,
        @distributionMethod,
        '${DEPARTMENT_BUDGET_ITEM_STATUS.DRAFT}',
        1,
        @actorUserId
      );
    END

    SELECT id FROM @Updated;
  `);

  return result.recordset[0] || null;
}

export async function replaceItemDistributionsRepo(
  transaction,
  { itemId, distributions },
) {
  await requestFor(transaction).input("itemId", sql.BigInt, itemId).query(`
    DELETE FROM dbo.BS_department_category_budget_item_distributions
    WHERE department_budget_item_id = @itemId;
  `);

  for (const distribution of distributions) {
    await requestFor(transaction)
      .input("itemId", sql.BigInt, itemId)
      .input("periodType", sql.VarChar(20), distribution.period_type)
      .input("periodNo", sql.Int, distribution.period_no)
      .input("quantity", sql.Decimal(18, 4), distribution.quantity).query(`
        INSERT INTO dbo.BS_department_category_budget_item_distributions
        (
          department_budget_item_id,
          period_type,
          period_no,
          quantity
        )
        VALUES
        (
          @itemId,
          @periodType,
          @periodNo,
          @quantity
        );
      `);
  }
}

export async function touchDepartmentCategoryBudgetRepo(
  transaction,
  { departmentCategoryBudgetId, actorUserId },
) {
  await requestFor(transaction)
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .input("actorUserId", sql.Int, actorUserId).query(`
      UPDATE dbo.BS_department_category_budgets
      SET updated_by = @actorUserId, updated_at = SYSUTCDATETIME()
      WHERE id = @departmentCategoryBudgetId;
    `);
}

export async function findSubmissionWindowRepo(
  { financialYearId, budgetCategoryId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId)
    .input("budgetCategoryId", sql.Int, budgetCategoryId).query(`
      SELECT TOP 1 id, financial_year_id, budget_category_id, status
      FROM dbo.BS_category_submission_windows
      WHERE financial_year_id = @financialYearId
        AND budget_category_id = @budgetCategoryId;
    `);
  return result.recordset[0] || null;
}

export async function countActiveItemsForCategoryBudgetRepo(
  departmentCategoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .query(`
      SELECT COUNT(1) AS count
      FROM dbo.BS_department_category_budget_items
      WHERE department_category_budget_id = @departmentCategoryBudgetId
        AND is_active = 1;
    `);
  return Number(result.recordset[0]?.count || 0);
}

export async function markCategoryBudgetSubmittedRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("departmentCategoryBudgetId", sql.BigInt, payload.department_category_budget_id)
    .input("submittedBy", sql.Int, payload.submitted_by).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_department_category_budgets
      SET
        status = '${DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW}',
        submitted_by = @submittedBy,
        submitted_at = SYSUTCDATETIME(),
        updated_by = @submittedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @departmentCategoryBudgetId
        AND status = '${DEPARTMENT_CATEGORY_BUDGET_STATUS.DRAFT}';

      SELECT id FROM @Updated;
    `);
  return result.recordset[0] || null;
}

export async function markItemsPendingCategoryReviewRepo(
  transaction,
  { departmentCategoryBudgetId, actorUserId },
) {
  await requestFor(transaction)
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .input("actorUserId", sql.Int, actorUserId).query(`
      UPDATE dbo.BS_department_category_budget_items
      SET
        review_status = '${DEPARTMENT_BUDGET_ITEM_STATUS.PENDING_CATEGORY_REVIEW}',
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      WHERE department_category_budget_id = @departmentCategoryBudgetId
        AND is_active = 1
        AND review_status = '${DEPARTMENT_BUDGET_ITEM_STATUS.DRAFT}';
    `);
}

export async function findCategoryPackageRepo(
  { financialYearId, budgetCategoryId },
  transaction,
) {
  const result = await requestFor(transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("budgetCategoryId", sql.Int, budgetCategoryId).query(`
      SELECT TOP 1 id
      FROM dbo.BS_category_budget_packages WITH (UPDLOCK, HOLDLOCK)
      WHERE financial_year_id = @financialYearId
        AND budget_category_id = @budgetCategoryId;
    `);
  return result.recordset[0] || null;
}

export async function ensurePackageItemRepo(transaction, payload) {
  const request = requestFor(transaction)
    .input("categoryBudgetPackageId", sql.BigInt, payload.category_budget_package_id)
    .input("catalogItemId", sql.Int, payload.catalog_item_id)
    .input("actorUserId", sql.Int, payload.actor_user_id);

  const result = await request.query(`
    IF NOT EXISTS (
      SELECT 1
      FROM dbo.BS_category_budget_package_items WITH (UPDLOCK, HOLDLOCK)
      WHERE category_budget_package_id = @categoryBudgetPackageId
        AND catalog_item_id = @catalogItemId
    )
    BEGIN
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_category_budget_package_items
      (
        category_budget_package_id,
        catalog_item_id,
        cfo_review_status,
        needs_reconciliation,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @categoryBudgetPackageId,
        @catalogItemId,
        NULL,
        1,
        1,
        @actorUserId
      );
    END
    ELSE
    BEGIN
      UPDATE dbo.BS_category_budget_package_items
      SET
        needs_reconciliation = 1,
        is_active = 1,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      WHERE category_budget_package_id = @categoryBudgetPackageId
        AND catalog_item_id = @catalogItemId;
    END

    SELECT TOP 1 id
    FROM dbo.BS_category_budget_package_items
    WHERE category_budget_package_id = @categoryBudgetPackageId
      AND catalog_item_id = @catalogItemId;
  `);

  return result.recordset[0] || null;
}

export async function findGeneralCatalogSubItemRepo(
  { catalogItemId },
  transaction,
) {
  const result = await requestFor(transaction)
    .input("catalogItemId", sql.Int, catalogItemId)
    .input("generalCode", sql.VarChar(100), GENERAL_SUB_ITEM_CODE).query(`
      SELECT TOP 1
        id,
        name,
        default_specification,
        default_unit_of_measure_id
      FROM dbo.BS_budget_catalog_sub_items
      WHERE catalog_item_id = @catalogItemId
        AND is_default_general = 1
        AND sub_item_code = @generalCode
        AND is_active = 1;
    `);
  return result.recordset[0] || null;
}

export async function ensureGeneralPackageSubItemRepo(
  transaction,
  payload,
) {
  await requestFor(transaction)
    .input(
      "packageItemId",
      sql.BigInt,
      payload.category_budget_package_item_id,
    )
    .input(
      "catalogSubItemId",
      sql.Int,
      payload.catalog_sub_item_id,
    )
    .input(
      "name",
      sql.NVarChar(300),
      payload.name,
    )
    .input(
      "specification",
      sql.NVarChar(2000),
      payload.specification ?? null,
    )
    .input(
      "unitOfMeasureId",
      sql.Int,
      payload.unit_of_measure_id,
    )
    .input(
      "actorUserId",
      sql.Int,
      payload.actor_user_id,
    )
    .query(`
      /*
       * The HOD submission only guarantees that one ACTIVE
       * General package sub-item exists.
       *
       * Historical inactive rows must remain inactive.
       */
      IF NOT EXISTS
      (
        SELECT 1
        FROM dbo.BS_category_budget_package_sub_items
          WITH (UPDLOCK, HOLDLOCK)
        WHERE category_budget_package_item_id =
              @packageItemId
          AND catalog_sub_item_id =
              @catalogSubItemId
          AND is_active = 1
      )
      BEGIN
        BEGIN TRY
          INSERT INTO dbo.BS_category_budget_package_sub_items
          (
            category_budget_package_item_id,
            catalog_sub_item_id,
            name,
            specification,
            unit_of_measure_id,
            quantity,
            unit_price,
            note,
            is_active,
            created_by
          )
          VALUES
          (
            @packageItemId,
            @catalogSubItemId,
            @name,
            @specification,
            @unitOfMeasureId,
            NULL,
            NULL,
            NULL,
            1,
            @actorUserId
          );
        END TRY
        BEGIN CATCH
          /*
           * Another department may submit the same generic
           * item concurrently and create the General model
           * first.
           *
           * In that case the required active row now exists,
           * so submission can continue safely.
           */
          IF ERROR_NUMBER() NOT IN (2601, 2627)
          BEGIN
            THROW;
          END
        END CATCH;
      END;
    `);
}

export async function createWorkflowHistoryRepo(transaction, payload) {
  await requestFor(transaction)
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
