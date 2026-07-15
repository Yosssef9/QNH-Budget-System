import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import {
  CATEGORY_PACKAGE_ITEM_CFO_STATUS,
  CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS,
  CATEGORY_PACKAGE_STATUS,
} from "./cfoPackageReview.constants.js";

function requestFor(transaction) {
  return new sql.Request(transaction);
}

function bufferRowVersion(rowVersion) {
  return rowVersion ? Buffer.from(rowVersion).toString("base64") : null;
}

function mapPackageRowVersion(row) {
  if (!row) return null;
  return {
    ...row,
    row_version: bufferRowVersion(row.row_version),
  };
}

export async function listCfoPackagesRepo({ financialYearId = null } = {}) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("financialYearId", sql.Int, financialYearId)
    .query(`
    WITH packageItemSummary AS (
      SELECT
        packageItem.category_budget_package_id,
        COUNT(*) AS package_item_count,
        SUM(CASE WHEN packageItem.cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.PENDING_CFO_REVIEW}' THEN 1 ELSE 0 END) AS pending_item_count,
        SUM(CASE WHEN packageItem.cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.CFO_ACCEPTED}' THEN 1 ELSE 0 END) AS accepted_item_count,
        SUM(CASE WHEN packageItem.cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.NEEDS_MODIFICATION}' THEN 1 ELSE 0 END) AS needs_modification_item_count
      FROM dbo.BS_category_budget_package_items AS packageItem
      WHERE packageItem.is_active = 1
      GROUP BY packageItem.category_budget_package_id
    ),
    quantitySummary AS (
      SELECT
        pkg.id AS package_id,
        COALESCE(SUM(item.requested_quantity), 0) AS requested_quantity,
        COALESCE(SUM(item.category_approved_quantity), 0) AS approved_quantity
      FROM dbo.BS_category_budget_packages AS pkg
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.financial_year_id = pkg.financial_year_id
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.department_budget_id = db.id
       AND dcb.budget_category_id = pkg.budget_category_id
       AND dcb.status = 'CATEGORY_REVIEW_COMPLETED'
      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.is_active = 1
       AND item.review_status = 'CATEGORY_REVIEW_COMPLETED'
      GROUP BY pkg.id
    ),
    packageSubItemSummary AS (
      SELECT
        packageItem.category_budget_package_id,
        COALESCE(SUM(subItem.quantity), 0) AS allocated_quantity,
        COALESCE(SUM(subItem.quantity * subItem.unit_price), 0) AS estimated_total
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1
      WHERE packageItem.is_active = 1
      GROUP BY packageItem.category_budget_package_id
    ),
    departmentCoverage AS (
      SELECT
        pkg.id AS package_id,
        COUNT(1) AS total_department_count,
        SUM(CASE WHEN dcb.status <> 'DRAFT' THEN 1 ELSE 0 END) AS submitted_department_count,
        SUM(CASE WHEN dcb.status = 'DRAFT' THEN 1 ELSE 0 END) AS not_submitted_department_count,
        SUM(CASE WHEN dcb.status = 'IN_CATEGORY_REVIEW' THEN 1 ELSE 0 END) AS in_review_department_count,
        SUM(CASE WHEN dcb.status = 'CATEGORY_REVIEW_COMPLETED' THEN 1 ELSE 0 END) AS completed_department_count
      FROM dbo.BS_category_budget_packages AS pkg
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.financial_year_id = pkg.financial_year_id
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.department_budget_id = db.id
       AND dcb.budget_category_id = pkg.budget_category_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      WHERE dept.is_active = 1
      GROUP BY pkg.id
    )
    SELECT
      finalized.finalized_at AS financial_year_cfo_review_finalized_at,
      finalized.created_by AS financial_year_cfo_review_finalized_by,
      finalizedUser.USER_NAME AS financial_year_cfo_review_finalized_by_name,
      pkg.id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.name AS category_name,
      category.category_code,
      pkg.status,
      pkg.submitted_to_cfo_by,
      submittedUser.USER_NAME AS submitted_to_cfo_by_name,
      pkg.submitted_to_cfo_at,
      pkg.returned_by_cfo,
      returnedUser.USER_NAME AS returned_by_cfo_name,
      pkg.returned_at,
      pkg.return_reason,
      pkg.cfo_review_completed_by,
      completedUser.USER_NAME AS cfo_review_completed_by_name,
      pkg.cfo_review_completed_at,
      pkg.row_version,
      COALESCE(packageItemSummary.package_item_count, 0) AS package_item_count,
      COALESCE(packageItemSummary.pending_item_count, 0) AS pending_item_count,
      COALESCE(packageItemSummary.accepted_item_count, 0) AS accepted_item_count,
      COALESCE(packageItemSummary.needs_modification_item_count, 0) AS needs_modification_item_count,
      COALESCE(quantitySummary.requested_quantity, 0) AS requested_quantity,
      COALESCE(quantitySummary.approved_quantity, 0) AS approved_quantity,
      COALESCE(packageSubItemSummary.allocated_quantity, 0) AS allocated_quantity,
      COALESCE(packageSubItemSummary.estimated_total, 0) AS estimated_total,
      COALESCE(departmentCoverage.total_department_count, 0) AS total_department_count,
      COALESCE(departmentCoverage.submitted_department_count, 0) AS submitted_department_count,
      COALESCE(departmentCoverage.not_submitted_department_count, 0) AS not_submitted_department_count,
      COALESCE(departmentCoverage.in_review_department_count, 0) AS in_review_department_count,
      COALESCE(departmentCoverage.completed_department_count, 0) AS completed_department_count
    FROM dbo.BS_category_budget_packages AS pkg
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
    OUTER APPLY (
      SELECT TOP 1 history.created_at AS finalized_at, history.created_by
      FROM dbo.BS_budget_workflow_history AS history
      WHERE history.financial_year_id = pkg.financial_year_id
        AND history.entity_type = 'FINANCIAL_YEAR'
        AND history.entity_id = pkg.financial_year_id
        AND history.action = '${CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ANNUAL_REVIEW_FINALIZED}'
      ORDER BY history.created_at DESC, history.id DESC
    ) AS finalized
    LEFT JOIN dbo.users AS finalizedUser
      ON finalizedUser.USER_ID = finalized.created_by
    LEFT JOIN dbo.users AS submittedUser
      ON submittedUser.USER_ID = pkg.submitted_to_cfo_by
    LEFT JOIN dbo.users AS returnedUser
      ON returnedUser.USER_ID = pkg.returned_by_cfo
    LEFT JOIN dbo.users AS completedUser
      ON completedUser.USER_ID = pkg.cfo_review_completed_by
    LEFT JOIN packageItemSummary
      ON packageItemSummary.category_budget_package_id = pkg.id
    LEFT JOIN quantitySummary
      ON quantitySummary.package_id = pkg.id
    LEFT JOIN packageSubItemSummary
      ON packageSubItemSummary.category_budget_package_id = pkg.id
    LEFT JOIN departmentCoverage
      ON departmentCoverage.package_id = pkg.id
    WHERE pkg.status IN (
      '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}',
      '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}',
      '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}'
    )
      AND (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
    ORDER BY
      fy.year DESC,
      CASE pkg.status
        WHEN '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}' THEN 0
        WHEN '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}' THEN 1
        ELSE 2
      END,
      pkg.submitted_to_cfo_at DESC,
      category.name;
  `);

  return result.recordset.map((row) => ({
    ...row,
    row_version: bufferRowVersion(row.row_version),
  }));
}

export async function listCfoFinancialYearsRepo() {
  const pool = await poolPromise;
  const result = await createRequest(pool).query(`
    WITH packageSummary AS (
      SELECT
        pkg.financial_year_id,
        COUNT(*) AS package_count,
        SUM(
          CASE
            WHEN pkg.status IN (
              '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}',
              '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}',
              '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}'
            )
            THEN 1
            ELSE 0
          END
        ) AS review_package_count,
        SUM(CASE WHEN pkg.status = '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}' THEN 1 ELSE 0 END) AS completed_package_count,
        SUM(CASE WHEN pkg.status = '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}' THEN 1 ELSE 0 END) AS in_review_package_count,
        SUM(CASE WHEN pkg.status = '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}' THEN 1 ELSE 0 END) AS returned_package_count
      FROM dbo.BS_category_budget_packages AS pkg
      GROUP BY pkg.financial_year_id
    )
    SELECT
      fy.id,
      fy.year,
      fy.status,
      COALESCE(packageSummary.package_count, 0) AS package_count,
      COALESCE(packageSummary.review_package_count, 0) AS review_package_count,
      COALESCE(packageSummary.completed_package_count, 0) AS completed_package_count,
      COALESCE(packageSummary.in_review_package_count, 0) AS in_review_package_count,
      COALESCE(packageSummary.returned_package_count, 0) AS returned_package_count,
      finalized.created_at AS cfo_review_finalized_at,
      finalized.created_by AS cfo_review_finalized_by,
      finalizedUser.USER_NAME AS cfo_review_finalized_by_name
    FROM dbo.BS_financial_years AS fy
    LEFT JOIN packageSummary
      ON packageSummary.financial_year_id = fy.id
    OUTER APPLY (
      SELECT TOP 1 history.created_at, history.created_by
      FROM dbo.BS_budget_workflow_history AS history
      WHERE history.financial_year_id = fy.id
        AND history.entity_type = 'FINANCIAL_YEAR'
        AND history.entity_id = fy.id
        AND history.action = '${CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ANNUAL_REVIEW_FINALIZED}'
      ORDER BY history.created_at DESC, history.id DESC
    ) AS finalized
    LEFT JOIN dbo.users AS finalizedUser
      ON finalizedUser.USER_ID = finalized.created_by
    WHERE EXISTS (
      SELECT 1
      FROM dbo.BS_category_budget_packages AS pkg
      WHERE pkg.financial_year_id = fy.id
    )
    ORDER BY
      CASE WHEN fy.status IN ('OPEN', 'PRE_CLOSING') THEN 0 ELSE 1 END,
      fy.year DESC;
  `);

  return result.recordset;
}

export async function findCfoPackageByIdRepo({ packageId }, transaction = null) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("packageId", sql.BigInt, packageId).query(`
    SELECT TOP 1
      finalized.finalized_at AS financial_year_cfo_review_finalized_at,
      finalized.created_by AS financial_year_cfo_review_finalized_by,
      finalizedUser.USER_NAME AS financial_year_cfo_review_finalized_by_name,
      pkg.id,
      pkg.financial_year_id,
      pkg.budget_category_id,
      pkg.status,
      pkg.submitted_to_cfo_by,
      submittedUser.USER_NAME AS submitted_to_cfo_by_name,
      pkg.submitted_to_cfo_at,
      pkg.returned_by_cfo,
      returnedUser.USER_NAME AS returned_by_cfo_name,
      pkg.returned_at,
      pkg.return_reason,
      pkg.cfo_review_completed_by,
      completedUser.USER_NAME AS cfo_review_completed_by_name,
      pkg.cfo_review_completed_at,
      pkg.row_version,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      category.name AS category_name,
      category.category_code,
      window.id AS submission_window_id,
      window.status AS submission_window_status,
      window.closed_at AS submission_window_closed_at,
      window.close_reason AS submission_window_close_reason,
      COALESCE(departmentCoverage.total_department_count, 0) AS total_department_count,
      COALESCE(departmentCoverage.submitted_department_count, 0) AS submitted_department_count,
      COALESCE(departmentCoverage.not_submitted_department_count, 0) AS not_submitted_department_count,
      COALESCE(departmentCoverage.in_review_department_count, 0) AS in_review_department_count,
      COALESCE(departmentCoverage.completed_department_count, 0) AS completed_department_count
    FROM dbo.BS_category_budget_packages AS pkg
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
    OUTER APPLY (
      SELECT
        COUNT(1) AS total_department_count,
        SUM(CASE WHEN dcb.status <> 'DRAFT' THEN 1 ELSE 0 END) AS submitted_department_count,
        SUM(CASE WHEN dcb.status = 'DRAFT' THEN 1 ELSE 0 END) AS not_submitted_department_count,
        SUM(CASE WHEN dcb.status = 'IN_CATEGORY_REVIEW' THEN 1 ELSE 0 END) AS in_review_department_count,
        SUM(CASE WHEN dcb.status = 'CATEGORY_REVIEW_COMPLETED' THEN 1 ELSE 0 END) AS completed_department_count
      FROM dbo.BS_department_budgets AS db
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.department_budget_id = db.id
       AND dcb.budget_category_id = pkg.budget_category_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      WHERE db.financial_year_id = pkg.financial_year_id
        AND dept.is_active = 1
    ) AS departmentCoverage
    OUTER APPLY (
      SELECT TOP 1 history.created_at AS finalized_at, history.created_by
      FROM dbo.BS_budget_workflow_history AS history
      WHERE history.financial_year_id = pkg.financial_year_id
        AND history.entity_type = 'FINANCIAL_YEAR'
        AND history.entity_id = pkg.financial_year_id
        AND history.action = '${CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ANNUAL_REVIEW_FINALIZED}'
      ORDER BY history.created_at DESC, history.id DESC
    ) AS finalized
    LEFT JOIN dbo.users AS finalizedUser
      ON finalizedUser.USER_ID = finalized.created_by
    LEFT JOIN dbo.BS_category_submission_windows AS window
      ON window.financial_year_id = pkg.financial_year_id
     AND window.budget_category_id = pkg.budget_category_id
    LEFT JOIN dbo.users AS submittedUser
      ON submittedUser.USER_ID = pkg.submitted_to_cfo_by
    LEFT JOIN dbo.users AS returnedUser
      ON returnedUser.USER_ID = pkg.returned_by_cfo
    LEFT JOIN dbo.users AS completedUser
      ON completedUser.USER_ID = pkg.cfo_review_completed_by
    WHERE pkg.id = @packageId;
  `);

  return mapPackageRowVersion(result.recordset[0]);
}

export async function findPackageItemForCfoRepo(
  { packageId, packageItemId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("packageId", sql.BigInt, packageId)
    .input("packageItemId", sql.BigInt, packageItemId).query(`
      SELECT TOP 1
        packageItem.id,
        packageItem.category_budget_package_id,
        packageItem.catalog_item_id,
        packageItem.cfo_review_status,
        packageItem.cfo_review_note,
        packageItem.cfo_reviewed_by,
        packageItem.cfo_reviewed_at,
        packageItem.row_version,
        pkg.financial_year_id,
        fy.status AS financial_year_status,
        pkg.budget_category_id,
        pkg.status AS package_status,
        pkg.row_version AS package_row_version,
        category.name AS category_name,
        category.category_code,
        COALESCE(packageItem.catalog_item_name_snapshot, catalog.name) AS catalog_item_name,
        COALESCE(packageItem.catalog_item_code_snapshot, catalog.item_code) AS catalog_item_code
      FROM dbo.BS_category_budget_package_items AS packageItem WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = pkg.budget_category_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.id = packageItem.catalog_item_id
      WHERE packageItem.id = @packageItemId
        AND packageItem.category_budget_package_id = @packageId
        AND packageItem.is_active = 1;
    `);

  const row = result.recordset[0] || null;
  if (!row) return null;
  return {
    ...row,
    row_version: bufferRowVersion(row.row_version),
    package_row_version: bufferRowVersion(row.package_row_version),
  };
}

export async function updatePackageItemCfoDecisionRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageItemId", sql.BigInt, payload.package_item_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("decision", sql.VarChar(40), payload.decision)
    .input("note", sql.NVarChar(1000), payload.note)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_budget_package_items
      SET
        cfo_review_status = @decision,
        cfo_review_note = @note,
        cfo_reviewed_by = @actorUserId,
        cfo_reviewed_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @packageItemId
        AND row_version = @rowVersion
        AND is_active = 1;

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function markAllPackageItemsNeedModificationRepo(
  transaction,
  payload,
) {
  const result = await requestFor(transaction)
    .input("packageId", sql.BigInt, payload.package_id)
    .input("note", sql.NVarChar(1000), payload.note)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      UPDATE dbo.BS_category_budget_package_items
      SET
        cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.NEEDS_MODIFICATION}',
        cfo_review_note = @note,
        cfo_reviewed_by = @actorUserId,
        cfo_reviewed_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      WHERE category_budget_package_id = @packageId
        AND is_active = 1;

      SELECT @@ROWCOUNT AS affected_count;
    `);

  return Number(result.recordset[0]?.affected_count || 0);
}

export async function countPackageCfoReviewStatusesRepo(
  { packageId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("packageId", sql.BigInt, packageId).query(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.PENDING_CFO_REVIEW}' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.CFO_ACCEPTED}' THEN 1 ELSE 0 END) AS accepted_count,
      SUM(CASE WHEN cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.NEEDS_MODIFICATION}' THEN 1 ELSE 0 END) AS needs_modification_count
    FROM dbo.BS_category_budget_package_items
    WHERE category_budget_package_id = @packageId
      AND is_active = 1;
  `);

  const row = result.recordset[0] || {};
  return {
    total_count: Number(row.total_count || 0),
    pending_count: Number(row.pending_count || 0),
    accepted_count: Number(row.accepted_count || 0),
    needs_modification_count: Number(row.needs_modification_count || 0),
  };
}

export async function returnPackageToCategoryManagerRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageId", sql.BigInt, payload.package_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("reason", sql.NVarChar(1000), payload.reason)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_budget_packages
      SET
        status = '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}',
        returned_by_cfo = @actorUserId,
        returned_at = SYSUTCDATETIME(),
        return_reason = @reason,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @packageId
        AND row_version = @rowVersion
        AND status = '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}';

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function completeCfoPackageReviewRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageId", sql.BigInt, payload.package_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_budget_packages
      SET
        status = '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}',
        cfo_review_completed_by = @actorUserId,
        cfo_review_completed_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @packageId
        AND row_version = @rowVersion
        AND status = '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}';

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function reopenCfoPackageReviewRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageId", sql.BigInt, payload.package_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_budget_packages
      SET
        status = '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}',
        cfo_review_completed_by = NULL,
        cfo_review_completed_at = NULL,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @packageId
        AND row_version = @rowVersion
        AND status = '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}';

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function getFinancialYearPackageCompletionSummaryRepo(
  { financialYearId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);

  const result = await request
    .input("financialYearId", sql.Int, financialYearId)
    .query(`
      SELECT
        MAX(fy.status) AS financial_year_status,
        COUNT(1) AS package_count,

        SUM(
          CASE
            WHEN pkg.status = '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}'
            THEN 1
            ELSE 0
          END
        ) AS completed_count,

        SUM(
          CASE
            WHEN pkg.status <> '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}'
            THEN 1
            ELSE 0
          END
        ) AS incomplete_count

      FROM dbo.BS_category_budget_packages AS pkg

      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id

      WHERE pkg.financial_year_id = @financialYearId;
    `);

  const row = result.recordset[0] || {};

  return {
    package_count: Number(row.package_count || 0),
    financial_year_status:
      row.financial_year_status || null,
    completed_count: Number(
      row.completed_count || 0,
    ),
    incomplete_count: Number(
      row.incomplete_count || 0,
    ),
  };
}

export async function findAnnualCfoReviewFinalizationRepo(
  { financialYearId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT TOP 1
        history.id,
        history.created_at,
        history.created_by,
        userRow.USER_NAME AS created_by_name
      FROM dbo.BS_budget_workflow_history AS history
      LEFT JOIN dbo.users AS userRow
        ON userRow.USER_ID = history.created_by
      WHERE history.financial_year_id = @financialYearId
        AND history.entity_type = 'FINANCIAL_YEAR'
        AND history.entity_id = @financialYearId
        AND history.action = '${CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ANNUAL_REVIEW_FINALIZED}'
      ORDER BY history.created_at DESC, history.id DESC;
    `);

  return result.recordset[0] || null;
}

export async function listCfoPackageTimelineRepo({ packageId }) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("packageId", sql.BigInt, packageId)
    .query(`
      WITH packageHistory AS (
        SELECT
          history.id,
          history.financial_year_id,
          history.entity_type,
          history.entity_id,
          history.action,
          history.old_status,
          history.new_status,
          history.note,
          history.old_values_json,
          history.new_values_json,
          history.created_by,
          history.created_at,
          CAST(category.name AS NVARCHAR(300)) AS context_name,
          CAST(NULL AS BIGINT) AS package_item_id,
          CAST(NULL AS NVARCHAR(300)) AS package_item_name
        FROM dbo.BS_budget_workflow_history AS history
        INNER JOIN dbo.BS_category_budget_packages AS pkg
          ON pkg.id = history.entity_id
        INNER JOIN dbo.BS_budget_categories AS category
          ON category.id = pkg.budget_category_id
        WHERE history.entity_type = 'CATEGORY_BUDGET_PACKAGE'
          AND history.entity_id = @packageId

        UNION ALL

        SELECT
          history.id,
          history.financial_year_id,
          history.entity_type,
          history.entity_id,
          history.action,
          history.old_status,
          history.new_status,
          history.note,
          history.old_values_json,
          history.new_values_json,
          history.created_by,
          history.created_at,
          CAST(COALESCE(packageItem.catalog_item_name_snapshot, catalogItem.name) AS NVARCHAR(300)) AS context_name,
          packageItem.id AS package_item_id,
          CAST(COALESCE(packageItem.catalog_item_name_snapshot, catalogItem.name) AS NVARCHAR(300)) AS package_item_name
        FROM dbo.BS_budget_workflow_history AS history
        INNER JOIN dbo.BS_category_budget_package_items AS packageItem
          ON packageItem.id = history.entity_id
        INNER JOIN dbo.BS_budget_catalog_items AS catalogItem
          ON catalogItem.id = packageItem.catalog_item_id
        WHERE history.entity_type = 'CATEGORY_BUDGET_PACKAGE_ITEM'
          AND packageItem.category_budget_package_id = @packageId
      )
      SELECT
        packageHistory.id,
        packageHistory.financial_year_id,
        packageHistory.entity_type,
        packageHistory.entity_id,
        packageHistory.action,
        packageHistory.old_status,
        packageHistory.new_status,
        packageHistory.note,
        packageHistory.old_values_json,
        packageHistory.new_values_json,
        packageHistory.context_name,
        packageHistory.package_item_id,
        packageHistory.package_item_name,
        packageHistory.created_by,
        userRow.USER_NAME AS user_name,
        userRow.USER_CODE AS user_code,
        packageHistory.created_at
      FROM packageHistory
      LEFT JOIN dbo.users AS userRow
        ON userRow.USER_ID = packageHistory.created_by
      ORDER BY packageHistory.created_at ASC, packageHistory.id ASC;
    `);

  return result.recordset || [];
}
