import { poolPromise, sql } from "../config/db.js";

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function getPOAllocationSummaryRepo(purchaseInvoiceLineId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId).query(`
      SELECT
        ISNULL(p.QTY, 0) AS original_qty,
        ISNULL(approved.approved_qty, 0) AS approved_qty,
        ISNULL(pending.pending_qty, 0) AS pending_qty
      FROM BS_Purchase_Invoices_For_Budget p
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS approved_qty
        FROM BS_PO_LINKS
        WHERE PURCHASE_INVOICE_LINE_ID = p.ID
          AND STATUS = 'APPROVED'
      ) approved
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS pending_qty
        FROM BS_PO_LINKS
        WHERE PURCHASE_INVOICE_LINE_ID = p.ID
          AND STATUS = 'PENDING'
      ) pending
      WHERE p.ID = @purchaseInvoiceLineId
    `);

  const row = result.recordset[0];
  if (!row) return null;

  const originalQty = toNumber(row.original_qty);
  const approvedQty = toNumber(row.approved_qty);
  const pendingQty = toNumber(row.pending_qty);

  return {
    original_qty: originalQty,
    approved_qty: approvedQty,
    pending_qty: pendingQty,
    available_qty: originalQty - approvedQty - pendingQty,
  };
}

export async function getBudgetItemAllocationSummaryRepo(budgetItemId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetItemId", sql.BigInt, budgetItemId).query(`
      SELECT
        bi.quantity AS approved_budget_qty,
        ISNULL(approved.approved_linked_qty, 0) AS approved_linked_qty,
        ISNULL(pending.pending_linked_qty, 0) AS pending_linked_qty
      FROM BS_budget_items bi
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS approved_linked_qty
        FROM BS_PO_LINKS
        WHERE BUDGET_ITEM_ID = bi.id
          AND STATUS = 'APPROVED'
      ) approved
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS pending_linked_qty
        FROM BS_PO_LINKS
        WHERE BUDGET_ITEM_ID = bi.id
          AND STATUS = 'PENDING'
      ) pending
      WHERE bi.id = @budgetItemId
    `);

  const row = result.recordset[0];
  if (!row) return null;

  const approvedBudgetQty = toNumber(row.approved_budget_qty);
  const approvedLinkedQty = toNumber(row.approved_linked_qty);
  const pendingLinkedQty = toNumber(row.pending_linked_qty);

  return {
    approved_budget_qty: approvedBudgetQty,
    approved_linked_qty: approvedLinkedQty,
    pending_linked_qty: pendingLinkedQty,
    remaining_qty: approvedBudgetQty - approvedLinkedQty - pendingLinkedQty,
  };
}

export async function getAvailablePurchaseInvoiceLinesRepo(filters = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  const where = [];

  if (filters.search) {
    request.input("search", sql.NVarChar(200), `%${filters.search}%`);
    where.push(`(
      p.INVOICE_NO LIKE @search
      OR p.ORDER_ID LIKE @search
      OR p.ITEM_CODE LIKE @search
      OR p.ITEM_DESC LIKE @search
      OR p.SUPPLIER_NAME_EN LIKE @search
      OR p.PARENT_ITEM_NAME LIKE @search
    )`);
  }

  if (filters.invoiceNumber) {
    request.input(
      "invoiceNumber",
      sql.NVarChar(100),
      `%${filters.invoiceNumber}%`,
    );
    where.push("p.INVOICE_NO LIKE @invoiceNumber");
  }

  if (filters.orderId) {
    request.input("orderId", sql.NVarChar(100), `%${filters.orderId}%`);
    where.push("p.ORDER_ID LIKE @orderId");
  }

  if (filters.itemCode) {
    request.input("itemCode", sql.NVarChar(100), `%${filters.itemCode}%`);
    where.push("p.ITEM_CODE LIKE @itemCode");
  }

  if (filters.itemDescription) {
    request.input(
      "itemDescription",
      sql.NVarChar(300),
      `%${filters.itemDescription}%`,
    );
    where.push("p.ITEM_DESC LIKE @itemDescription");
  }

  if (filters.supplier) {
    request.input("supplier", sql.NVarChar(300), `%${filters.supplier}%`);
    where.push("p.SUPPLIER_NAME_EN LIKE @supplier");
  }

  if (filters.year) {
    request.input("year", sql.Int, filters.year);
    where.push("p.INV_YEAR_CODE = @year");
  }

  if (filters.store) {
    request.input("store", sql.NVarChar(100), `%${filters.store}%`);
    where.push("(p.STORE_CODE LIKE @store OR p.STORE_NAME_EN LIKE @store)");
  }

  const result = await request.query(`
    SELECT
      p.ID AS id,
      p.INVOICE_NO AS invoice_no,
      p.DELIVERY_NOTE_DATE AS delivery_note_date,
      p.VENDOR_INVOICE_NO AS vendor_invoice_no,
      p.SOURCE_NO AS source_no,
      p.SOURCE_NAME_EN AS source_name,
      p.SUPPLIER_NAME_EN AS supplier_name,
      p.STATUS_NAME_EN AS po_status_name,
      p.INVOICE_DUE_DATE AS invoice_due_date,
      p.INV_VOUCHER_NO AS invoice_voucher_no,
      p.ORDER_ID AS order_id,
      p.STORE_CODE AS store_code,
      p.STORE_NAME_EN AS store_name,
      p.RECEIVED_BY_NAME_EN AS received_by_name,
      p.ITEM_CODE AS item_code,
      p.ITEM_DESC AS item_description,
      p.PARENT_ITEM_NAME AS parent_item_name,
      p.UNIT_NAME_EN AS unit_name,
      p.LOT_NO AS lot_no,
      p.QTY AS po_qty,
      p.BONUS_QTY AS bonus_qty,
      p.UNIT_COST AS unit_cost,
      p.NET_AMOUNT AS net_amount,
      p.INV_YEAR_CODE AS invoice_year_code,
      p.CREATED_AT AS created_at,
      ISNULL(approved.approved_qty, 0) AS approved_qty,
      ISNULL(pending.pending_qty, 0) AS pending_qty,
      ISNULL(p.QTY, 0)
        - ISNULL(approved.approved_qty, 0)
        - ISNULL(pending.pending_qty, 0) AS available_qty
    FROM BS_Purchase_Invoices_For_Budget p
    OUTER APPLY (
      SELECT SUM(REQUESTED_QTY) AS approved_qty
      FROM BS_PO_LINKS
      WHERE PURCHASE_INVOICE_LINE_ID = p.ID
        AND STATUS = 'APPROVED'
    ) approved
    OUTER APPLY (
      SELECT SUM(REQUESTED_QTY) AS pending_qty
      FROM BS_PO_LINKS
      WHERE PURCHASE_INVOICE_LINE_ID = p.ID
        AND STATUS = 'PENDING'
    ) pending
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.CREATED_AT DESC
  `);

  return result.recordset;
}

export async function getSuggestedPurchaseInvoiceLinesRepo({
  budgetItemId,
  departmentId,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetItemId", sql.BigInt, budgetItemId)
    .input("departmentId", sql.Int, departmentId).query(`
      WITH selected_item AS (
        SELECT TOP 1
          bi.id,
          bi.type_id
        FROM BS_budget_items bi
        INNER JOIN BS_budgets b
          ON b.id = bi.budget_id
        WHERE bi.id = @budgetItemId
          AND b.department_id = @departmentId
      ),
      active_mappings AS (
        SELECT
          m.id AS mapping_id,
          m.budget_type_id,
          m.po_item_code,
          m.po_item_description AS mapped_po_item_description,
          m.mapping_source,
          m.learned_count,
          m.last_learned_at
        FROM BS_PO_ITEM_MAPPINGS m
        INNER JOIN selected_item si
          ON si.type_id = m.budget_type_id
        WHERE m.is_active = 1
      )
      SELECT
        p.ID AS id,
        p.INVOICE_NO AS invoice_no,
        p.DELIVERY_NOTE_DATE AS delivery_note_date,
        p.VENDOR_INVOICE_NO AS vendor_invoice_no,
        p.SOURCE_NO AS source_no,
        p.SOURCE_NAME_EN AS source_name,
        p.SUPPLIER_NAME_EN AS supplier_name,
        p.STATUS_NAME_EN AS po_status_name,
        p.INVOICE_DUE_DATE AS invoice_due_date,
        p.INV_VOUCHER_NO AS invoice_voucher_no,
        p.ORDER_ID AS order_id,
        p.STORE_CODE AS store_code,
        p.STORE_NAME_EN AS store_name,
        p.RECEIVED_BY_NAME_EN AS received_by_name,
        p.ITEM_CODE AS item_code,
        p.ITEM_DESC AS item_description,
        p.PARENT_ITEM_NAME AS parent_item_name,
        p.UNIT_NAME_EN AS unit_name,
        p.LOT_NO AS lot_no,
        p.QTY AS po_qty,
        p.BONUS_QTY AS bonus_qty,
        p.UNIT_COST AS unit_cost,
        p.NET_AMOUNT AS net_amount,
        p.INV_YEAR_CODE AS invoice_year_code,
        p.CREATED_AT AS created_at,
        ISNULL(approved.approved_qty, 0) AS approved_qty,
        ISNULL(pending.pending_qty, 0) AS pending_qty,
        ISNULL(p.QTY, 0)
          - ISNULL(approved.approved_qty, 0)
          - ISNULL(pending.pending_qty, 0) AS available_qty,
        am.mapping_id,
        am.mapping_source,
        am.learned_count,
        am.last_learned_at,
        am.mapped_po_item_description
      FROM active_mappings am
      INNER JOIN BS_Purchase_Invoices_For_Budget p
        ON LTRIM(RTRIM(p.ITEM_CODE)) = am.po_item_code
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS approved_qty
        FROM BS_PO_LINKS
        WHERE PURCHASE_INVOICE_LINE_ID = p.ID
          AND STATUS = 'APPROVED'
      ) approved
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS pending_qty
        FROM BS_PO_LINKS
        WHERE PURCHASE_INVOICE_LINE_ID = p.ID
          AND STATUS = 'PENDING'
      ) pending
      ORDER BY
        CASE WHEN am.mapping_source = 'MANUAL' THEN 1 ELSE 0 END DESC,
        am.learned_count DESC,
        am.last_learned_at DESC,
        available_qty DESC,
        p.CREATED_AT DESC,
        p.ID DESC
    `);

  return result.recordset;
}

export async function getPurchaseInvoiceLineByIdRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.BigInt, id).query(`
    SELECT TOP 1
      ID AS id,
      INVOICE_NO AS invoice_no,
      ORDER_ID AS order_id,
      ITEM_CODE AS item_code,
      ITEM_DESC AS item_description,
      PARENT_ITEM_NAME AS parent_item_name,
      QTY AS po_qty,
      UNIT_COST AS unit_cost,
      NET_AMOUNT AS net_amount,
      SUPPLIER_NAME_EN AS supplier_name,
      INV_YEAR_CODE AS invoice_year_code,
      CREATED_AT AS created_at
    FROM BS_Purchase_Invoices_For_Budget
    WHERE ID = @id
  `);

  return result.recordset[0] || null;
}

export async function getPOLinkDetailsRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.BigInt, id).query(`
    SELECT TOP 1
      pl.ID AS id,
      pl.PURCHASE_INVOICE_LINE_ID AS purchase_invoice_line_id,
      pl.BUDGET_ID AS budget_id,
      pl.BUDGET_ITEM_ID AS budget_item_id,
      pl.PARENT_ITEM_NAME AS parent_item_name,
      pl.REQUESTED_QTY AS requested_qty,
      pl.UNIT_COST AS unit_cost,
      pl.LINKED_AMOUNT AS linked_amount,
      pl.STATUS AS status,
      pl.REQUESTED_BY AS requested_by,
      pl.REQUESTED_AT AS requested_at,
      pl.APPROVED_BY AS approved_by,
      pl.APPROVED_AT AS approved_at,
      pl.REJECTED_BY AS rejected_by,
      pl.REJECTED_AT AS rejected_at,
      pl.REJECTION_REASON AS rejection_reason,
      pl.CREATED_AT AS created_at,
      pl.UPDATED_AT AS updated_at,
      bi.quantity AS budget_item_quantity,
      bi.unit_price AS budget_item_unit_price,
      bi.total_amount AS budget_item_total_amount,
      bt.name AS budget_type_name,
      bt.expense_type AS expense_type,
      b.department_id AS department_id,
      b.financial_year_id AS financial_year_id,
      b.status AS budget_status,
      d.name AS department_name,
      fy.year AS financial_year,
      requestedUser.USER_NAME AS requested_by_name,
      approvedUser.USER_NAME AS approved_by_name,
      rejectedUser.USER_NAME AS rejected_by_name,
      po.INVOICE_NO AS invoice_no,
      po.INVOICE_DUE_DATE AS invoice_due_date,
      po.ORDER_ID AS order_id,
      po.ITEM_CODE AS item_code,
      po.ITEM_DESC AS item_description,
      po.QTY AS po_qty,
      po.UNIT_COST AS po_unit_cost,
      po.NET_AMOUNT AS po_net_amount,
      po.SUPPLIER_NAME_EN AS supplier_name
    FROM BS_PO_LINKS pl
    INNER JOIN BS_budget_items bi
      ON bi.id = pl.BUDGET_ITEM_ID
    INNER JOIN BS_budget_types bt
      ON bt.id = bi.type_id
    INNER JOIN BS_budgets b
      ON b.id = pl.BUDGET_ID
    LEFT JOIN BS_departments d
      ON d.id = b.department_id
    LEFT JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id
    LEFT JOIN USERS requestedUser
      ON requestedUser.USER_ID = pl.REQUESTED_BY
    LEFT JOIN USERS approvedUser
      ON approvedUser.USER_ID = pl.APPROVED_BY
    LEFT JOIN USERS rejectedUser
      ON rejectedUser.USER_ID = pl.REJECTED_BY
    INNER JOIN BS_Purchase_Invoices_For_Budget po
      ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
    WHERE pl.ID = @id
  `);

  return result.recordset[0] || null;
}

export async function getMyPOLinksRepo(userId) {
  const pool = await poolPromise;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT
      pl.ID AS id,
      pl.PURCHASE_INVOICE_LINE_ID AS purchase_invoice_line_id,
      pl.BUDGET_ID AS budget_id,
      pl.BUDGET_ITEM_ID AS budget_item_id,
      pl.PARENT_ITEM_NAME AS parent_item_name,
      pl.REQUESTED_QTY AS requested_qty,
      pl.UNIT_COST AS unit_cost,
      pl.LINKED_AMOUNT AS linked_amount,
      pl.STATUS AS status,
      pl.REQUESTED_BY AS requested_by,
      pl.REQUESTED_AT AS requested_at,
      pl.APPROVED_BY AS approved_by,
      pl.APPROVED_AT AS approved_at,
      pl.REJECTED_BY AS rejected_by,
      pl.REJECTED_AT AS rejected_at,
      pl.REJECTION_REASON AS rejection_reason,
      pl.CREATED_AT AS created_at,
      pl.UPDATED_AT AS updated_at,
      bt.name AS budget_type_name,
      po.ORDER_ID AS order_id,
      po.ITEM_CODE AS item_code,
      po.ITEM_DESC AS item_description,
      po.SUPPLIER_NAME_EN AS supplier_name
    FROM BS_PO_LINKS pl
    INNER JOIN BS_budget_items bi
      ON bi.id = pl.BUDGET_ITEM_ID
    INNER JOIN BS_budget_types bt
      ON bt.id = bi.type_id
    INNER JOIN BS_Purchase_Invoices_For_Budget po
      ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
    WHERE pl.REQUESTED_BY = @userId
    ORDER BY pl.CREATED_AT DESC
  `);

  return result.recordset;
}

export async function getPOLinksForApprovalRepo({
  status = "PENDING",
  financialYearId = null,
  departmentId = null,
} = {}) {
  const pool = await poolPromise;
  const request = pool.request();

  request.input("status", sql.VarChar(30), status === "ALL" ? null : status);
  request.input("financialYearId", sql.Int, financialYearId || null);
  request.input("departmentId", sql.Int, departmentId || null);

  const result = await request.query(`
    SELECT
      pl.ID AS id,
      pl.PURCHASE_INVOICE_LINE_ID AS purchase_invoice_line_id,
      pl.BUDGET_ID AS budget_id,
      pl.BUDGET_ITEM_ID AS budget_item_id,
      pl.PARENT_ITEM_NAME AS parent_item_name,
      pl.REQUESTED_QTY AS requested_qty,
      pl.UNIT_COST AS unit_cost,
      pl.LINKED_AMOUNT AS linked_amount,
      pl.STATUS AS status,
      pl.REQUESTED_BY AS requested_by,
      pl.REQUESTED_AT AS requested_at,
      pl.APPROVED_BY AS approved_by,
      pl.APPROVED_AT AS approved_at,
      pl.REJECTED_BY AS rejected_by,
      pl.REJECTED_AT AS rejected_at,
      pl.REJECTION_REASON AS rejection_reason,
      pl.CREATED_AT AS created_at,
      pl.UPDATED_AT AS updated_at,
      bt.name AS budget_type_name,
      b.department_id AS department_id,
      d.name AS department_name,
      fy.id AS financial_year_id,
      fy.year AS financial_year,
      requestedUser.USER_NAME AS requested_by_name,
      po.ORDER_ID AS order_id,
      po.ITEM_CODE AS item_code,
      po.ITEM_DESC AS item_description,
      po.SUPPLIER_NAME_EN AS supplier_name
    FROM BS_PO_LINKS pl
    INNER JOIN BS_budgets b
      ON b.id = pl.BUDGET_ID
    INNER JOIN BS_budget_items bi
      ON bi.id = pl.BUDGET_ITEM_ID
    INNER JOIN BS_budget_types bt
      ON bt.id = bi.type_id
    LEFT JOIN BS_departments d
      ON d.id = b.department_id
    LEFT JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id
    LEFT JOIN USERS requestedUser
      ON requestedUser.USER_ID = pl.REQUESTED_BY
    INNER JOIN BS_Purchase_Invoices_For_Budget po
      ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
    WHERE
      (@status IS NULL OR pl.STATUS = @status)
      AND (@financialYearId IS NULL OR b.financial_year_id = @financialYearId)
      AND (@departmentId IS NULL OR b.department_id = @departmentId)
    ORDER BY pl.CREATED_AT ASC
  `);

  return result.recordset;
}

export async function getPODashboardRepo(userId, departmentId, isApprover) {
  if (isApprover) {
    return getPOLinksForApprovalRepo({
      status: "PENDING",
      financialYearId: null,
      departmentId,
    });
  }

  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("departmentId", sql.Int, departmentId || null).query(`
      SELECT TOP 20
        pl.ID AS id,
        pl.PURCHASE_INVOICE_LINE_ID AS purchase_invoice_line_id,
        pl.BUDGET_ID AS budget_id,
        pl.BUDGET_ITEM_ID AS budget_item_id,
        pl.REQUESTED_QTY AS requested_qty,
        pl.UNIT_COST AS unit_cost,
        pl.LINKED_AMOUNT AS linked_amount,
        pl.STATUS AS status,
        pl.REQUESTED_BY AS requested_by,
        pl.REQUESTED_AT AS requested_at,
        bt.name AS budget_type_name,
        b.department_id AS department_id,
        d.name AS department_name,
        fy.year AS financial_year,
        requestedUser.USER_NAME AS requested_by_name,
        po.ORDER_ID AS order_id,
        po.ITEM_CODE AS item_code,
        po.ITEM_DESC AS item_description,
        po.SUPPLIER_NAME_EN AS supplier_name
      FROM BS_PO_LINKS pl
      INNER JOIN BS_budget_items bi
        ON bi.id = pl.BUDGET_ITEM_ID
      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id
      INNER JOIN BS_budgets b
        ON b.id = pl.BUDGET_ID
      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      LEFT JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN USERS requestedUser
        ON requestedUser.USER_ID = pl.REQUESTED_BY
      INNER JOIN BS_Purchase_Invoices_For_Budget po
        ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
      WHERE
        fy.status IN ('OPEN', 'PRE_CLOSING')
        AND (
          pl.REQUESTED_BY = @userId
          OR (
            @departmentId IS NOT NULL
            AND b.department_id = @departmentId
          )
        )
      ORDER BY pl.REQUESTED_AT DESC, pl.ID DESC
    `);

  return result.recordset;
}

export async function getPOBudgetItemsRepo({ departmentId }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId).query(`
      SELECT
        bi.id,
        bi.budget_id,
        bi.type_id,
        bt.name AS budget_type_name,
        bt.expense_type,
        bi.quantity AS approved_qty,
        bi.unit_price,
        bi.total_amount,
        b.department_id,
        d.name AS department_name,
        b.financial_year_id,
        fy.year AS financial_year,
        ISNULL(approved.approved_linked_qty, 0) AS approved_linked_qty,
        ISNULL(pending.pending_linked_qty, 0) AS pending_linked_qty,
        bi.quantity
          - ISNULL(approved.approved_linked_qty, 0)
          - ISNULL(pending.pending_linked_qty, 0) AS remaining_qty
      FROM BS_budget_items bi
      INNER JOIN BS_budgets b
        ON b.id = bi.budget_id
      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id
      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      LEFT JOIN BS_departments d
        ON d.id = b.department_id
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS approved_linked_qty
        FROM BS_PO_LINKS
        WHERE BUDGET_ITEM_ID = bi.id
          AND STATUS = 'APPROVED'
      ) approved
      OUTER APPLY (
        SELECT SUM(REQUESTED_QTY) AS pending_linked_qty
        FROM BS_PO_LINKS
        WHERE BUDGET_ITEM_ID = bi.id
          AND STATUS = 'PENDING'
      ) pending
      WHERE
        bi.is_active = 1
        AND b.status = 'APPROVED'
        AND fy.status = 'PRE_CLOSING'
        AND b.department_id = @departmentId
      ORDER BY bt.name
    `);

  return result.recordset;
}

export async function createPOLinkRepo(data) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("purchaseInvoiceLineId", sql.BigInt, data.purchase_invoice_line_id)
    .input("budgetId", sql.BigInt, data.budget_id)
    .input("budgetItemId", sql.BigInt, data.budget_item_id)
    .input("parentItemName", sql.NVarChar(300), data.parent_item_name)
    .input("requestedQty", sql.Decimal(18, 3), data.requested_qty)
    .input("unitCost", sql.Decimal(18, 6), data.unit_cost)
    .input("linkedAmount", sql.Decimal(18, 6), data.linked_amount)
    .input("requestedBy", sql.Int, data.requested_by).query(`
      INSERT INTO BS_PO_LINKS
      (
        PURCHASE_INVOICE_LINE_ID,
        BUDGET_ID,
        BUDGET_ITEM_ID,
        PARENT_ITEM_NAME,
        REQUESTED_QTY,
        UNIT_COST,
        LINKED_AMOUNT,
        STATUS,
        REQUESTED_BY,
        REQUESTED_AT
      )
      OUTPUT INSERTED.ID AS id
      VALUES
      (
        @purchaseInvoiceLineId,
        @budgetId,
        @budgetItemId,
        @parentItemName,
        @requestedQty,
        @unitCost,
        @linkedAmount,
        'PENDING',
        @requestedBy,
        GETDATE()
      )
    `);

  return getPOLinkDetailsRepo(result.recordset[0].id);
}

export async function approvePOLinkRepo(poLinkId, userId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, poLinkId)
    .input("userId", sql.Int, userId).query(`
      UPDATE BS_PO_LINKS
      SET
        STATUS = 'APPROVED',
        APPROVED_BY = @userId,
        APPROVED_AT = GETDATE(),
        UPDATED_AT = GETDATE()
      OUTPUT INSERTED.ID AS id
      WHERE ID = @id
        AND STATUS = 'PENDING'
    `);

  const updated = result.recordset[0];
  return updated ? getPOLinkDetailsRepo(updated.id) : null;
}

export async function rejectPOLinkRepo(poLinkId, userId, reason) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, poLinkId)
    .input("userId", sql.Int, userId)
    .input("reason", sql.NVarChar(sql.MAX), reason).query(`
      UPDATE BS_PO_LINKS
      SET
        STATUS = 'REJECTED',
        REJECTED_BY = @userId,
        REJECTED_AT = GETDATE(),
        REJECTION_REASON = @reason,
        UPDATED_AT = GETDATE()
      OUTPUT INSERTED.ID AS id
      WHERE ID = @id
        AND STATUS = 'PENDING'
    `);

  const updated = result.recordset[0];
  return updated ? getPOLinkDetailsRepo(updated.id) : null;
}

export async function getPOAllocationHistoryRepo(purchaseInvoiceLineId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId).query(`
      SELECT
        pl.ID AS id,
        pl.PURCHASE_INVOICE_LINE_ID AS purchase_invoice_line_id,
        pl.BUDGET_ID AS budget_id,
        pl.BUDGET_ITEM_ID AS budget_item_id,
        pl.REQUESTED_BY AS requested_by,
        pl.REQUESTED_QTY AS requested_qty,
        pl.STATUS AS status,
        pl.REQUESTED_AT AS requested_at,
        pl.APPROVED_AT AS approved_at,
        pl.REJECTED_AT AS rejected_at,
        bt.name AS budget_type_name,
        b.department_id AS department_id,
        d.name AS department_name,
        po.ORDER_ID AS order_id,
        po.ITEM_CODE AS item_code,
        po.ITEM_DESC AS item_description,
        requestedUser.USER_NAME AS requested_by_name
      FROM BS_PO_LINKS pl
      INNER JOIN BS_budget_items bi
        ON bi.id = pl.BUDGET_ITEM_ID
      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id
      INNER JOIN BS_budgets b
        ON b.id = pl.BUDGET_ID
      LEFT JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN USERS requestedUser
        ON requestedUser.USER_ID = pl.REQUESTED_BY
      INNER JOIN BS_Purchase_Invoices_For_Budget po
        ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
      WHERE pl.PURCHASE_INVOICE_LINE_ID = @purchaseInvoiceLineId
      ORDER BY pl.CREATED_AT DESC, pl.ID DESC
    `);

  return result.recordset;
}

export async function findPendingPOLinkRepo(
  purchaseInvoiceLineId,
  budgetItemId,
) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId)
    .input("budgetItemId", sql.BigInt, budgetItemId).query(`
      SELECT TOP 1
        ID AS id,
        PURCHASE_INVOICE_LINE_ID AS purchase_invoice_line_id,
        BUDGET_ITEM_ID AS budget_item_id,
        STATUS AS status
      FROM BS_PO_LINKS
      WHERE PURCHASE_INVOICE_LINE_ID = @purchaseInvoiceLineId
        AND BUDGET_ITEM_ID = @budgetItemId
        AND STATUS = 'PENDING'
    `);

  return result.recordset[0] || null;
}
