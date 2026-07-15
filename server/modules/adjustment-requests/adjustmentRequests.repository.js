import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";

function requestFor(transaction) {
  return new sql.Request(transaction);
}

const requestSelect = `
  SELECT
    cr.id,
    cr.department_category_budget_id,
    cr.status,
    cr.reason,
    cr.submitted_by,
    submittedUser.USER_NAME AS submitted_by_name,
    cr.submitted_at,
    cr.category_reviewed_by,
    reviewedUser.USER_NAME AS category_reviewed_by_name,
    cr.category_reviewed_at,
    cr.category_note,
    cr.created_at,
    cr.updated_at,
    cr.row_version,
    cri.id AS item_id,
    cri.change_type,
    cri.existing_department_budget_item_id,
    cri.catalog_item_id,
    catalog.name AS catalog_item_name,
    catalog.item_code,
    catalog.expense_type,
    cri.current_requested_quantity,
    cri.proposed_requested_quantity,
    cri.description,
    dcb.budget_category_id,
    category.name AS category_name,
    category.category_code,
    db.financial_year_id,
    fy.year AS financial_year,
    fy.status AS financial_year_status,
    db.department_id,
    department.name AS department_name,
    department.department_code
  FROM dbo.BS_budget_change_requests AS cr
  INNER JOIN dbo.BS_budget_change_request_items AS cri
    ON cri.change_request_id = cr.id
  INNER JOIN dbo.BS_department_category_budgets AS dcb
    ON dcb.id = cr.department_category_budget_id
  INNER JOIN dbo.BS_department_budgets AS db
    ON db.id = dcb.department_budget_id
  INNER JOIN dbo.BS_financial_years AS fy
    ON fy.id = db.financial_year_id
  INNER JOIN dbo.BS_departments AS department
    ON department.id = db.department_id
  INNER JOIN dbo.BS_budget_categories AS category
    ON category.id = dcb.budget_category_id
  INNER JOIN dbo.BS_budget_catalog_items AS catalog
    ON catalog.id = cri.catalog_item_id
  LEFT JOIN dbo.users AS submittedUser
    ON submittedUser.USER_ID = cr.submitted_by
  LEFT JOIN dbo.users AS reviewedUser
    ON reviewedUser.USER_ID = cr.category_reviewed_by
`;

export async function findDepartmentCategoryBudgetContextRepo({
  departmentCategoryBudgetId,
}) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .query(`
      SELECT TOP 1
        dcb.id AS department_category_budget_id,
        dcb.department_budget_id,
        dcb.budget_category_id,
        dcb.status AS department_category_budget_status,
        category.name AS category_name,
        category.category_code,
        db.department_id,
        department.name AS department_name,
        db.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status
      FROM dbo.BS_department_category_budgets AS dcb
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id
      INNER JOIN dbo.BS_departments AS department
        ON department.id = db.department_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      WHERE dcb.id = @departmentCategoryBudgetId;
    `);

  return result.recordset[0] || null;
}

export async function listEligibleItemsForCategoryBudgetRepo({
  departmentCategoryBudgetId,
}) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .query(`
      WITH context AS (
        SELECT TOP 1
          dcb.id AS department_category_budget_id,
          dcb.budget_category_id
        FROM dbo.BS_department_category_budgets AS dcb
        WHERE dcb.id = @departmentCategoryBudgetId
      )
      SELECT
        catalog.id AS catalog_item_id,
        catalog.name AS catalog_item_name,
        catalog.item_code,
        catalog.expense_type,
        catalog.unit_of_measure_id,
        unit.name AS unit_name,
        unit.unit_code,
        item.id AS existing_department_budget_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.review_status,
        CASE WHEN item.id IS NULL THEN 0 ELSE 1 END AS is_in_budget
      FROM context
      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.budget_category_id = context.budget_category_id
       AND catalog.is_active = 1
      INNER JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = catalog.unit_of_measure_id
      LEFT JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = context.department_category_budget_id
       AND item.catalog_item_id = catalog.id
       AND item.is_active = 1
      ORDER BY
        CASE WHEN item.id IS NULL THEN 1 ELSE 0 END,
        catalog.name;
    `);

  return result.recordset;
}

export async function createAdjustmentRequestRepo(transaction, payload) {
  const header = await requestFor(transaction)
    .input("departmentCategoryBudgetId", sql.BigInt, payload.departmentCategoryBudgetId)
    .input("reason", sql.NVarChar(2000), payload.reason)
    .input("submittedBy", sql.Int, payload.submittedBy)
    .query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_budget_change_requests
      (
        department_category_budget_id,
        status,
        reason,
        submitted_by,
        submitted_at,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @departmentCategoryBudgetId,
        'PENDING',
        @reason,
        @submittedBy,
        SYSUTCDATETIME(),
        @submittedBy
      );

      SELECT id FROM @Inserted;
    `);

  const changeRequestId = header.recordset[0].id;

  await requestFor(transaction)
    .input("changeRequestId", sql.BigInt, changeRequestId)
    .input("changeType", sql.VarChar(40), payload.requestType)
    .input("existingItemId", sql.BigInt, payload.existingDepartmentBudgetItemId)
    .input("catalogItemId", sql.Int, payload.catalogItemId)
    .input("currentRequestedQuantity", sql.Decimal(18, 4), payload.currentRequestedQuantity)
    .input("proposedRequestedQuantity", sql.Decimal(18, 4), payload.requestedQuantity)
    .input("description", sql.NVarChar(1000), payload.description)
    .query(`
      INSERT INTO dbo.BS_budget_change_request_items
      (
        change_request_id,
        change_type,
        existing_department_budget_item_id,
          catalog_item_id,
          current_requested_quantity,
          proposed_requested_quantity,
          description
      )
      VALUES
      (
        @changeRequestId,
        @changeType,
        @existingItemId,
          @catalogItemId,
          @currentRequestedQuantity,
          @proposedRequestedQuantity,
          @description
      );
    `);

  return { id: changeRequestId };
}

export async function findExistingDepartmentItemRepo({
  departmentCategoryBudgetId,
  itemId,
}) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .input("itemId", sql.BigInt, itemId)
    .query(`
      SELECT TOP 1
        item.id,
        item.department_category_budget_id,
        item.catalog_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.review_status,
        item.is_active
      FROM dbo.BS_department_category_budget_items AS item
      WHERE item.id = @itemId
        AND item.department_category_budget_id = @departmentCategoryBudgetId
        AND item.is_active = 1;
    `);

  return result.recordset[0] || null;
}

export async function findCatalogItemInCategoryRepo({ categoryId, catalogItemId }) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("catalogItemId", sql.Int, catalogItemId)
    .query(`
      SELECT TOP 1 id, name, budget_category_id, is_active
      FROM dbo.BS_budget_catalog_items
      WHERE id = @catalogItemId
        AND budget_category_id = @categoryId
        AND is_active = 1;
    `);

  return result.recordset[0] || null;
}

export async function findActiveDepartmentItemByCatalogRepo({
  departmentCategoryBudgetId,
  catalogItemId,
}) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("departmentCategoryBudgetId", sql.BigInt, departmentCategoryBudgetId)
    .input("catalogItemId", sql.Int, catalogItemId)
    .query(`
      SELECT TOP 1 id
      FROM dbo.BS_department_category_budget_items
      WHERE department_category_budget_id = @departmentCategoryBudgetId
        AND catalog_item_id = @catalogItemId
        AND is_active = 1;
    `);

  return result.recordset[0] || null;
}

export async function findAdjustmentRequestByIdRepo(adjustmentRequestId) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("adjustmentRequestId", sql.BigInt, adjustmentRequestId)
    .query(`
      ${requestSelect}
      WHERE cr.id = @adjustmentRequestId;
    `);

  return result.recordset[0] || null;
}

export async function listMyAdjustmentRequestsRepo({ departmentId, status }) {
  const pool = await poolPromise;
  const request = pool.request().input("departmentId", sql.Int, departmentId);
  let statusFilter = "";

  if (status) {
    request.input("status", sql.VarChar(40), status);
    statusFilter = "AND cr.status = @status";
  }

  const result = await request.query(`
    ${requestSelect}
    WHERE db.department_id = @departmentId
      ${statusFilter}
    ORDER BY cr.submitted_at DESC, cr.id DESC;
  `);

  return result.recordset;
}

export async function listCategoryAdjustmentRequestsRepo({ categoryId, status }) {
  const pool = await poolPromise;
  const request = pool.request().input("categoryId", sql.Int, categoryId);
  let statusFilter = "";

  if (status) {
    request.input("status", sql.VarChar(40), status);
    statusFilter = "AND cr.status = @status";
  }

  const result = await request.query(`
    ${requestSelect}
    WHERE dcb.budget_category_id = @categoryId
      ${statusFilter}
    ORDER BY
      CASE WHEN cr.status = 'PENDING' THEN 0 ELSE 1 END,
      cr.submitted_at DESC,
      cr.id DESC;
  `);

  return result.recordset;
}

export async function updateAdjustmentRequestDecisionRepo(
  transaction,
  { adjustmentRequestId, status, note, actorUserId },
) {
  const result = await requestFor(transaction)
    .input("adjustmentRequestId", sql.BigInt, adjustmentRequestId)
    .input("status", sql.VarChar(40), status)
    .input("note", sql.NVarChar(1000), note)
    .input("actorUserId", sql.Int, actorUserId)
    .query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_budget_change_requests
      SET
        status = @status,
        category_note = @note,
        category_reviewed_by = @actorUserId,
        category_reviewed_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @adjustmentRequestId
        AND status = 'PENDING';

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function createWorkflowHistoryRepo(transaction, payload) {
  await requestFor(transaction)
    .input("financialYearId", sql.Int, payload.financialYearId)
    .input("entityType", sql.VarChar(80), payload.entityType)
    .input("entityId", sql.BigInt, payload.entityId)
    .input("action", sql.VarChar(100), payload.action)
    .input("oldStatus", sql.VarChar(50), payload.oldStatus ?? null)
    .input("newStatus", sql.VarChar(50), payload.newStatus ?? null)
    .input("note", sql.NVarChar(1000), payload.note ?? null)
    .input("userRoleId", sql.Int, payload.userRoleId ?? null)
    .input("actingWorkspace", sql.VarChar(80), payload.actingWorkspace ?? null)
    .input("createdBy", sql.Int, payload.createdBy)
    .query(`
      INSERT INTO dbo.BS_budget_workflow_history
      (
        financial_year_id,
        entity_type,
        entity_id,
        action,
        old_status,
        new_status,
        note,
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
        @userRoleId,
        @actingWorkspace,
        @createdBy
      );
    `);
}
