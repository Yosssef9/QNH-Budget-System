import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import {
  DEPARTMENT_BUDGET_ITEM_STATUS,
  DEPARTMENT_CATEGORY_BUDGET_STATUS,
} from "./categoryReview.constants.js";

function requestFor(transaction) {
  return new sql.Request(transaction);
}

export async function findOpenSubmissionWindowForCategoryRepo(
  { budgetCategoryId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input(
    "budgetCategoryId",
    sql.Int,
    budgetCategoryId,
  ).query(`
      SELECT TOP 1
        window.id,
        window.financial_year_id,
        window.budget_category_id,
        window.status,
        window.closed_by,
        closedUser.USER_NAME AS closed_by_name,
        window.closed_at,
        window.close_reason,
        window.reopened_by,
        reopenedUser.USER_NAME AS reopened_by_name,
        window.reopened_at,
        window.reopen_reason,
        window.row_version,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        category.name AS category_name,
        category.category_code
      FROM dbo.BS_category_submission_windows AS window
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = window.financial_year_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = window.budget_category_id
      LEFT JOIN dbo.users AS closedUser
        ON closedUser.USER_ID = window.closed_by
      LEFT JOIN dbo.users AS reopenedUser
        ON reopenedUser.USER_ID = window.reopened_by
      WHERE window.budget_category_id = @budgetCategoryId
        AND fy.status = 'OPEN'
      ORDER BY fy.year DESC, window.id DESC;
    `);
  return result.recordset[0] || null;
}

export async function closeSubmissionWindowRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("windowId", sql.BigInt, payload.window_id)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("closeReason", sql.NVarChar(1000), payload.close_reason ?? null)
    .query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_submission_windows
      SET
        status = 'CLOSED',
        closed_by = @actorUserId,
        closed_at = SYSUTCDATETIME(),
        close_reason = @closeReason,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @windowId
        AND status = 'OPEN';

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function reopenSubmissionWindowRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("windowId", sql.BigInt, payload.window_id)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("reopenReason", sql.NVarChar(1000), payload.reopen_reason).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_submission_windows
      SET
        status = 'OPEN',
        reopened_by = @actorUserId,
        reopened_at = SYSUTCDATETIME(),
        reopen_reason = @reopenReason,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @windowId
        AND status = 'CLOSED';

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function listCategoryReviewQueueRepo({ budgetCategoryId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("budgetCategoryId", sql.Int, budgetCategoryId).query(`
      SELECT
        dcb.id AS department_category_budget_id,
        dcb.department_budget_id,
        db.department_id,
        dept.name AS department_name,
        dept.department_code,
        db.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        dcb.budget_category_id,
        category.category_code,
        category.name AS category_name,
        dcb.status,
        dcb.submitted_by,
        submittedUser.USER_NAME AS submitted_by_name,
        dcb.submitted_at,
        dcb.returned_at,
        dcb.return_reason,
        dcb.row_version,
        COUNT(CASE WHEN item.is_active = 1 THEN item.id END) AS item_count,
        COALESCE(SUM(CASE WHEN item.is_active = 1 THEN item.requested_quantity ELSE 0 END), 0) AS total_requested_quantity,
        COALESCE(SUM(CASE WHEN item.is_active = 1 THEN item.category_approved_quantity ELSE 0 END), 0) AS total_approved_quantity,
        SUM(CASE WHEN item.is_active = 1 AND item.review_status = '${DEPARTMENT_BUDGET_ITEM_STATUS.PENDING_CATEGORY_REVIEW}' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN item.is_active = 1 AND item.review_status = '${DEPARTMENT_BUDGET_ITEM_STATUS.CATEGORY_REVIEW_COMPLETED}' THEN 1 ELSE 0 END) AS reviewed_count
      FROM dbo.BS_department_category_budgets AS dcb
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      LEFT JOIN dbo.users AS submittedUser
        ON submittedUser.USER_ID = dcb.submitted_by
      LEFT JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.is_active = 1
      WHERE dcb.budget_category_id = @budgetCategoryId
        AND fy.status = 'OPEN'
        AND dcb.status IN (
          '${DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW}',
          '${DEPARTMENT_CATEGORY_BUDGET_STATUS.CATEGORY_REVIEW_COMPLETED}'
        )
      GROUP BY
        dcb.id,
        dcb.department_budget_id,
        db.department_id,
        dept.name,
        dept.department_code,
        db.financial_year_id,
        fy.year,
        fy.status,
        dcb.budget_category_id,
        category.category_code,
        category.name,
        dcb.status,
        dcb.submitted_by,
        submittedUser.USER_NAME,
        dcb.submitted_at,
        dcb.returned_at,
        dcb.return_reason,
        dcb.row_version
      ORDER BY
        CASE dcb.status
          WHEN '${DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW}' THEN 1
          ELSE 3
        END,
        dcb.submitted_at DESC,
        dept.name;
    `);
  return result.recordset;
}

export async function findDepartmentCategoryBudgetForReviewRepo(
  departmentCategoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);

  const result = await request.input(
    "departmentCategoryBudgetId",
    sql.BigInt,
    departmentCategoryBudgetId,
  ).query(`
      SELECT TOP 1
        dcb.id,
        dcb.department_budget_id,
        dcb.budget_category_id,
        dcb.status,

        dcb.submitted_by,
        submittedUser.USER_NAME AS submitted_by_name,
        dcb.submitted_at,

        dcb.returned_by,
        returnedUser.USER_NAME AS returned_by_name,
        dcb.returned_at,
        dcb.return_reason,

        dcb.category_review_completed_by,
        completedUser.USER_NAME AS category_review_completed_by_name,
        dcb.category_review_completed_at,

        dcb.row_version,

        db.financial_year_id,
        db.department_id,

        dept.name AS department_name,
        dept.department_code,

        fy.year AS financial_year,
        fy.status AS financial_year_status,

        category.category_code,
        category.name AS category_name,

        pkg.id AS category_package_id,
        pkg.status AS category_package_status,
        pkg.submitted_to_cfo_by,
        cfoSubmitUser.USER_NAME AS submitted_to_cfo_by_name,
        pkg.submitted_to_cfo_at,
        pkg.returned_by_cfo AS package_returned_by_cfo,
        cfoReturnedUser.USER_NAME AS package_returned_by_cfo_name,
        pkg.returned_at AS package_returned_at,
        pkg.return_reason AS package_return_reason,
        pkg.row_version AS category_package_row_version

      FROM dbo.BS_department_category_budgets AS dcb

      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id

      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id

      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id

      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id

      LEFT JOIN dbo.users AS submittedUser
        ON submittedUser.USER_ID = dcb.submitted_by

      LEFT JOIN dbo.users AS returnedUser
        ON returnedUser.USER_ID = dcb.returned_by

      LEFT JOIN dbo.users AS completedUser
        ON completedUser.USER_ID =
          dcb.category_review_completed_by

      LEFT JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.financial_year_id = db.financial_year_id
       AND pkg.budget_category_id = dcb.budget_category_id

      LEFT JOIN dbo.users AS cfoSubmitUser
        ON cfoSubmitUser.USER_ID = pkg.submitted_to_cfo_by

      LEFT JOIN dbo.users AS cfoReturnedUser
        ON cfoReturnedUser.USER_ID = pkg.returned_by_cfo

      WHERE dcb.id = @departmentCategoryBudgetId;
    `);

  return result.recordset[0] || null;
}
export async function findDepartmentCategoryReviewReopenContextRepo(
  departmentCategoryBudgetId,
  transaction,
) {
  const result = await requestFor(transaction).input(
    "departmentCategoryBudgetId",
    sql.BigInt,
    departmentCategoryBudgetId,
  ).query(`
      SELECT TOP 1
        dcb.id,
        dcb.department_budget_id,
        dcb.budget_category_id,
        dcb.status,
        dcb.category_review_completed_by,
        dcb.category_review_completed_at,
        dcb.row_version,

        db.financial_year_id,
        db.department_id,

        fy.year AS financial_year,
        fy.status AS financial_year_status,

        dept.name AS department_name,
        dept.department_code,

        category.name AS category_name,
        category.category_code,

        pkg.id AS category_package_id,
        pkg.status AS category_package_status,
        pkg.submitted_to_cfo_by,
        pkg.submitted_to_cfo_at

      FROM dbo.BS_department_category_budgets AS dcb
        WITH (UPDLOCK, HOLDLOCK)

      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id

      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id

      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id

      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id

      LEFT JOIN dbo.BS_category_budget_packages AS pkg
        WITH (UPDLOCK, HOLDLOCK)
        ON pkg.financial_year_id = db.financial_year_id
       AND pkg.budget_category_id = dcb.budget_category_id

      WHERE dcb.id = @departmentCategoryBudgetId;
    `);

  return result.recordset[0] || null;
}
export async function reopenDepartmentCategoryReviewRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input(
      "departmentCategoryBudgetId",
      sql.BigInt,
      payload.department_category_budget_id,
    )
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("rowVersion", sql.VarBinary(8), payload.row_version).query(`
      DECLARE @Updated TABLE
      (
        id BIGINT NOT NULL
      );

      UPDATE dbo.BS_department_category_budgets
      SET
        status =
          '${DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW}',
        category_review_completed_by = NULL,
        category_review_completed_at = NULL,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      INTO @Updated (id)
      WHERE id = @departmentCategoryBudgetId
        AND status =
          '${DEPARTMENT_CATEGORY_BUDGET_STATUS.CATEGORY_REVIEW_COMPLETED}'
        AND row_version = @rowVersion;

      SELECT id
      FROM @Updated;
    `);

  return result.recordset[0] || null;
}
export async function markPackageItemNeedsReconciliationRepo(
  transaction,
  payload,
) {
  await requestFor(transaction)
    .input("financialYearId", sql.Int, payload.financial_year_id)
    .input("budgetCategoryId", sql.Int, payload.budget_category_id)
    .input("catalogItemId", sql.Int, payload.catalog_item_id)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      UPDATE packageItem
      SET
        packageItem.needs_reconciliation = 1,
        packageItem.updated_by = @actorUserId,
        packageItem.updated_at = SYSUTCDATETIME()
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id =
          packageItem.category_budget_package_id
      WHERE pkg.financial_year_id = @financialYearId
        AND pkg.budget_category_id = @budgetCategoryId
        AND packageItem.catalog_item_id = @catalogItemId;
    `);
}
export async function findDepartmentBudgetItemForReviewRepo(
  itemId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("itemId", sql.BigInt, itemId).query(`
    SELECT TOP 1
      item.id,
      item.department_category_budget_id,
      item.catalog_item_id,
      catalogItem.name AS catalog_item_name,
      item.requested_quantity,
      item.category_approved_quantity,
      item.review_status,
      item.review_note,
      item.is_active,
      dcb.status AS category_budget_status,
      dcb.budget_category_id,
      db.financial_year_id,
      db.department_id,
      dept.name AS department_name,
      category.name AS category_name,
      fy.year AS financial_year,
      fy.status AS financial_year_status
    FROM dbo.BS_department_category_budget_items AS item
    INNER JOIN dbo.BS_department_category_budgets AS dcb
      ON dcb.id = item.department_category_budget_id
    INNER JOIN dbo.BS_department_budgets AS db
      ON db.id = dcb.department_budget_id
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = db.financial_year_id
    INNER JOIN dbo.BS_departments AS dept
      ON dept.id = db.department_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = dcb.budget_category_id
    INNER JOIN dbo.BS_budget_catalog_items AS catalogItem
      ON catalogItem.id = item.catalog_item_id
    WHERE item.id = @itemId;
  `);
  return result.recordset[0] || null;
}

export async function listItemsForReviewBudgetRepo(
  departmentCategoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input(
    "departmentCategoryBudgetId",
    sql.BigInt,
    departmentCategoryBudgetId,
  ).query(`
      SELECT
        item.id AS item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        catalogItem.name AS catalog_item_name,
        catalogItem.expense_type,
        catalogItem.unit_of_measure_id,
        unit.name AS unit_name,
        unit.unit_code,
        item.requested_quantity,
        item.category_approved_quantity,
        item.distribution_method,
        item.review_status,
        item.review_note,
        reviewedUser.USER_NAME AS reviewed_by_name,
        item.reviewed_by,
        item.reviewed_at,
        item.is_active,
        item.row_version AS item_row_version,
        packageItem.id AS package_item_id,
        packageItem.cfo_review_status AS package_item_cfo_review_status,
        packageItem.cfo_review_note AS package_item_cfo_review_note,
        packageItem.cfo_reviewed_by AS package_item_cfo_reviewed_by,
        cfoReviewedUser.USER_NAME AS package_item_cfo_reviewed_by_name,
        packageItem.cfo_reviewed_at AS package_item_cfo_reviewed_at,
        distribution.id AS distribution_id,
        distribution.period_type,
        distribution.period_no,
        distribution.quantity AS distribution_quantity
      FROM dbo.BS_department_category_budget_items AS item
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalogItem
        ON catalogItem.id = item.catalog_item_id
      LEFT JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = catalogItem.unit_of_measure_id
      LEFT JOIN dbo.BS_category_budget_packages AS packageForItem
        ON packageForItem.financial_year_id = db.financial_year_id
       AND packageForItem.budget_category_id = dcb.budget_category_id
      LEFT JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.category_budget_package_id = packageForItem.id
       AND packageItem.catalog_item_id = item.catalog_item_id
       AND packageItem.is_active = 1
      LEFT JOIN dbo.users AS cfoReviewedUser
        ON cfoReviewedUser.USER_ID = packageItem.cfo_reviewed_by
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

export async function updateItemReviewDecisionRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("itemId", sql.BigInt, payload.item_id)
    .input(
      "approvedQuantity",
      sql.Decimal(18, 4),
      payload.category_approved_quantity,
    )
    .input("reviewNote", sql.NVarChar(sql.MAX), payload.review_note ?? null)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_department_category_budget_items
      SET
        review_status = '${DEPARTMENT_BUDGET_ITEM_STATUS.CATEGORY_REVIEW_COMPLETED}',
        category_approved_quantity = @approvedQuantity,
        review_note = @reviewNote,
        reviewed_by = @actorUserId,
        reviewed_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @itemId
        AND is_active = 1;

      SELECT id FROM @Updated;
    `);
  return result.recordset[0] || null;
}

export async function countActiveReviewStatusesRepo(
  departmentCategoryBudgetId,
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input(
    "departmentCategoryBudgetId",
    sql.BigInt,
    departmentCategoryBudgetId,
  ).query(`
      SELECT
        COUNT(1) AS total_count,
        SUM(CASE WHEN review_status = '${DEPARTMENT_BUDGET_ITEM_STATUS.CATEGORY_REVIEW_COMPLETED}' THEN 1 ELSE 0 END) AS reviewed_count,
        SUM(CASE WHEN review_status = '${DEPARTMENT_BUDGET_ITEM_STATUS.PENDING_CATEGORY_REVIEW}' THEN 1 ELSE 0 END) AS pending_count
      FROM dbo.BS_department_category_budget_items
      WHERE department_category_budget_id = @departmentCategoryBudgetId
        AND is_active = 1;
    `);
  return (
    result.recordset[0] || {
      total_count: 0,
      reviewed_count: 0,
      pending_count: 0,
    }
  );
}

export async function markCategoryBudgetReviewCompletedRepo(
  transaction,
  payload,
) {
  const result = await requestFor(transaction)
    .input(
      "departmentCategoryBudgetId",
      sql.BigInt,
      payload.department_category_budget_id,
    )
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE
      (
        id BIGINT NOT NULL
      );

      UPDATE dbo.BS_department_category_budgets
      SET
        status =
          '${DEPARTMENT_CATEGORY_BUDGET_STATUS.CATEGORY_REVIEW_COMPLETED}',
        category_review_completed_by = @actorUserId,
        category_review_completed_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      INTO @Updated (id)
      WHERE id = @departmentCategoryBudgetId
        AND status =
          '${DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW}';

      SELECT id
      FROM @Updated;
    `);

  return result.recordset[0] || null;
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
