import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function getAvailableCategoryPurchaseInvoiceLinesRepo(
  filters = {},
) {
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
    request.input("invoiceNumber", sql.NVarChar(100), `%${filters.invoiceNumber}%`);
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
    FROM dbo.BS_Purchase_Invoices_For_Budget p
    OUTER APPLY (
      SELECT SUM(requested_qty) AS approved_qty
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = p.ID
        AND status = 'APPROVED'
    ) approved
    OUTER APPLY (
      SELECT SUM(requested_qty) AS pending_qty
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = p.ID
        AND status = 'PENDING'
    ) pending
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.CREATED_AT DESC
  `);

  return result.recordset || [];
}

export async function getPurchaseInvoiceLineByIdRepo(id, transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("id", sql.BigInt, id)
    .query(`
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
      FROM dbo.BS_Purchase_Invoices_For_Budget
      WHERE ID = @id
    `);

  return result.recordset[0] || null;
}

export async function getPurchaseInvoiceAllocationSummaryRepo(
  purchaseInvoiceLineId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId)
    .query(`
      SELECT
        ISNULL(p.QTY, 0) AS original_qty,
        ISNULL(approved.approved_qty, 0) AS approved_qty,
        ISNULL(pending.pending_qty, 0) AS pending_qty
      FROM dbo.BS_Purchase_Invoices_For_Budget p
      OUTER APPLY (
        SELECT SUM(requested_qty) AS approved_qty
        FROM dbo.BS_category_po_links
        WHERE purchase_invoice_line_id = p.ID
          AND status = 'APPROVED'
      ) approved
      OUTER APPLY (
        SELECT SUM(requested_qty) AS pending_qty
        FROM dbo.BS_category_po_links
        WHERE purchase_invoice_line_id = p.ID
          AND status = 'PENDING'
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

export async function getCategoryReviewSubItemLineByIdRepo(
  lineId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .query(`
      SELECT TOP 1
        rsi.id,
        rsi.category_type_review_id,
        rsi.budget_sub_item_id,
        rsi.sub_item_name_snapshot,
        rsi.specification_snapshot,
        rsi.quantity,
        rsi.unit_cost,
        rsi.is_active,
        ctr.budget_type_id,
        ctr.category_review_status,
        ctr.cfo_review_status,
        crp.id AS package_id,
        crp.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        crp.category_id,
        crp.status AS package_status,
        c.code AS category_code,
        c.name AS category_name,
        bt.name AS budget_type_name
      FROM dbo.BS_category_type_review_sub_items rsi
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = rsi.category_type_review_id
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = ctr.budget_type_id
      WHERE rsi.id = @lineId
    `);

  return result.recordset[0] || null;
}

export async function getCategoryReviewSubItemAllocationSummaryRepo(
  lineId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .query(`
      SELECT
        rsi.quantity AS approved_qty,
        ISNULL(approved.approved_linked_qty, 0) AS approved_linked_qty,
        ISNULL(pending.pending_linked_qty, 0) AS pending_linked_qty
      FROM dbo.BS_category_type_review_sub_items rsi
      OUTER APPLY (
        SELECT SUM(requested_qty) AS approved_linked_qty
        FROM dbo.BS_category_po_links
        WHERE category_type_review_sub_item_id = rsi.id
          AND status = 'APPROVED'
      ) approved
      OUTER APPLY (
        SELECT SUM(requested_qty) AS pending_linked_qty
        FROM dbo.BS_category_po_links
        WHERE category_type_review_sub_item_id = rsi.id
          AND status = 'PENDING'
      ) pending
      WHERE rsi.id = @lineId
        AND rsi.is_active = 1
    `);

  const row = result.recordset[0];
  if (!row) return null;

  const approvedQty = toNumber(row.approved_qty);
  const approvedLinkedQty = toNumber(row.approved_linked_qty);
  const pendingLinkedQty = toNumber(row.pending_linked_qty);

  return {
    approved_qty: approvedQty,
    approved_linked_qty: approvedLinkedQty,
    pending_linked_qty: pendingLinkedQty,
    remaining_qty: approvedQty - approvedLinkedQty - pendingLinkedQty,
  };
}

export async function getEligibleCategoryPoSubItemsRepo({
  financialYearId,
  categoryId,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId)
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        rsi.id,
        rsi.category_type_review_id,
        rsi.budget_sub_item_id,
        rsi.sub_item_name_snapshot,
        rsi.specification_snapshot,
        rsi.quantity AS approved_qty,
        rsi.unit_cost,
        CAST(rsi.quantity * rsi.unit_cost AS DECIMAL(18, 6)) AS total_price,
        ctr.budget_type_id,
        bt.name AS budget_type_name,
        crp.financial_year_id,
        fy.year AS financial_year,
        crp.category_id,
        c.code AS category_code,
        c.name AS category_name,
        ISNULL(approved.approved_linked_qty, 0) AS approved_linked_qty,
        ISNULL(pending.pending_linked_qty, 0) AS pending_linked_qty,
        rsi.quantity
          - ISNULL(approved.approved_linked_qty, 0)
          - ISNULL(pending.pending_linked_qty, 0) AS remaining_qty
      FROM dbo.BS_category_type_review_sub_items rsi
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = rsi.category_type_review_id
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = ctr.budget_type_id
      OUTER APPLY (
        SELECT SUM(requested_qty) AS approved_linked_qty
        FROM dbo.BS_category_po_links
        WHERE category_type_review_sub_item_id = rsi.id
          AND status = 'APPROVED'
      ) approved
      OUTER APPLY (
        SELECT SUM(requested_qty) AS pending_linked_qty
        FROM dbo.BS_category_po_links
        WHERE category_type_review_sub_item_id = rsi.id
          AND status = 'PENDING'
      ) pending
      WHERE rsi.is_active = 1
        AND crp.financial_year_id = @financialYearId
        AND crp.category_id = @categoryId
        AND crp.status = 'APPROVED'
        AND ctr.category_review_status = 'APPROVED'
        AND ctr.cfo_review_status = 'APPROVED'
      ORDER BY bt.name ASC, rsi.sub_item_name_snapshot ASC
    `);

  return result.recordset || [];
}

export async function getSuggestedCategoryPurchaseInvoiceLinesRepo({
  lineId,
}) {
  const pool = await poolPromise;

  const result = await pool.request().input("lineId", sql.BigInt, lineId).query(`
    WITH selected_line AS (
      SELECT TOP 1
        rsi.id,
        rsi.budget_sub_item_id,
        ctr.budget_type_id
      FROM dbo.BS_category_type_review_sub_items rsi
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = rsi.category_type_review_id
      WHERE rsi.id = @lineId
        AND rsi.is_active = 1
    ),
    active_mappings AS (
      SELECT
        sm.id AS mapping_id,
        sm.po_item_code,
        sm.po_item_description AS mapped_po_item_description,
        sm.mapping_source,
        sm.learned_count,
        sm.last_learned_at,
        'SUB_ITEM' AS mapping_level,
        1 AS mapping_priority
      FROM dbo.BS_PO_SUB_ITEM_MAPPINGS sm
      INNER JOIN selected_line sl
        ON sl.budget_sub_item_id = sm.budget_sub_item_id
      WHERE sm.is_active = 1

      UNION ALL

      SELECT
        tm.id AS mapping_id,
        tm.po_item_code,
        tm.po_item_description AS mapped_po_item_description,
        tm.mapping_source,
        tm.learned_count,
        tm.last_learned_at,
        'BUDGET_TYPE' AS mapping_level,
        2 AS mapping_priority
      FROM BS_PO_ITEM_MAPPINGS tm
      INNER JOIN selected_line sl
        ON sl.budget_type_id = tm.budget_type_id
      WHERE tm.is_active = 1
    )
    SELECT
      p.ID AS id,
      p.INVOICE_NO AS invoice_no,
      p.ORDER_ID AS order_id,
      p.ITEM_CODE AS item_code,
      p.ITEM_DESC AS item_description,
      p.PARENT_ITEM_NAME AS parent_item_name,
      p.SUPPLIER_NAME_EN AS supplier_name,
      p.QTY AS po_qty,
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
      am.mapping_level,
      am.mapping_source,
      am.learned_count,
      am.last_learned_at,
      am.mapped_po_item_description
    FROM active_mappings am
    INNER JOIN dbo.BS_Purchase_Invoices_For_Budget p
      ON LTRIM(RTRIM(p.ITEM_CODE)) = am.po_item_code
    OUTER APPLY (
      SELECT SUM(requested_qty) AS approved_qty
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = p.ID
        AND status = 'APPROVED'
    ) approved
    OUTER APPLY (
      SELECT SUM(requested_qty) AS pending_qty
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = p.ID
        AND status = 'PENDING'
    ) pending
    ORDER BY
      am.mapping_priority ASC,
      CASE WHEN am.mapping_source = 'MANUAL' THEN 1 ELSE 0 END DESC,
      am.learned_count DESC,
      am.last_learned_at DESC,
      available_qty DESC,
      p.CREATED_AT DESC,
      p.ID DESC
  `);

  return result.recordset || [];
}

export async function createCategoryPoLinkRepo({
  purchaseInvoiceLineId,
  categoryTypeReviewSubItemId,
  requestedQty,
  unitCost,
  linkedAmount,
  requestedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId)
    .input("lineId", sql.BigInt, categoryTypeReviewSubItemId)
    .input("requestedQty", sql.Decimal(18, 4), requestedQty)
    .input("unitCost", sql.Decimal(18, 6), unitCost)
    .input("linkedAmount", sql.Decimal(18, 6), linkedAmount)
    .input("requestedBy", sql.Int, requestedBy)
    .query(`
      INSERT INTO dbo.BS_category_po_links (
        purchase_invoice_line_id,
        category_type_review_sub_item_id,
        requested_qty,
        unit_cost,
        linked_amount,
        status,
        requested_by
      )
      OUTPUT INSERTED.id
      VALUES (
        @purchaseInvoiceLineId,
        @lineId,
        @requestedQty,
        @unitCost,
        @linkedAmount,
        'PENDING',
        @requestedBy
      )
    `);

  return getCategoryPoLinkDetailsRepo(result.recordset[0].id, transaction);
}

export async function getCategoryPoLinksRepo({
  status,
  requestedBy = null,
  categoryId = null,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("status", sql.VarChar(30), status === "ALL" ? null : status)
    .input("requestedBy", sql.Int, requestedBy)
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        pl.id,
        pl.purchase_invoice_line_id,
        pl.category_type_review_sub_item_id,
        pl.requested_qty,
        pl.unit_cost,
        pl.linked_amount,
        pl.status,
        pl.requested_by,
        pl.requested_at,
        pl.approved_by,
        pl.approved_at,
        pl.rejected_by,
        pl.rejected_at,
        pl.rejection_reason,
        rsi.sub_item_name_snapshot,
        ctr.budget_type_id,
        bt.name AS budget_type_name,
        crp.financial_year_id,
        fy.year AS financial_year,
        crp.category_id,
        c.name AS category_name,
        req.USER_NAME AS requested_by_name,
        po.ORDER_ID AS order_id,
        po.ITEM_CODE AS item_code,
        po.ITEM_DESC AS item_description,
        po.SUPPLIER_NAME_EN AS supplier_name
      FROM dbo.BS_category_po_links pl
      INNER JOIN dbo.BS_category_type_review_sub_items rsi
        ON rsi.id = pl.category_type_review_sub_item_id
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = rsi.category_type_review_id
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = ctr.budget_type_id
      INNER JOIN dbo.USERS req
        ON req.USER_ID = pl.requested_by
      INNER JOIN dbo.BS_Purchase_Invoices_For_Budget po
        ON po.ID = pl.purchase_invoice_line_id
      WHERE (@status IS NULL OR pl.status = @status)
        AND (@requestedBy IS NULL OR pl.requested_by = @requestedBy)
        AND (@categoryId IS NULL OR crp.category_id = @categoryId)
      ORDER BY pl.requested_at DESC
    `);

  return result.recordset || [];
}

export async function getCategoryPoLinkDetailsRepo(
  poLinkId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("poLinkId", sql.BigInt, poLinkId)
    .query(`
      SELECT TOP 1
        pl.*,
        rsi.budget_sub_item_id,
        rsi.sub_item_name_snapshot,
        rsi.specification_snapshot,
        rsi.quantity AS sub_item_quantity,
        ctr.budget_type_id,
        bt.name AS budget_type_name,
        crp.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        crp.category_id,
        c.code AS category_code,
        c.name AS category_name,
        req.USER_NAME AS requested_by_name,
        appr.USER_NAME AS approved_by_name,
        rej.USER_NAME AS rejected_by_name,
        po.INVOICE_NO AS invoice_no,
        po.ORDER_ID AS order_id,
        po.ITEM_CODE AS item_code,
        po.ITEM_DESC AS item_description,
        po.QTY AS po_qty,
        po.UNIT_COST AS po_unit_cost,
        po.NET_AMOUNT AS po_net_amount,
        po.SUPPLIER_NAME_EN AS supplier_name
      FROM dbo.BS_category_po_links pl
      INNER JOIN dbo.BS_category_type_review_sub_items rsi
        ON rsi.id = pl.category_type_review_sub_item_id
      INNER JOIN dbo.BS_category_type_reviews ctr
        ON ctr.id = rsi.category_type_review_id
      INNER JOIN dbo.BS_category_review_packages crp
        ON crp.id = ctr.category_review_package_id
      INNER JOIN dbo.BS_financial_years fy
        ON fy.id = crp.financial_year_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = crp.category_id
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = ctr.budget_type_id
      INNER JOIN dbo.USERS req
        ON req.USER_ID = pl.requested_by
      LEFT JOIN dbo.USERS appr
        ON appr.USER_ID = pl.approved_by
      LEFT JOIN dbo.USERS rej
        ON rej.USER_ID = pl.rejected_by
      INNER JOIN dbo.BS_Purchase_Invoices_For_Budget po
        ON po.ID = pl.purchase_invoice_line_id
      WHERE pl.id = @poLinkId
    `);

  return result.recordset[0] || null;
}

export async function findPendingCategoryPoLinkRepo({
  purchaseInvoiceLineId,
  categoryTypeReviewSubItemId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId)
    .input("lineId", sql.BigInt, categoryTypeReviewSubItemId)
    .query(`
      SELECT TOP 1 id
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = @purchaseInvoiceLineId
        AND category_type_review_sub_item_id = @lineId
        AND status = 'PENDING'
    `);

  return result.recordset[0] || null;
}

export async function approveCategoryPoLinkRepo({
  poLinkId,
  approvedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("poLinkId", sql.BigInt, poLinkId)
    .input("approvedBy", sql.Int, approvedBy)
    .query(`
      UPDATE dbo.BS_category_po_links
      SET
        status = 'APPROVED',
        approved_by = @approvedBy,
        approved_at = SYSUTCDATETIME(),
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      WHERE id = @poLinkId
        AND status = 'PENDING'
    `);

  const row = result.recordset[0];
  return row ? getCategoryPoLinkDetailsRepo(row.id, transaction) : null;
}

export async function rejectCategoryPoLinkRepo({
  poLinkId,
  rejectedBy,
  reason,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("poLinkId", sql.BigInt, poLinkId)
    .input("rejectedBy", sql.Int, rejectedBy)
    .input("reason", sql.NVarChar(1000), reason)
    .query(`
      UPDATE dbo.BS_category_po_links
      SET
        status = 'REJECTED',
        rejected_by = @rejectedBy,
        rejected_at = SYSUTCDATETIME(),
        rejection_reason = @reason,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      WHERE id = @poLinkId
        AND status = 'PENDING'
    `);

  const row = result.recordset[0];
  return row ? getCategoryPoLinkDetailsRepo(row.id, transaction) : null;
}

export async function learnPOSubItemMappingFromApprovedLinkRepo({
  poLinkId,
  userId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("poLinkId", sql.BigInt, poLinkId)
    .input("userId", sql.Int, userId)
    .query(`
      DECLARE @budgetSubItemId BIGINT;
      DECLARE @poItemCode NVARCHAR(100);
      DECLARE @poItemDescription NVARCHAR(500);
      DECLARE @approvedAt DATETIME2;

      SELECT TOP 1
        @budgetSubItemId = rsi.budget_sub_item_id,
        @poItemCode = LTRIM(RTRIM(po.ITEM_CODE)),
        @poItemDescription = po.ITEM_DESC,
        @approvedAt = pl.approved_at
      FROM dbo.BS_category_po_links pl
      INNER JOIN dbo.BS_category_type_review_sub_items rsi
        ON rsi.id = pl.category_type_review_sub_item_id
      INNER JOIN dbo.BS_Purchase_Invoices_For_Budget po
        ON po.ID = pl.purchase_invoice_line_id
      WHERE pl.id = @poLinkId
        AND pl.status = 'APPROVED'
        AND po.ITEM_CODE IS NOT NULL
        AND LTRIM(RTRIM(po.ITEM_CODE)) <> '';

      IF @budgetSubItemId IS NULL OR @poItemCode IS NULL
      BEGIN
        SELECT CAST(NULL AS BIGINT) AS id;
        RETURN;
      END;

      UPDATE dbo.BS_PO_SUB_ITEM_MAPPINGS
      SET
        learned_count = learned_count + 1,
        last_learned_at = ISNULL(@approvedAt, SYSUTCDATETIME()),
        po_item_description = COALESCE(po_item_description, @poItemDescription),
        updated_by = @userId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE budget_sub_item_id = @budgetSubItemId
        AND po_item_code = @poItemCode;

      IF @@ROWCOUNT = 0
      BEGIN
        INSERT INTO dbo.BS_PO_SUB_ITEM_MAPPINGS (
          budget_sub_item_id,
          po_item_code,
          po_item_description,
          mapping_source,
          source_category_po_link_id,
          learned_count,
          last_learned_at,
          created_by,
          created_at
        )
        OUTPUT INSERTED.*
        SELECT
          @budgetSubItemId,
          @poItemCode,
          @poItemDescription,
          'APPROVED_LINK',
          @poLinkId,
          1,
          ISNULL(@approvedAt, SYSUTCDATETIME()),
          @userId,
          ISNULL(@approvedAt, SYSUTCDATETIME())
        WHERE NOT EXISTS (
          SELECT 1
          FROM dbo.BS_PO_SUB_ITEM_MAPPINGS WITH (UPDLOCK, HOLDLOCK)
          WHERE budget_sub_item_id = @budgetSubItemId
            AND po_item_code = @poItemCode
        );
      END;
    `);

  return result.recordset[0] || null;
}
