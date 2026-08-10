import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import {
  CATEGORY_PACKAGE_ITEM_CFO_STATUS,
  CATEGORY_PACKAGE_STATUS,
} from "../category-packages/categoryPackages.constants.js";

function requestFor(transaction = null) {
  return transaction
    ? new sql.Request(transaction)
    : poolPromise.then((pool) => pool.request());
}

function encodeRowVersion(row) {
  if (row?.row_version) {
    row.row_version = Buffer.from(row.row_version).toString("base64");
  }
  if (row?.price_review_row_version) {
    row.price_review_row_version = Buffer.from(
      row.price_review_row_version,
    ).toString("base64");
  }
  return row;
}

export async function listPurchasingFinancialYearsRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT
      fy.id,
      fy.year,
      fy.status,
      COUNT(pkg.id) AS package_count,
      SUM(CASE WHEN pkg.status = '${CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW}' THEN 1 ELSE 0 END)
        AS pending_package_count
    FROM dbo.BS_financial_years AS fy
    INNER JOIN dbo.BS_category_budget_packages AS pkg
      ON pkg.financial_year_id = fy.id
     AND pkg.submitted_to_purchasing_at IS NOT NULL
    GROUP BY fy.id, fy.year, fy.status
    ORDER BY fy.year DESC;
  `);
  return result.recordset;
}

export async function listPurchasingPackagesRepo({ financialYearId, status }) {
  const pool = await poolPromise;
  const request = pool
    .request()
    .input("financialYearId", sql.Int, financialYearId ?? null)
    .input("status", sql.VarChar(40), status ?? null);
  const result = await request.query(`
    SELECT
      pkg.id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.category_code,
      category.name AS category_name,
      pkg.status,
      pkg.purchasing_review_round,
      pkg.submitted_to_purchasing_at,
      submittedUser.USER_NAME AS submitted_to_purchasing_by_name,
      SUM(CASE WHEN review.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_price_count,
      SUM(CASE WHEN review.status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted_price_count,
      COUNT(review.id) AS total_price_count,
      pkg.row_version
    FROM dbo.BS_category_budget_packages AS pkg
    INNER JOIN dbo.BS_financial_years AS fy ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category ON category.id = pkg.budget_category_id
    LEFT JOIN dbo.users AS submittedUser ON submittedUser.USER_ID = pkg.submitted_to_purchasing_by
    LEFT JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
      ON review.category_budget_package_id = pkg.id
     AND review.review_round = pkg.purchasing_review_round
    WHERE pkg.submitted_to_purchasing_at IS NOT NULL
      AND (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
      AND
      (
        @status IS NULL
        OR EXISTS
        (
          SELECT 1
          FROM dbo.BS_category_budget_package_sub_item_price_reviews AS filteredReview
          WHERE filteredReview.category_budget_package_id = pkg.id
            AND filteredReview.review_round = pkg.purchasing_review_round
            AND filteredReview.status = @status
        )
      )
    GROUP BY
      pkg.id, pkg.financial_year_id, fy.year, fy.status,
      pkg.budget_category_id, category.category_code, category.name,
      pkg.status, pkg.purchasing_review_round, pkg.submitted_to_purchasing_at,
      submittedUser.USER_NAME, pkg.row_version
    ORDER BY
      CASE WHEN pkg.status = '${CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW}' THEN 0 ELSE 1 END,
      pkg.submitted_to_purchasing_at DESC,
      category.name;
  `);
  return result.recordset.map(encodeRowVersion);
}

export async function findPurchasingPackageRepo(
  { packageId },
  transaction = null,
) {
  const request = await requestFor(transaction);
  const lock = transaction ? "WITH (UPDLOCK, HOLDLOCK)" : "";
  const result = await request.input("packageId", sql.BigInt, packageId).query(`
    SELECT TOP 1
      pkg.id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.category_code,
      category.name AS category_name,
      pkg.status,
      pkg.purchasing_review_round,
      pkg.submitted_to_purchasing_at,
      submittedUser.USER_NAME AS submitted_to_purchasing_by_name,
      SUM(CASE WHEN review.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_price_count,
      SUM(CASE WHEN review.status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted_price_count,
      COUNT(review.id) AS total_price_count,
      pkg.row_version
    FROM dbo.BS_category_budget_packages AS pkg ${lock}
    INNER JOIN dbo.BS_financial_years AS fy ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category ON category.id = pkg.budget_category_id
    LEFT JOIN dbo.users AS submittedUser ON submittedUser.USER_ID = pkg.submitted_to_purchasing_by
    LEFT JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
      ON review.category_budget_package_id = pkg.id
     AND review.review_round = pkg.purchasing_review_round
    WHERE pkg.id = @packageId
      AND pkg.submitted_to_purchasing_at IS NOT NULL
    GROUP BY
      pkg.id, pkg.financial_year_id, fy.year, fy.status,
      pkg.budget_category_id, category.category_code, category.name,
      pkg.status, pkg.purchasing_review_round, pkg.submitted_to_purchasing_at,
      submittedUser.USER_NAME, pkg.row_version;
  `);
  return encodeRowVersion(result.recordset[0] || null);
}

export async function listPurchasingPackageDetailRowsRepo(
  { packageId, reviewRound },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("packageId", sql.BigInt, packageId)
    .input("reviewRound", sql.Int, reviewRound).query(`
      SELECT
        packageItem.id AS package_item_id,
        packageItem.catalog_item_id,
        COALESCE(packageItem.catalog_item_name_snapshot, catalog.name) AS catalog_item_name,
        COALESCE(packageItem.catalog_item_code_snapshot, catalog.item_code) AS catalog_item_code,
        packageItem.cfo_review_status,
        packageItem.cfo_review_note,
        subItem.id AS package_sub_item_id,
        subItem.catalog_sub_item_id,
        catalogSubItem.sub_item_code,
        subItem.name AS package_sub_item_name,
        subItem.specification,
        subItem.unit_of_measure_id,
        unit.name AS unit_of_measure_name,
        unit.unit_code AS unit_of_measure_code,
        subItem.quantity,
        subItem.category_manager_unit_price,
        subItem.unit_price AS effective_unit_price,
        review.id AS price_review_id,
        review.previous_purchasing_unit_price,
        review.purchasing_unit_price,
        review.status AS price_review_status,
        review.decision_source,
        review.reviewed_by,
        reviewedUser.USER_NAME AS reviewed_by_name,
        review.reviewed_at,
        review.row_version AS price_review_row_version,
        (
          SELECT COUNT(1)
          FROM dbo.BS_category_budget_package_sub_item_attachments AS attachment
          WHERE attachment.category_budget_package_sub_item_id = subItem.id
            AND attachment.attachment_source = 'CATEGORY_MANAGER'
            AND attachment.is_active = 1
        ) AS category_manager_attachment_count,
        (
          SELECT COUNT(1)
          FROM dbo.BS_category_budget_package_sub_item_attachments AS attachment
          WHERE attachment.category_budget_package_sub_item_id = subItem.id
            AND attachment.attachment_source = 'PURCHASING'
            AND attachment.is_active = 1
        ) AS purchasing_attachment_count
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.id = packageItem.catalog_item_id
      LEFT JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1
      LEFT JOIN dbo.BS_budget_catalog_sub_items AS catalogSubItem
        ON catalogSubItem.id = subItem.catalog_sub_item_id
      LEFT JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = subItem.unit_of_measure_id
      LEFT JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
        ON review.category_budget_package_sub_item_id = subItem.id
       AND review.review_round = @reviewRound
      LEFT JOIN dbo.users AS reviewedUser ON reviewedUser.USER_ID = review.reviewed_by
      WHERE packageItem.category_budget_package_id = @packageId
        AND packageItem.is_active = 1
      ORDER BY catalog.name, subItem.name;
    `);
  return result.recordset.map(encodeRowVersion);
}

export async function findCurrentPriceReviewRepo(
  { packageId, packageSubItemId },
  transaction,
) {
  const request = await requestFor(transaction);
  const result = await request
    .input("packageId", sql.BigInt, packageId)
    .input("packageSubItemId", sql.BigInt, packageSubItemId).query(`
      SELECT TOP 1
        review.id,
        review.category_budget_package_id,
        review.category_budget_package_sub_item_id,
        review.review_round,
        review.category_manager_unit_price_snapshot,
        review.previous_purchasing_unit_price,
        review.purchasing_unit_price,
        review.status,
        review.decision_source,
        review.row_version,
        packageItem.id AS package_item_id,
        packageItem.cfo_review_status,
        pkg.financial_year_id,
        pkg.status AS package_status,
        pkg.purchasing_review_round
      FROM dbo.BS_category_budget_package_sub_item_price_reviews AS review WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = review.category_budget_package_sub_item_id
       AND subItem.is_active = 1
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.id = subItem.category_budget_package_item_id
       AND packageItem.is_active = 1
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.id = review.category_budget_package_id
      WHERE review.category_budget_package_id = @packageId
        AND review.category_budget_package_sub_item_id = @packageSubItemId
        AND review.review_round = pkg.purchasing_review_round;
    `);
  return encodeRowVersion(result.recordset[0] || null);
}

export async function updatePurchasingPriceRepo(transaction, payload) {
  const request = await requestFor(transaction);
  const result = await request
    .input("reviewId", sql.BigInt, payload.review_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("purchasingUnitPrice", sql.Decimal(18, 6), payload.purchasing_unit_price)
    .query(`
      UPDATE dbo.BS_category_budget_package_sub_item_price_reviews
      SET purchasing_unit_price = @purchasingUnitPrice,
          status = 'PENDING',
          decision_source = 'MANUAL',
          reviewed_by = NULL,
          reviewed_user_role_id = NULL,
          reviewed_at = NULL,
          updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @reviewId
        AND row_version = @rowVersion
        AND
        (
          status = 'PENDING'
          OR (status = 'ACCEPTED' AND decision_source = 'CARRIED_FORWARD')
        );
    `);
  return encodeRowVersion(result.recordset[0] || null);
}

export async function reopenPurchasingPriceRepo(transaction, payload) {
  const request = await requestFor(transaction);
  const result = await request
    .input("reviewId", sql.BigInt, payload.review_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .query(`
      UPDATE dbo.BS_category_budget_package_sub_item_price_reviews
      SET status = 'PENDING',
          reviewed_by = NULL,
          reviewed_user_role_id = NULL,
          reviewed_at = NULL,
          updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @reviewId
        AND row_version = @rowVersion
        AND status = 'ACCEPTED';
    `);
  return encodeRowVersion(result.recordset[0] || null);
}

export async function touchPurchasingPackageRepo(transaction, payload) {
  const request = await requestFor(transaction);
  await request
    .input("packageId", sql.BigInt, payload.package_id)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .query(`
      UPDATE dbo.BS_category_budget_packages
      SET updated_by = @actorUserId,
          updated_at = SYSUTCDATETIME()
      WHERE id = @packageId
        AND status = '${CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW}';
    `);
}

export async function acceptPurchasingPriceRepo(transaction, payload) {
  const request = await requestFor(transaction);
  const result = await request
    .input("reviewId", sql.BigInt, payload.review_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("actorUserRoleId", sql.Int, payload.actor_user_role_id ?? null)
    .query(`
      UPDATE dbo.BS_category_budget_package_sub_item_price_reviews
      SET status = 'ACCEPTED',
          decision_source = 'MANUAL',
          reviewed_by = @actorUserId,
          reviewed_user_role_id = @actorUserRoleId,
          reviewed_at = SYSUTCDATETIME(),
          updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @reviewId
        AND row_version = @rowVersion
        AND status = 'PENDING'
        AND purchasing_unit_price >= 1;
    `);
  return encodeRowVersion(result.recordset[0] || null);
}

export async function acceptAllPurchasingPricesRepo(transaction, payload) {
  const request = await requestFor(transaction);
  const result = await request
    .input("packageId", sql.BigInt, payload.package_id)
    .input("reviewRound", sql.Int, payload.review_round)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("actorUserRoleId", sql.Int, payload.actor_user_role_id ?? null)
    .query(`
      UPDATE dbo.BS_category_budget_package_sub_item_price_reviews
      SET status = 'ACCEPTED',
          decision_source = 'MANUAL',
          reviewed_by = @actorUserId,
          reviewed_user_role_id = @actorUserRoleId,
          reviewed_at = SYSUTCDATETIME(),
          updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      WHERE category_budget_package_id = @packageId
        AND review_round = @reviewRound
        AND status = 'PENDING'
        AND purchasing_unit_price >= 1;
    `);
  return result.recordset;
}

export async function getPurchasingSubmissionReadinessRepo(
  { packageId, reviewRound },
  transaction,
) {
  const request = await requestFor(transaction);
  const result = await request
    .input("packageId", sql.BigInt, packageId)
    .input("reviewRound", sql.Int, reviewRound).query(`
      SELECT
        COUNT(1) AS total_price_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_price_count,
        SUM(CASE WHEN purchasing_unit_price < 1 THEN 1 ELSE 0 END) AS invalid_price_count
      FROM dbo.BS_category_budget_package_sub_item_price_reviews WITH (UPDLOCK, HOLDLOCK)
      WHERE category_budget_package_id = @packageId
        AND review_round = @reviewRound;
    `);
  return result.recordset[0];
}

export async function submitPurchasingPackageToCfoRepo(transaction, payload) {
  const request = await requestFor(transaction);
  const result = await request
    .input("packageId", sql.BigInt, payload.package_id)
    .input("reviewRound", sql.Int, payload.review_round)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE subItem
      SET unit_price = review.purchasing_unit_price,
          updated_by = @actorUserId,
          updated_at = SYSUTCDATETIME()
      FROM dbo.BS_category_budget_package_sub_items AS subItem
      INNER JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
        ON review.category_budget_package_sub_item_id = subItem.id
       AND review.category_budget_package_id = @packageId
       AND review.review_round = @reviewRound
       AND review.status = 'ACCEPTED'
      WHERE subItem.is_active = 1;

      UPDATE dbo.BS_category_budget_packages
      SET status = '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}',
          submitted_to_cfo_by = @actorUserId,
          submitted_to_cfo_at = SYSUTCDATETIME(),
          updated_by = @actorUserId,
          updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @packageId
        AND row_version = @rowVersion
        AND status = '${CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW}';

      UPDATE packageItem
      SET cfo_review_status =
            CASE
              WHEN packageItem.cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.CFO_ACCEPTED}'
              THEN '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.CFO_ACCEPTED}'
              ELSE '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.PENDING_CFO_REVIEW}'
            END,
          updated_by = @actorUserId,
          updated_at = SYSUTCDATETIME()
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN @Updated AS updated
        ON updated.id = packageItem.category_budget_package_id
      WHERE packageItem.is_active = 1;

      SELECT id FROM @Updated;
    `);
  return result.recordset[0] || null;
}
