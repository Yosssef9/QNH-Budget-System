import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function getApprovedCategoryPackageRepo({
  financialYearId,
  categoryId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT TOP 1 *
      FROM dbo.BS_category_review_packages
      WHERE financial_year_id = @financialYearId
        AND category_id = @categoryId
        AND status = 'APPROVED'
    `);

  return result.recordset[0] || null;
}

export async function getApprovedCategoryTypeReviewRepo({
  packageId,
  budgetTypeId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("packageId", sql.BigInt, packageId)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .query(`
      SELECT TOP 1
        ctr.id,
        ctr.approved_quantity,
        s.total_requested_quantity,
        s.total_selected_sub_item_quantity,
        s.total_price
      FROM dbo.BS_category_type_reviews ctr
      INNER JOIN dbo.VW_category_type_review_summary s
        ON s.category_type_review_id = ctr.id
      WHERE ctr.category_review_package_id = @packageId
        AND ctr.budget_type_id = @budgetTypeId
        AND ctr.category_review_status = 'APPROVED'
        AND ctr.cfo_review_status = 'APPROVED'
    `);

  return result.recordset[0] || null;
}

export async function getDepartmentRequestItemForChangeRepo({
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
        dri.requested_quantity,
        dcb.category_id,
        db.financial_year_id,
        db.department_id
      FROM dbo.BS_department_budget_request_items dri
      INNER JOIN dbo.BS_department_category_budgets dcb
        ON dcb.id = dri.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets db
        ON db.id = dcb.department_budget_id
      WHERE dri.id = @requestItemId
        AND dri.is_active = 1
        AND db.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function createBudgetChangeRequestRepo({
  financialYearId,
  departmentId,
  categoryId,
  packageId,
  requestType,
  reason,
  requestedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("financialYearId", sql.Int, financialYearId)
    .input("departmentId", sql.Int, departmentId)
    .input("categoryId", sql.Int, categoryId)
    .input("packageId", sql.BigInt, packageId)
    .input("requestType", sql.VarChar(40), requestType)
    .input("reason", sql.NVarChar(2000), reason)
    .input("requestedBy", sql.Int, requestedBy)
    .query(`
      INSERT INTO dbo.BS_budget_change_requests (
        financial_year_id,
        department_id,
        category_id,
        category_review_package_id,
        request_type,
        reason,
        requested_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @financialYearId,
        @departmentId,
        @categoryId,
        @packageId,
        @requestType,
        @reason,
        @requestedBy
      )
    `);

  return result.recordset[0] || null;
}

export async function createBudgetChangeRequestItemRepo({
  changeRequestId,
  budgetTypeId,
  existingDepartmentRequestItemId,
  targetDepartmentCategoryBudgetId,
  categoryTypeReviewId,
  currentRequestedQuantity,
  currentApprovedQuantity,
  requestedQuantity,
  quantityDelta,
  description,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("changeRequestId", sql.BigInt, changeRequestId)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .input(
      "existingDepartmentRequestItemId",
      sql.BigInt,
      existingDepartmentRequestItemId,
    )
    .input(
      "targetDepartmentCategoryBudgetId",
      sql.BigInt,
      targetDepartmentCategoryBudgetId,
    )
    .input("categoryTypeReviewId", sql.BigInt, categoryTypeReviewId)
    .input("currentRequestedQuantity", sql.Decimal(18, 4), currentRequestedQuantity)
    .input("currentApprovedQuantity", sql.Decimal(18, 4), currentApprovedQuantity)
    .input("requestedQuantity", sql.Decimal(18, 4), requestedQuantity)
    .input("quantityDelta", sql.Decimal(18, 4), quantityDelta)
    .input("description", sql.NVarChar(1000), description)
    .query(`
      INSERT INTO dbo.BS_budget_change_request_items (
        change_request_id,
        budget_type_id,
        existing_department_request_item_id,
        target_department_category_budget_id,
        category_type_review_id,
        current_requested_quantity,
        current_approved_quantity,
        requested_quantity,
        quantity_delta,
        description
      )
      OUTPUT INSERTED.*
      VALUES (
        @changeRequestId,
        @budgetTypeId,
        @existingDepartmentRequestItemId,
        @targetDepartmentCategoryBudgetId,
        @categoryTypeReviewId,
        @currentRequestedQuantity,
        @currentApprovedQuantity,
        @requestedQuantity,
        @quantityDelta,
        @description
      )
    `);

  return result.recordset[0] || null;
}

export async function getBudgetChangeRequestByIdRepo(
  requestId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("requestId", sql.BigInt, requestId)
    .query(`
      SELECT TOP 1
        cr.*,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        d.name AS department_name,
        c.code AS category_code,
        c.name AS category_name,
        u.USER_NAME AS requested_by_name
      FROM dbo.BS_budget_change_requests cr
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = cr.financial_year_id
      INNER JOIN dbo.BS_departments d
        ON d.id = cr.department_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = cr.category_id
      LEFT JOIN dbo.users u
        ON u.USER_ID = cr.requested_by
      WHERE cr.id = @requestId
    `);

  return result.recordset[0] || null;
}

export async function getBudgetChangeRequestItemsRepo(
  requestId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("requestId", sql.BigInt, requestId)
    .query(`
      SELECT
        cri.*,
        bt.name AS budget_type_name,
        bt.expense_type
      FROM dbo.BS_budget_change_request_items cri
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = cri.budget_type_id
      WHERE cri.change_request_id = @requestId
      ORDER BY cri.id ASC
    `);

  return result.recordset || [];
}

export async function listBudgetChangeRequestsRepo({
  status,
  departmentId = null,
  categoryId = null,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("status", sql.VarChar(50), status)
    .input("departmentId", sql.Int, departmentId)
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        cr.id,
        cr.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        cr.department_id,
        d.name AS department_name,
        cr.category_id,
        c.code AS category_code,
        c.name AS category_name,
        cr.request_type,
        cr.status,
        cr.reason,
        cr.category_decision,
        cr.category_decision_note,
        cr.category_decided_by,
        cr.category_decided_at,
        cr.cfo_decision,
        cr.cfo_decision_note,
        cr.cfo_decided_by,
        cr.cfo_decided_at,
        cr.applied_by,
        cr.applied_at,
        cr.requested_by,
        u.USER_NAME AS requested_by_name,
        cr.requested_at,
        COUNT(cri.id) AS item_count
      FROM dbo.BS_budget_change_requests cr
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = cr.financial_year_id
      INNER JOIN dbo.BS_departments d
        ON d.id = cr.department_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = cr.category_id
      LEFT JOIN dbo.users u
        ON u.USER_ID = cr.requested_by
      LEFT JOIN dbo.BS_budget_change_request_items cri
        ON cri.change_request_id = cr.id
      WHERE (@status = 'ALL' OR cr.status = @status)
        AND (@departmentId IS NULL OR cr.department_id = @departmentId)
        AND (@categoryId IS NULL OR cr.category_id = @categoryId)
      GROUP BY
        cr.id,
        cr.financial_year_id,
        fy.year,
        fy.status,
        cr.department_id,
        d.name,
        cr.category_id,
        c.code,
        c.name,
        cr.request_type,
        cr.status,
        cr.reason,
        cr.category_decision,
        cr.category_decision_note,
        cr.category_decided_by,
        cr.category_decided_at,
        cr.cfo_decision,
        cr.cfo_decision_note,
        cr.cfo_decided_by,
        cr.cfo_decided_at,
        cr.applied_by,
        cr.applied_at,
        cr.requested_by,
        u.USER_NAME,
        cr.requested_at
      ORDER BY cr.requested_at DESC, cr.id DESC
    `);

  return result.recordset || [];
}

export async function updateCategoryChangeRequestDecisionRepo({
  requestId,
  decision,
  note,
  decidedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const status = decision === "REJECTED" ? "REJECTED" : "CATEGORY_REVIEWED";

  const result = await createRequest(pool, transaction)
    .input("requestId", sql.BigInt, requestId)
    .input("decision", sql.VarChar(40), decision)
    .input("note", sql.NVarChar(1000), note)
    .input("status", sql.VarChar(50), status)
    .input("decidedBy", sql.Int, decidedBy)
    .query(`
      UPDATE dbo.BS_budget_change_requests
      SET
        category_decision = @decision,
        category_decision_note = @note,
        category_decided_by = @decidedBy,
        category_decided_at = SYSUTCDATETIME(),
        status = @status,
        updated_by = @decidedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestId
        AND status = 'SUBMITTED'
    `);

  return result.recordset[0] || null;
}

export async function updateCfoChangeRequestDecisionRepo({
  requestId,
  decision,
  note,
  decidedBy,
  transaction = null,
}) {
  const pool = await poolPromise;
  const status = decision === "REJECTED" ? "REJECTED" : "ACCEPTED";

  const result = await createRequest(pool, transaction)
    .input("requestId", sql.BigInt, requestId)
    .input("decision", sql.VarChar(40), decision)
    .input("note", sql.NVarChar(1000), note)
    .input("status", sql.VarChar(50), status)
    .input("decidedBy", sql.Int, decidedBy)
    .query(`
      UPDATE dbo.BS_budget_change_requests
      SET
        cfo_decision = @decision,
        cfo_decision_note = @note,
        cfo_decided_by = @decidedBy,
        cfo_decided_at = SYSUTCDATETIME(),
        status = @status,
        updated_by = @decidedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestId
        AND status = 'CATEGORY_REVIEWED'
        AND category_decision = 'ACCEPTED'
    `);

  return result.recordset[0] || null;
}

export async function markBudgetChangeRequestAppliedRepo({
  requestId,
  appliedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("requestId", sql.BigInt, requestId)
    .input("appliedBy", sql.Int, appliedBy)
    .query(`
      UPDATE dbo.BS_budget_change_requests
      SET
        status = 'APPLIED',
        applied_by = @appliedBy,
        applied_at = SYSUTCDATETIME(),
        updated_by = @appliedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @requestId
        AND status = 'ACCEPTED'
    `);

  return result.recordset[0] || null;
}

export async function markBudgetChangeRequestItemAppliedRepo({
  itemId,
  appliedDepartmentRequestItemId,
  transaction = null,
}) {
  const pool = await poolPromise;

  await createRequest(pool, transaction)
    .input("itemId", sql.BigInt, itemId)
    .input(
      "appliedDepartmentRequestItemId",
      sql.BigInt,
      appliedDepartmentRequestItemId,
    )
    .query(`
      UPDATE dbo.BS_budget_change_request_items
      SET
        is_applied = 1,
        applied_department_request_item_id = @appliedDepartmentRequestItemId,
        applied_at = SYSUTCDATETIME()
      WHERE id = @itemId
    `);
}
