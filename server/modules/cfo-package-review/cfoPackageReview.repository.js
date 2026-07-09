import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import {
  CATEGORY_PACKAGE_ITEM_CFO_STATUS,
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

export async function listCfoPackagesRepo() {
  const pool = await poolPromise;
  const result = await createRequest(pool).query(`
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
    )
    SELECT
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
      COALESCE(packageSubItemSummary.estimated_total, 0) AS estimated_total
    FROM dbo.BS_category_budget_packages AS pkg
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
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
    WHERE pkg.status IN (
      '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}',
      '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}',
      '${CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED}'
    )
    ORDER BY
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

export async function findCfoPackageByIdRepo({ packageId }, transaction = null) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("packageId", sql.BigInt, packageId).query(`
    SELECT TOP 1
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
      window.close_reason AS submission_window_close_reason
    FROM dbo.BS_category_budget_packages AS pkg
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
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
        pkg.budget_category_id,
        pkg.status AS package_status,
        pkg.row_version AS package_row_version,
        category.name AS category_name,
        category.category_code,
        catalog.name AS catalog_item_name,
        catalog.item_code AS catalog_item_code
      FROM dbo.BS_category_budget_package_items AS packageItem WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.id = packageItem.category_budget_package_id
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
