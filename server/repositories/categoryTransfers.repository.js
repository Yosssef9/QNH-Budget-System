import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function getPreClosingFinancialYearRepo(transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction).query(`
    SELECT TOP 1 id, year, status
    FROM dbo.BS_financial_years
    WHERE status = 'PRE_CLOSING'
    ORDER BY year DESC
  `);

  return result.recordset[0] || null;
}

export async function getEligibleCategoryTransferItemsRepo({
  financialYearId,
  categoryId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        s.category_type_review_id AS id,
        s.financial_year_id,
        fy.year AS financial_year,
        s.category_id,
        c.code AS category_code,
        c.name AS category_name,
        s.budget_type_id,
        bt.name AS budget_type_name,
        bt.expense_type,
        s.approved_quantity,
        s.total_selected_sub_item_quantity,
        s.total_price,
        ISNULL(transfer_totals.approved_transfer_in, 0) AS approved_transfer_in,
        ISNULL(transfer_totals.approved_transfer_out, 0) AS approved_transfer_out,
        ISNULL(transfer_totals.pending_transfer_out, 0) AS pending_transfer_out,
        CAST(
          s.total_price
          + ISNULL(transfer_totals.approved_transfer_in, 0)
          - ISNULL(transfer_totals.approved_transfer_out, 0)
          - ISNULL(transfer_totals.pending_transfer_out, 0)
          AS DECIMAL(18, 6)
        ) AS available_amount
      FROM dbo.VW_category_type_review_summary s
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = s.category_type_review_id
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = s.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = s.category_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = s.budget_type_id
      OUTER APPLY (
        SELECT
          SUM(CASE
            WHEN t.status = 'APPROVED'
             AND t.to_category_type_review_id = s.category_type_review_id
            THEN t.amount ELSE 0 END
          ) AS approved_transfer_in,
          SUM(CASE
            WHEN t.status = 'APPROVED'
             AND t.from_category_type_review_id = s.category_type_review_id
            THEN t.amount ELSE 0 END
          ) AS approved_transfer_out,
          SUM(CASE
            WHEN t.status = 'PENDING_APPROVAL'
             AND t.from_category_type_review_id = s.category_type_review_id
            THEN t.amount ELSE 0 END
          ) AS pending_transfer_out
        FROM dbo.BS_category_budget_transfers t
        WHERE t.from_category_type_review_id = s.category_type_review_id
           OR t.to_category_type_review_id = s.category_type_review_id
      ) transfer_totals
      WHERE s.financial_year_id = @financialYearId
        AND s.category_id = @categoryId
        AND crp.status = 'APPROVED'
        AND ctr.category_review_status = 'APPROVED'
        AND ctr.cfo_review_status = 'APPROVED'
      ORDER BY bt.name ASC
    `);

  return result.recordset || [];
}

export async function getCategoryTransferItemByIdRepo(
  reviewId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT TOP 1
        s.category_type_review_id AS id,
        crp.id AS package_id,
        s.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        s.category_id,
        c.code AS category_code,
        c.name AS category_name,
        s.budget_type_id,
        bt.name AS budget_type_name,
        bt.expense_type,
        crp.status AS package_status,
        s.category_review_status,
        s.cfo_review_status,
        s.approved_quantity,
        s.total_selected_sub_item_quantity,
        s.total_price
      FROM dbo.VW_category_type_review_summary s
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = s.category_type_review_id
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = s.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = s.category_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = s.budget_type_id
      WHERE s.category_type_review_id = @reviewId
    `);

  return result.recordset[0] || null;
}

export async function getCategoryTransferItemBalanceRepo(
  reviewId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT
        s.category_type_review_id AS id,
        s.total_price,
        ISNULL(SUM(CASE
          WHEN t.status = 'APPROVED'
           AND t.to_category_type_review_id = s.category_type_review_id
          THEN t.amount ELSE 0 END), 0) AS approved_transfer_in,
        ISNULL(SUM(CASE
          WHEN t.status = 'APPROVED'
           AND t.from_category_type_review_id = s.category_type_review_id
          THEN t.amount ELSE 0 END), 0) AS approved_transfer_out,
        ISNULL(SUM(CASE
          WHEN t.status = 'PENDING_APPROVAL'
           AND t.from_category_type_review_id = s.category_type_review_id
          THEN t.amount ELSE 0 END), 0) AS pending_transfer_out,
        CAST(
          s.total_price
          + ISNULL(SUM(CASE
              WHEN t.status = 'APPROVED'
               AND t.to_category_type_review_id = s.category_type_review_id
              THEN t.amount ELSE 0 END), 0)
          - ISNULL(SUM(CASE
              WHEN t.status = 'APPROVED'
               AND t.from_category_type_review_id = s.category_type_review_id
              THEN t.amount ELSE 0 END), 0)
          - ISNULL(SUM(CASE
              WHEN t.status = 'PENDING_APPROVAL'
               AND t.from_category_type_review_id = s.category_type_review_id
              THEN t.amount ELSE 0 END), 0)
          AS DECIMAL(18, 6)
        ) AS available_amount
      FROM dbo.VW_category_type_review_summary s
      LEFT JOIN dbo.BS_category_budget_transfers t
        ON t.from_category_type_review_id = s.category_type_review_id
        OR t.to_category_type_review_id = s.category_type_review_id
      WHERE s.category_type_review_id = @reviewId
      GROUP BY s.category_type_review_id, s.total_price
    `);

  return result.recordset[0] || null;
}

export async function createCategoryTransferRepo({
  financialYearId,
  categoryId,
  fromCategoryTypeReviewId,
  toCategoryTypeReviewId,
  amount,
  reason,
  requestedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
    .input("fromReviewId", sql.BigInt, fromCategoryTypeReviewId)
    .input("toReviewId", sql.BigInt, toCategoryTypeReviewId)
    .input("amount", sql.Decimal(18, 6), amount)
    .input("reason", sql.NVarChar(2000), reason)
    .input("requestedBy", sql.Int, requestedBy)
    .query(`
      INSERT INTO dbo.BS_category_budget_transfers (
        financial_year_id,
        category_id,
        from_category_type_review_id,
        to_category_type_review_id,
        amount,
        reason,
        status,
        requested_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @financialYearId,
        @categoryId,
        @fromReviewId,
        @toReviewId,
        @amount,
        @reason,
        'PENDING_APPROVAL',
        @requestedBy
      )
    `);

  return result.recordset[0] || null;
}

export async function getCategoryTransfersRepo({
  status,
  financialYearId = null,
  categoryId = null,
  requestedBy = null,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("status", sql.VarChar(30), status === "ALL" ? null : status)
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
    .input("requestedBy", sql.Int, requestedBy)
    .query(`
      SELECT
        t.*,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        c.code AS category_code,
        c.name AS category_name,
        from_bt.name AS from_budget_type_name,
        from_bt.expense_type AS from_expense_type,
        to_bt.name AS to_budget_type_name,
        to_bt.expense_type AS to_expense_type,
        req.USER_NAME AS requested_by_name,
        appr.USER_NAME AS approved_by_name,
        rej.USER_NAME AS rejected_by_name
      FROM dbo.BS_category_budget_transfers t
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = t.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = t.category_id
      INNER JOIN dbo.BS_category_type_reviews from_ctr
        ON from_ctr.id = t.from_category_type_review_id
      INNER JOIN dbo.BS_budget_types from_bt
        ON from_bt.id = from_ctr.budget_type_id
      INNER JOIN dbo.BS_category_type_reviews to_ctr
        ON to_ctr.id = t.to_category_type_review_id
      INNER JOIN dbo.BS_budget_types to_bt
        ON to_bt.id = to_ctr.budget_type_id
      INNER JOIN dbo.USERS req
        ON req.USER_ID = t.requested_by
      LEFT JOIN dbo.USERS appr
        ON appr.USER_ID = t.approved_by
      LEFT JOIN dbo.USERS rej
        ON rej.USER_ID = t.rejected_by
      WHERE (@status IS NULL OR t.status = @status)
        AND (@financialYearId IS NULL OR t.financial_year_id = @financialYearId)
        AND (@categoryId IS NULL OR t.category_id = @categoryId)
        AND (@requestedBy IS NULL OR t.requested_by = @requestedBy)
      ORDER BY t.requested_at DESC
    `);

  return result.recordset || [];
}

export async function getCategoryTransferByIdRepo(
  transferId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("transferId", sql.BigInt, transferId)
    .query(`
      SELECT TOP 1
        t.*,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        c.code AS category_code,
        c.name AS category_name,
        from_bt.name AS from_budget_type_name,
        from_bt.expense_type AS from_expense_type,
        from_s.total_price AS from_total_price,
        to_bt.name AS to_budget_type_name,
        to_bt.expense_type AS to_expense_type,
        to_s.total_price AS to_total_price,
        req.USER_NAME AS requested_by_name,
        appr.USER_NAME AS approved_by_name,
        rej.USER_NAME AS rejected_by_name
      FROM dbo.BS_category_budget_transfers t
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = t.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = t.category_id
      INNER JOIN dbo.VW_category_type_review_summary from_s
        ON from_s.category_type_review_id = t.from_category_type_review_id
      INNER JOIN dbo.BS_budget_types from_bt
        ON from_bt.id = from_s.budget_type_id
      INNER JOIN dbo.VW_category_type_review_summary to_s
        ON to_s.category_type_review_id = t.to_category_type_review_id
      INNER JOIN dbo.BS_budget_types to_bt
        ON to_bt.id = to_s.budget_type_id
      INNER JOIN dbo.USERS req
        ON req.USER_ID = t.requested_by
      LEFT JOIN dbo.USERS appr
        ON appr.USER_ID = t.approved_by
      LEFT JOIN dbo.USERS rej
        ON rej.USER_ID = t.rejected_by
      WHERE t.id = @transferId
    `);

  return result.recordset[0] || null;
}

export async function approveCategoryTransferRepo({
  transferId,
  approvedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("transferId", sql.BigInt, transferId)
    .input("approvedBy", sql.Int, approvedBy)
    .query(`
      UPDATE dbo.BS_category_budget_transfers
      SET
        status = 'APPROVED',
        approved_by = @approvedBy,
        approved_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @transferId
        AND status = 'PENDING_APPROVAL'
    `);

  return result.recordset[0] || null;
}

export async function rejectCategoryTransferRepo({
  transferId,
  rejectedBy,
  note,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("transferId", sql.BigInt, transferId)
    .input("rejectedBy", sql.Int, rejectedBy)
    .input("note", sql.NVarChar(1000), note)
    .query(`
      UPDATE dbo.BS_category_budget_transfers
      SET
        status = 'REJECTED',
        rejected_by = @rejectedBy,
        rejected_at = SYSUTCDATETIME(),
        rejection_note = @note
      OUTPUT INSERTED.*
      WHERE id = @transferId
        AND status = 'PENDING_APPROVAL'
    `);

  return result.recordset[0] || null;
}
