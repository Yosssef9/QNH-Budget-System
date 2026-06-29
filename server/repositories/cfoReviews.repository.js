import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function getCfoReviewPackagesRepo({ status }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("status", sql.VarChar(50), status)
    .query(`
      SELECT
        crp.id,
        crp.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        crp.category_id,
        c.code AS category_code,
        c.name AS category_name,
        crp.status,
        crp.submitted_to_cfo_by,
        submitted_user.USER_NAME AS submitted_to_cfo_by_name,
        crp.submitted_to_cfo_at,
        crp.approved_by,
        approved_user.USER_NAME AS approved_by_name,
        crp.approved_at,
        crp.returned_by,
        returned_user.USER_NAME AS returned_by_name,
        crp.returned_at,
        crp.return_note,
        COUNT(ctr.id) AS review_items_count,
        ISNULL(SUM(s.total_requested_quantity), 0) AS total_requested_quantity,
        ISNULL(SUM(s.total_selected_sub_item_quantity), 0)
          AS total_selected_sub_item_quantity,
        ISNULL(SUM(s.total_price), 0) AS total_price,
        SUM(CASE WHEN ctr.cfo_review_status = 'REVIEWED_ACCEPTED' THEN 1 ELSE 0 END)
          AS cfo_accepted_count,
        SUM(CASE WHEN ctr.cfo_review_status = 'RETURNED' THEN 1 ELSE 0 END)
          AS cfo_returned_count,
        SUM(CASE WHEN ctr.cfo_review_status = 'PENDING_REVIEW' THEN 1 ELSE 0 END)
          AS cfo_pending_count
      FROM dbo.BS_category_review_packages crp
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      LEFT JOIN dbo.BS_category_type_reviews ctr
        ON ctr.category_review_package_id = crp.id
      LEFT JOIN dbo.VW_category_type_review_summary s
        ON s.category_type_review_id = ctr.id
      LEFT JOIN dbo.users submitted_user
        ON submitted_user.USER_ID = crp.submitted_to_cfo_by
      LEFT JOIN dbo.users approved_user
        ON approved_user.USER_ID = crp.approved_by
      LEFT JOIN dbo.users returned_user
        ON returned_user.USER_ID = crp.returned_by
      WHERE crp.status = @status
      GROUP BY
        crp.id,
        crp.financial_year_id,
        fy.year,
        fy.status,
        crp.category_id,
        c.code,
        c.name,
        crp.status,
        crp.submitted_to_cfo_by,
        submitted_user.USER_NAME,
        crp.submitted_to_cfo_at,
        crp.approved_by,
        approved_user.USER_NAME,
        crp.approved_at,
        crp.returned_by,
        returned_user.USER_NAME,
        crp.returned_at,
        crp.return_note
      ORDER BY crp.submitted_to_cfo_at DESC, crp.id DESC
    `);

  return result.recordset || [];
}

export async function getCfoReviewPackageByIdRepo(
  packageId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .query(`
      SELECT TOP 1
        crp.id,
        crp.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        crp.category_id,
        c.code AS category_code,
        c.name AS category_name,
        crp.status,
        crp.submitted_to_cfo_by,
        crp.submitted_to_cfo_at,
        crp.approved_by,
        crp.approved_at,
        crp.returned_by,
        crp.returned_at,
        crp.return_note
      FROM dbo.BS_category_review_packages crp
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      WHERE crp.id = @packageId
    `);

  return result.recordset[0] || null;
}

export async function getCfoReviewPackageItemsRepo(packageId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("packageId", sql.BigInt, packageId)
    .query(`
      SELECT
        s.category_type_review_id AS id,
        ctr.category_review_package_id AS package_id,
        s.financial_year_id,
        s.category_id,
        s.budget_type_id,
        bt.name AS budget_type_name,
        bt.expense_type,
        s.approved_quantity,
        s.category_review_status,
        s.cfo_review_status,
        ctr.category_note,
        ctr.cfo_note,
        ctr.category_reviewed_by,
        ctr.category_reviewed_at,
        ctr.cfo_reviewed_by,
        ctr.cfo_reviewed_at,
        s.total_requested_quantity,
        s.department_count,
        s.total_selected_sub_item_quantity,
        s.total_price,
        s.attachment_count
      FROM dbo.VW_category_type_review_summary s
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = s.category_type_review_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = s.budget_type_id
      WHERE ctr.category_review_package_id = @packageId
      ORDER BY bt.name ASC
    `);

  return result.recordset || [];
}

export async function getCfoReviewItemByIdRepo({
  packageId,
  reviewId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT TOP 1
        ctr.id,
        ctr.category_review_package_id,
        ctr.budget_type_id,
        ctr.approved_quantity,
        ctr.category_review_status,
        ctr.cfo_review_status,
        ctr.cfo_note,
        crp.status AS package_status,
        crp.financial_year_id,
        fy.status AS financial_year_status
      FROM dbo.BS_category_type_reviews ctr
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      WHERE ctr.id = @reviewId
        AND ctr.category_review_package_id = @packageId
    `);

  return result.recordset[0] || null;
}

export async function updateCfoReviewItemStatusRepo({
  reviewId,
  status,
  note,
  reviewedBy,
  transaction = null,
}) {
  const pool = await poolPromise;
  const categoryStatus =
    status === "RETURNED" ? "RETURNED_BY_CFO" : "SUBMITTED_TO_CFO";

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .input("status", sql.VarChar(50), status)
    .input("categoryStatus", sql.VarChar(50), categoryStatus)
    .input("note", sql.NVarChar(1000), note)
    .input("reviewedBy", sql.Int, reviewedBy)
    .query(`
      UPDATE dbo.BS_category_type_reviews
      SET
        cfo_review_status = @status,
        cfo_note = @note,
        cfo_reviewed_by = @reviewedBy,
        cfo_reviewed_at = SYSUTCDATETIME(),
        category_review_status = @categoryStatus,
        updated_by = @reviewedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @reviewId
    `);

  return result.recordset[0] || null;
}

export async function getCfoReviewItemStatusCountsRepo(
  packageId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .query(`
      SELECT
        COUNT(*) AS total_count,
        SUM(CASE WHEN cfo_review_status = 'REVIEWED_ACCEPTED' THEN 1 ELSE 0 END)
          AS accepted_count,
        SUM(CASE WHEN cfo_review_status = 'RETURNED' THEN 1 ELSE 0 END)
          AS returned_count,
        SUM(CASE WHEN cfo_review_status = 'PENDING_REVIEW' THEN 1 ELSE 0 END)
          AS pending_count
      FROM dbo.BS_category_type_reviews
      WHERE category_review_package_id = @packageId
    `);

  return result.recordset[0] || {
    total_count: 0,
    accepted_count: 0,
    returned_count: 0,
    pending_count: 0,
  };
}

export async function approveCfoReviewPackageRepo({
  packageId,
  approvedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("approvedBy", sql.Int, approvedBy)
    .query(`
      UPDATE dbo.BS_category_type_reviews
      SET
        cfo_review_status = 'APPROVED',
        category_review_status = 'APPROVED',
        cfo_reviewed_by = COALESCE(cfo_reviewed_by, @approvedBy),
        cfo_reviewed_at = COALESCE(cfo_reviewed_at, SYSUTCDATETIME()),
        updated_by = @approvedBy,
        updated_at = SYSUTCDATETIME()
      WHERE category_review_package_id = @packageId
    `);

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("approvedBy", sql.Int, approvedBy)
    .query(`
      UPDATE dbo.BS_category_review_packages
      SET
        status = 'APPROVED',
        approved_by = @approvedBy,
        approved_at = SYSUTCDATETIME(),
        returned_by = NULL,
        returned_at = NULL,
        return_note = NULL,
        updated_by = @approvedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @packageId
        AND status = 'SUBMITTED_TO_CFO'
    `);

  return result.recordset[0] || null;
}

export async function returnCfoReviewPackageRepo({
  packageId,
  note,
  returnedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("note", sql.NVarChar(1000), note)
    .input("returnedBy", sql.Int, returnedBy)
    .query(`
      UPDATE dbo.BS_category_review_packages
      SET
        status = 'RETURNED_BY_CFO',
        returned_by = @returnedBy,
        returned_at = SYSUTCDATETIME(),
        return_note = @note,
        updated_by = @returnedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @packageId
        AND status = 'SUBMITTED_TO_CFO'
    `);

  return result.recordset[0] || null;
}
