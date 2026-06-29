import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function findCategoryByCodeOrNameRepo(value, transaction = null) {
  const pool = await poolPromise;
  const normalizedValue = String(value || "").trim();

  const result = await createRequest(pool, transaction)
    .input("value", sql.NVarChar(200), normalizedValue)
    .query(`
      SELECT TOP 1 id, code, name
      FROM dbo.BS_budget_categories
      WHERE is_active = 1
        AND (
          UPPER(code) = UPPER(@value)
          OR UPPER(name) = UPPER(@value)
        )
    `);

  return result.recordset[0] || null;
}

export async function ensureCategoryReviewPackageRepo({
  financialYearId,
  categoryId,
  createdBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      IF NOT EXISTS (
        SELECT 1
        FROM dbo.BS_category_review_packages
        WHERE financial_year_id = @financialYearId
          AND category_id = @categoryId
      )
      BEGIN
        INSERT INTO dbo.BS_category_review_packages (
          financial_year_id,
          category_id,
          status,
          created_by
        )
        VALUES (
          @financialYearId,
          @categoryId,
          'IN_REVIEW',
          @createdBy
        );
      END;

      SELECT TOP 1 *
      FROM dbo.BS_category_review_packages
      WHERE financial_year_id = @financialYearId
        AND category_id = @categoryId;
    `);

  return result.recordset[0] || null;
}

export async function ensureCategoryTypeReviewRepo({
  packageId,
  budgetTypeId,
  createdBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      IF NOT EXISTS (
        SELECT 1
        FROM dbo.BS_category_type_reviews
        WHERE category_review_package_id = @packageId
          AND budget_type_id = @budgetTypeId
      )
      BEGIN
        INSERT INTO dbo.BS_category_type_reviews (
          category_review_package_id,
          budget_type_id,
          category_review_status,
          cfo_review_status,
          created_by
        )
        VALUES (
          @packageId,
          @budgetTypeId,
          'NOT_REVIEWED',
          'NOT_SUBMITTED',
          @createdBy
        );
      END;

      SELECT TOP 1 *
      FROM dbo.BS_category_type_reviews
      WHERE category_review_package_id = @packageId
        AND budget_type_id = @budgetTypeId;
    `);

  return result.recordset[0] || null;
}

export async function getCategoryReviewPackageRepo({
  financialYearId,
  categoryId,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
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
        crp.return_note,
        crp.created_by,
        crp.created_at,
        crp.updated_by,
        crp.updated_at
      FROM dbo.BS_category_review_packages crp
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      WHERE crp.financial_year_id = @financialYearId
        AND crp.category_id = @categoryId
    `);

  return result.recordset[0] || null;
}

export async function getCategoryReviewListRepo({ financialYearId, categoryId }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        s.category_type_review_id AS id,
        crp.id AS package_id,
        s.financial_year_id,
        fy.year AS financial_year,
        s.category_id,
        c.code AS category_code,
        c.name AS category_name,
        s.budget_type_id,
        bt.name AS budget_type_name,
        bt.expense_type,
        s.approved_quantity,
        s.category_review_status,
        s.cfo_review_status,
        s.total_requested_quantity,
        s.department_count,
        s.total_selected_sub_item_quantity,
        s.total_price,
        s.attachment_count
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
      WHERE s.financial_year_id = @financialYearId
        AND s.category_id = @categoryId
      ORDER BY bt.name ASC
    `);

  return result.recordset || [];
}

export async function getCategoryReviewByIdRepo(reviewId, transaction = null) {
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

export async function getDepartmentContributionsRepo(reviewId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT
        category_type_review_id,
        department_id,
        department_name,
        requested_quantity
      FROM dbo.VW_category_type_department_contributions
      WHERE category_type_review_id = @reviewId
      ORDER BY department_name ASC
    `);

  return result.recordset || [];
}

export async function getDepartmentRequestItemsForReviewRepo(reviewId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT
        ctr.id AS category_type_review_id,
        crp.id AS package_id,
        crp.financial_year_id,
        crp.category_id,
        dri.id AS request_item_id,
        dri.department_category_budget_id,
        db.department_id,
        d.name AS department_name,
        dri.budget_type_id,
        bt.name AS budget_type_name,
        dri.requested_quantity,
        dri.distribution_method,
        dri.distribution_level,
        dri.review_status,
        dri.is_reviewed,
        dri.is_edit_locked,
        dri.review_note,
        dcb.status AS department_category_budget_status,
        dcb.return_note AS department_category_budget_return_note
      FROM dbo.BS_category_type_reviews ctr
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_department_budgets db
        ON db.financial_year_id = crp.financial_year_id
       AND db.is_active = 1
      INNER JOIN dbo.BS_department_category_budgets dcb
        ON dcb.department_budget_id = db.id
       AND dcb.category_id = crp.category_id
      INNER JOIN dbo.BS_department_budget_request_items dri
        ON dri.department_category_budget_id = dcb.id
       AND dri.budget_type_id = ctr.budget_type_id
       AND dri.is_active = 1
      INNER JOIN dbo.BS_departments d
        ON d.id = db.department_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = dri.budget_type_id
      WHERE ctr.id = @reviewId
      ORDER BY d.name ASC, dri.id ASC
    `);

  return result.recordset || [];
}

export async function getSelectedSubItemsRepo(reviewId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT
        rsi.id,
        rsi.category_type_review_id,
        rsi.budget_sub_item_id,
        rsi.sub_item_name_snapshot,
        rsi.specification_snapshot,
        rsi.quantity,
        rsi.unit_cost,
        CAST(rsi.quantity * rsi.unit_cost AS DECIMAL(18, 6)) AS total_price,
        rsi.note,
        rsi.created_by,
        rsi.created_at,
        rsi.updated_by,
        rsi.updated_at
      FROM dbo.BS_category_type_review_sub_items rsi
      WHERE rsi.category_type_review_id = @reviewId
        AND rsi.is_active = 1
      ORDER BY rsi.id ASC
    `);

  return result.recordset || [];
}

export async function updateCategoryReviewApprovedQuantityRepo({
  reviewId,
  approvedQuantity,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .input("approvedQuantity", sql.Decimal(18, 4), approvedQuantity)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_category_type_reviews
      SET
        approved_quantity = @approvedQuantity,
        category_review_status = CASE
          WHEN category_review_status = 'NOT_REVIEWED' THEN 'IN_REVIEW'
          ELSE category_review_status
        END,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @reviewId
    `);

  return result.recordset[0] || null;
}

export async function updateCategoryReviewStatusRepo({
  reviewId,
  status,
  note,
  reviewedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .input("status", sql.VarChar(40), status)
    .input("note", sql.NVarChar(2000), note)
    .input("reviewedBy", sql.Int, reviewedBy)
    .query(`
      UPDATE dbo.BS_category_type_reviews
      SET
        category_review_status = @status,
        category_note = @note,
        category_reviewed_by = @reviewedBy,
        category_reviewed_at = SYSUTCDATETIME(),
        updated_by = @reviewedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @reviewId
    `);

  return result.recordset[0] || null;
}

export async function getDepartmentRequestItemForCategoryReviewRepo({
  requestItemId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("requestItemId", sql.BigInt, requestItemId)
    .query(`
      SELECT TOP 1
        dri.id,
        dri.department_category_budget_id,
        dri.budget_type_id,
        dri.review_status,
        dri.is_reviewed,
        dri.is_edit_locked,
        dri.review_note,
        dcb.category_id,
        dcb.status AS department_category_budget_status,
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

export async function updateDepartmentRequestItemReviewRepo({
  requestItemId,
  reviewStatus,
  note,
  reviewedBy,
  transaction = null,
}) {
  const pool = await poolPromise;
  const isAccepted = reviewStatus === "REVIEWED_ACCEPTED";

  const result = await createRequest(pool, transaction)
    .input("requestItemId", sql.BigInt, requestItemId)
    .input("reviewStatus", sql.VarChar(50), reviewStatus)
    .input("note", sql.NVarChar(1000), note)
    .input("isReviewed", sql.Bit, isAccepted ? 1 : 0)
    .input("isEditLocked", sql.Bit, isAccepted ? 1 : 0)
    .input("reviewedBy", sql.Int, reviewedBy)
    .query(`
      UPDATE dbo.BS_department_budget_request_items
      SET
        review_status = @reviewStatus,
        is_reviewed = @isReviewed,
        is_edit_locked = @isEditLocked,
        review_note = @note,
        updated_by = @reviewedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestItemId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getDepartmentCategoryBudgetForCategoryReviewRepo({
  categoryBudgetId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .query(`
      SELECT TOP 1
        dcb.id,
        dcb.department_budget_id,
        dcb.category_id,
        dcb.status,
        db.financial_year_id,
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
      WHERE dcb.id = @categoryBudgetId
        AND db.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getDepartmentCategoryBudgetReviewCountsRepo({
  categoryBudgetId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .query(`
      SELECT
        COUNT(*) AS total_count,
        SUM(CASE WHEN review_status = 'REVIEWED_ACCEPTED' THEN 1 ELSE 0 END)
          AS accepted_count,
        SUM(CASE WHEN review_status = 'NEEDS_MODIFICATION' THEN 1 ELSE 0 END)
          AS needs_modification_count
      FROM dbo.BS_department_budget_request_items
      WHERE department_category_budget_id = @categoryBudgetId
        AND is_active = 1
    `);

  return result.recordset[0] || {
    total_count: 0,
    accepted_count: 0,
    needs_modification_count: 0,
  };
}

export async function returnDepartmentCategoryBudgetRepo({
  categoryBudgetId,
  returnNote,
  returnedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("categoryBudgetId", sql.BigInt, categoryBudgetId)
    .input("returnNote", sql.NVarChar(1000), returnNote)
    .input("returnedBy", sql.Int, returnedBy)
    .query(`
      UPDATE dbo.BS_department_category_budgets
      SET
        status = 'RETURNED',
        returned_by = @returnedBy,
        returned_at = SYSUTCDATETIME(),
        return_note = @returnNote
      OUTPUT INSERTED.*
      WHERE id = @categoryBudgetId
        AND status IN ('SUBMITTED', 'RETURNED')
    `);

  return result.recordset[0] || null;
}

export async function createReviewSubItemRepo({
  reviewId,
  budgetSubItemId,
  nameSnapshot,
  specificationSnapshot,
  quantity,
  unitCost,
  note,
  createdBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .input("budgetSubItemId", sql.Int, budgetSubItemId)
    .input("nameSnapshot", sql.NVarChar(255), nameSnapshot)
    .input("specificationSnapshot", sql.NVarChar(2000), specificationSnapshot)
    .input("quantity", sql.Decimal(18, 4), quantity)
    .input("unitCost", sql.Decimal(18, 4), unitCost)
    .input("note", sql.NVarChar(1000), note)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      INSERT INTO dbo.BS_category_type_review_sub_items (
        category_type_review_id,
        budget_sub_item_id,
        sub_item_name_snapshot,
        specification_snapshot,
        quantity,
        unit_cost,
        note,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @reviewId,
        @budgetSubItemId,
        @nameSnapshot,
        @specificationSnapshot,
        @quantity,
        @unitCost,
        @note,
        @createdBy
      )
    `);

  return result.recordset[0] || null;
}

export async function getReviewSubItemByIdRepo(lineId, transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .query(`
      SELECT TOP 1
        rsi.*,
        ctr.category_review_package_id,
        ctr.budget_type_id,
        crp.financial_year_id,
        crp.category_id
      FROM dbo.BS_category_type_review_sub_items rsi
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = rsi.category_type_review_id
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      WHERE rsi.id = @lineId
        AND rsi.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function updateReviewSubItemRepo({
  lineId,
  quantity,
  unitCost,
  note,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .input("quantity", sql.Decimal(18, 4), quantity)
    .input("unitCost", sql.Decimal(18, 4), unitCost)
    .input("note", sql.NVarChar(1000), note)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_category_type_review_sub_items
      SET
        quantity = COALESCE(@quantity, quantity),
        unit_cost = COALESCE(@unitCost, unit_cost),
        note = CASE WHEN @note IS NULL THEN note ELSE @note END,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @lineId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function deactivateReviewSubItemRepo({
  lineId,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_category_type_review_sub_items
      SET
        is_active = 0,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @lineId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getReviewSubItemQuantityTotalRepo(
  reviewId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT CAST(ISNULL(SUM(quantity), 0) AS DECIMAL(18, 4)) AS total_quantity
      FROM dbo.BS_category_type_review_sub_items
      WHERE category_type_review_id = @reviewId
        AND is_active = 1
    `);

  return Number(result.recordset[0]?.total_quantity || 0);
}

export async function getCategoryReviewPackageByIdRepo(
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
        crp.submitted_to_cfo_at
      FROM dbo.BS_category_review_packages crp
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      WHERE crp.id = @packageId
    `);

  return result.recordset[0] || null;
}

export async function getPackageTypeReviewValidationRowsRepo(
  packageId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .query(`
      SELECT
        ctr.id,
        bt.name AS budget_type_name,
        ctr.approved_quantity,
        ctr.category_review_status,
        ctr.cfo_review_status,
        s.total_selected_sub_item_quantity
      FROM dbo.BS_category_type_reviews ctr
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = ctr.budget_type_id
      INNER JOIN dbo.VW_category_type_review_summary s
        ON s.category_type_review_id = ctr.id
      WHERE ctr.category_review_package_id = @packageId
      ORDER BY bt.name ASC
    `);

  return result.recordset || [];
}

export async function getPackageDepartmentRequestReviewValidationRowsRepo(
  packageId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .query(`
      SELECT
        bt.name AS budget_type_name,
        d.name AS department_name,
        dri.review_status,
        dri.is_reviewed
      FROM dbo.BS_category_review_packages crp
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.category_review_package_id = crp.id
      INNER JOIN dbo.BS_department_budgets db
        ON db.financial_year_id = crp.financial_year_id
       AND db.is_active = 1
      INNER JOIN dbo.BS_departments d
        ON d.id = db.department_id
      INNER JOIN dbo.BS_department_category_budgets dcb
        ON dcb.department_budget_id = db.id
       AND dcb.category_id = crp.category_id
       AND dcb.status = 'SUBMITTED'
      INNER JOIN dbo.BS_department_budget_request_items dri
        ON dri.department_category_budget_id = dcb.id
       AND dri.budget_type_id = ctr.budget_type_id
       AND dri.is_active = 1
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = dri.budget_type_id
      WHERE crp.id = @packageId
        AND dri.review_status <> 'REVIEWED_ACCEPTED'
      ORDER BY bt.name ASC, d.name ASC
    `);

  return result.recordset || [];
}

export async function submitCategoryReviewPackageToCfoRepo({
  packageId,
  submittedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("submittedBy", sql.Int, submittedBy)
    .query(`
      UPDATE dbo.BS_category_type_reviews
      SET
        category_review_status = 'SUBMITTED_TO_CFO',
        cfo_review_status = 'PENDING_REVIEW',
        updated_by = @submittedBy,
        updated_at = SYSUTCDATETIME()
      WHERE category_review_package_id = @packageId
        AND category_review_status = 'REVIEWED_ACCEPTED'
    `);

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("submittedBy", sql.Int, submittedBy)
    .query(`
      UPDATE dbo.BS_category_review_packages
      SET
        status = 'SUBMITTED_TO_CFO',
        submitted_to_cfo_by = @submittedBy,
        submitted_to_cfo_at = SYSUTCDATETIME(),
        updated_by = @submittedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @packageId
        AND status IN ('IN_REVIEW', 'RETURNED_BY_CFO')
    `);

  return result.recordset[0] || null;
}
