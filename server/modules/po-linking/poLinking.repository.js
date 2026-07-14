import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import { PO_LINK_STATUS, PO_MAPPING_SOURCE } from "./poLinking.constants.js";

function normalizeCode(value) {
  return String(value || "").trim();
}

function poEligibilityWhere(alias = "p") {
  return `(
    ${alias}.STATUS_NAME_EN IS NULL
    OR UPPER(${alias}.STATUS_NAME_EN) NOT LIKE '%DRAFT%'
    AND UPPER(${alias}.STATUS_NAME_EN) NOT LIKE '%PENDING%'
    AND UPPER(${alias}.STATUS_NAME_EN) NOT LIKE '%CANCEL%'
    AND UPPER(${alias}.STATUS_NAME_EN) NOT LIKE '%REJECT%'
  )`;
}

function poLinkSelect() {
  return `
    SELECT
      link.id,
      link.purchase_invoice_line_id,
      link.category_budget_package_sub_item_id,
      link.requested_qty,
      link.unit_cost_snapshot AS unit_cost,
      link.linked_amount,
      link.status,
      link.requested_by,
      link.requested_user_role_id,
      link.requested_at,
      link.approved_by,
      link.approved_user_role_id,
      link.approved_at,
      link.rejected_by,
      link.rejected_user_role_id,
      link.rejected_at,
      link.rejection_reason,
      link.cancelled_by,
      link.cancelled_user_role_id,
      link.cancelled_at,
      link.cancellation_reason,
      link.created_at,
      link.updated_at,
      link.row_version,
      pkg.id AS category_budget_package_id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.name AS category_name,
      category.category_code,
      packageItem.id AS package_item_id,
      packageItem.catalog_item_id,
      catalog.name AS catalog_item_name,
      subItem.catalog_sub_item_id,
      subItem.name AS sub_item_name,
      CONCAT(catalog.name, ' / ', subItem.name) AS package_sub_item_label,
      CONCAT(catalog.name, ' / ', subItem.name) AS budget_type_name,
      subItem.quantity AS budget_item_quantity,
      subItem.unit_price AS budget_item_unit_price,
      subItem.quantity * subItem.unit_price AS budget_item_total_amount,
      requester.USER_NAME AS requested_by_name,
      approver.USER_NAME AS approved_by_name,
      rejecter.USER_NAME AS rejected_by_name,
      po.INVOICE_NO AS invoice_no,
      po.INVOICE_DUE_DATE AS invoice_due_date,
      po.ORDER_ID AS order_id,
      po.ITEM_CODE AS item_code,
      po.ITEM_DESC AS item_description,
      po.PARENT_ITEM_NAME AS parent_item_name,
      po.QTY AS po_qty,
      po.UNIT_COST AS po_unit_cost,
      po.NET_AMOUNT AS po_net_amount,
      po.SUPPLIER_NAME_EN AS supplier_name,
      po.STATUS_NAME_EN AS po_status_name
    FROM dbo.BS_category_po_links AS link
    INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
      ON subItem.id = link.category_budget_package_sub_item_id
    INNER JOIN dbo.BS_category_budget_package_items AS packageItem
      ON packageItem.id = subItem.category_budget_package_item_id
    INNER JOIN dbo.BS_category_budget_packages AS pkg
      ON pkg.id = packageItem.category_budget_package_id
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
    INNER JOIN dbo.BS_budget_catalog_items AS catalog
      ON catalog.id = packageItem.catalog_item_id
    INNER JOIN dbo.BS_Purchase_Invoices_For_Budget AS po
      ON po.ID = link.purchase_invoice_line_id
    LEFT JOIN dbo.USERS AS requester
      ON requester.USER_ID = link.requested_by
    LEFT JOIN dbo.USERS AS approver
      ON approver.USER_ID = link.approved_by
    LEFT JOIN dbo.USERS AS rejecter
      ON rejecter.USER_ID = link.rejected_by
  `;
}

function packageSubItemBalanceCte() {
  return `
    WITH approvedPo AS (
      SELECT category_budget_package_sub_item_id, SUM(requested_qty) AS quantity
      FROM dbo.BS_category_po_links
      WHERE status = '${PO_LINK_STATUS.APPROVED}'
      GROUP BY category_budget_package_sub_item_id
    ),
    pendingPo AS (
      SELECT category_budget_package_sub_item_id, SUM(requested_qty) AS quantity
      FROM dbo.BS_category_po_links
      WHERE status = '${PO_LINK_STATUS.PENDING}'
      GROUP BY category_budget_package_sub_item_id
    ),
    approvedTransferIn AS (
      SELECT to_package_sub_item_id, SUM(destination_quantity) AS quantity
      FROM dbo.BS_category_budget_transfers
      WHERE status = 'APPROVED'
      GROUP BY to_package_sub_item_id
    ),
    approvedTransferOut AS (
      SELECT from_package_sub_item_id, SUM(source_quantity) AS quantity
      FROM dbo.BS_category_budget_transfers
      WHERE status = 'APPROVED'
      GROUP BY from_package_sub_item_id
    ),
    pendingTransferOut AS (
      SELECT from_package_sub_item_id, SUM(source_quantity) AS quantity
      FROM dbo.BS_category_budget_transfers
      WHERE status = 'PENDING_APPROVAL'
      GROUP BY from_package_sub_item_id
    )
  `;
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
        STATUS_NAME_EN AS po_status_name,
        INV_YEAR_CODE AS invoice_year_code,
        CREATED_AT AS created_at
      FROM dbo.BS_Purchase_Invoices_For_Budget
      WHERE ID = @id
    `);

  return result.recordset[0] || null;
}

export async function getPOAllocationSummaryRepo(
  purchaseInvoiceLineId,
  transaction = null,
) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId)
    .query(`
      SELECT
        CAST(ISNULL(po.QTY, 0) AS DECIMAL(18,4)) AS original_qty,
        CAST(ISNULL(approved.approved_qty, 0) AS DECIMAL(18,4)) AS approved_qty,
        CAST(ISNULL(pending.pending_qty, 0) AS DECIMAL(18,4)) AS pending_qty,
        CAST(
          ISNULL(po.QTY, 0)
          - ISNULL(approved.approved_qty, 0)
          - ISNULL(pending.pending_qty, 0)
          AS DECIMAL(18,4)
        ) AS available_qty
      FROM dbo.BS_Purchase_Invoices_For_Budget AS po
      OUTER APPLY (
        SELECT SUM(requested_qty) AS approved_qty
        FROM dbo.BS_category_po_links
        WHERE purchase_invoice_line_id = po.ID
          AND status = '${PO_LINK_STATUS.APPROVED}'
      ) AS approved
      OUTER APPLY (
        SELECT SUM(requested_qty) AS pending_qty
        FROM dbo.BS_category_po_links
        WHERE purchase_invoice_line_id = po.ID
          AND status = '${PO_LINK_STATUS.PENDING}'
      ) AS pending
      WHERE po.ID = @purchaseInvoiceLineId
    `);

  return result.recordset[0] || null;
}

export async function getPackageSubItemBalanceRepo(
  packageSubItemId,
  transaction = null,
) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .query(`
      ${packageSubItemBalanceCte()}
      SELECT TOP 1
        subItem.id,
        subItem.quantity AS approved_qty,
        COALESCE(approvedPo.quantity, 0) AS approved_linked_qty,
        COALESCE(pendingPo.quantity, 0) AS pending_linked_qty,
        COALESCE(approvedTransferIn.quantity, 0) AS approved_transfer_in_quantity,
        COALESCE(approvedTransferOut.quantity, 0) AS approved_transfer_out_quantity,
        COALESCE(pendingTransferOut.quantity, 0) AS pending_transfer_out_quantity,
        CAST(
          subItem.quantity
          + COALESCE(approvedTransferIn.quantity, 0)
          - COALESCE(approvedTransferOut.quantity, 0)
          - COALESCE(pendingTransferOut.quantity, 0)
          - COALESCE(approvedPo.quantity, 0)
          - COALESCE(pendingPo.quantity, 0)
          AS DECIMAL(18,4)
        ) AS remaining_qty
      FROM dbo.BS_category_budget_package_sub_items AS subItem WITH (UPDLOCK, HOLDLOCK)
      LEFT JOIN approvedPo ON approvedPo.category_budget_package_sub_item_id = subItem.id
      LEFT JOIN pendingPo ON pendingPo.category_budget_package_sub_item_id = subItem.id
      LEFT JOIN approvedTransferIn ON approvedTransferIn.to_package_sub_item_id = subItem.id
      LEFT JOIN approvedTransferOut ON approvedTransferOut.from_package_sub_item_id = subItem.id
      LEFT JOIN pendingTransferOut ON pendingTransferOut.from_package_sub_item_id = subItem.id
      WHERE subItem.id = @packageSubItemId
    `);

  return result.recordset[0] || null;
}

export async function listPackageSubItemsForPoLinkingRepo({
  budgetCategoryId,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("budgetCategoryId", sql.Int, budgetCategoryId)
    .query(`
      ${packageSubItemBalanceCte()}
      SELECT
        subItem.id,
        subItem.id AS package_sub_item_id,
        packageItem.id AS package_item_id,
        pkg.id AS category_budget_package_id,
        pkg.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        pkg.budget_category_id,
        category.name AS category_name,
        category.category_code,
        catalog.id AS catalog_item_id,
        catalog.name AS catalog_item_name,
        catalog.item_code AS catalog_item_code,
        subItem.catalog_sub_item_id,
        subItem.name AS sub_item_name,
        CONCAT(catalog.name, ' / ', subItem.name) AS name,
        subItem.quantity AS approved_qty,
        subItem.unit_price,
        subItem.quantity * subItem.unit_price AS total_amount,
        COALESCE(approvedPo.quantity, 0) AS approved_linked_qty,
        COALESCE(pendingPo.quantity, 0) AS pending_linked_qty,
        COALESCE(approvedTransferIn.quantity, 0) AS approved_transfer_in_quantity,
        COALESCE(approvedTransferOut.quantity, 0) AS approved_transfer_out_quantity,
        COALESCE(pendingTransferOut.quantity, 0) AS pending_transfer_out_quantity,
        CAST(
          subItem.quantity
          + COALESCE(approvedTransferIn.quantity, 0)
          - COALESCE(approvedTransferOut.quantity, 0)
          - COALESCE(pendingTransferOut.quantity, 0)
          - COALESCE(approvedPo.quantity, 0)
          - COALESCE(pendingPo.quantity, 0)
          AS DECIMAL(18,4)
        ) AS remaining_qty,
        subItem.row_version
      FROM dbo.BS_category_budget_package_sub_items AS subItem
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.id = subItem.category_budget_package_item_id
       AND packageItem.is_active = 1
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = pkg.budget_category_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.id = packageItem.catalog_item_id
      LEFT JOIN approvedPo ON approvedPo.category_budget_package_sub_item_id = subItem.id
      LEFT JOIN pendingPo ON pendingPo.category_budget_package_sub_item_id = subItem.id
      LEFT JOIN approvedTransferIn ON approvedTransferIn.to_package_sub_item_id = subItem.id
      LEFT JOIN approvedTransferOut ON approvedTransferOut.from_package_sub_item_id = subItem.id
      LEFT JOIN pendingTransferOut ON pendingTransferOut.from_package_sub_item_id = subItem.id
      WHERE
        pkg.budget_category_id = @budgetCategoryId
        AND fy.status = 'PRE_CLOSING'
        AND pkg.status = 'CFO_REVIEW_COMPLETED'
        AND subItem.is_active = 1
      ORDER BY catalog.name ASC, subItem.name ASC
    `);

  return result.recordset;
}

export async function getPackageSubItemContextRepo(
  packageSubItemId,
  transaction = null,
) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .query(`
      SELECT TOP 1
        subItem.id,
        subItem.catalog_sub_item_id,
        subItem.name AS sub_item_name,
        subItem.quantity,
        subItem.unit_price,
        packageItem.id AS package_item_id,
        packageItem.catalog_item_id,
        catalog.name AS catalog_item_name,
        pkg.id AS category_budget_package_id,
        pkg.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        pkg.status AS package_status,
        pkg.budget_category_id,
        category.name AS category_name
      FROM dbo.BS_category_budget_package_sub_items AS subItem WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem WITH (UPDLOCK, HOLDLOCK)
        ON packageItem.id = subItem.category_budget_package_item_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy WITH (UPDLOCK, HOLDLOCK)
        ON fy.id = pkg.financial_year_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = pkg.budget_category_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.id = packageItem.catalog_item_id
      WHERE subItem.id = @packageSubItemId
        AND subItem.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getAvailablePurchaseInvoiceLinesRepo(filters = {}) {
  const pool = await poolPromise;
  const request = createRequest(pool);
  const where = [
    "p.ITEM_CODE IS NOT NULL",
    "LTRIM(RTRIM(p.ITEM_CODE)) <> ''",
    poEligibilityWhere("p"),
  ];

  if (filters.search) {
    request.input("search", sql.NVarChar(300), `%${filters.search}%`);
    where.push(`(
      CONVERT(NVARCHAR(100), p.INVOICE_NO) LIKE @search
      OR p.ORDER_ID LIKE @search
      OR p.ITEM_CODE LIKE @search
      OR p.ITEM_DESC LIKE @search
      OR p.SUPPLIER_NAME_EN LIKE @search
      OR p.PARENT_ITEM_NAME LIKE @search
    )`);
  }

  if (filters.invoiceNumber) {
    request.input("invoiceNumber", sql.NVarChar(100), `%${filters.invoiceNumber}%`);
    where.push("CONVERT(NVARCHAR(100), p.INVOICE_NO) LIKE @invoiceNumber");
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
    request.input("itemDescription", sql.NVarChar(300), `%${filters.itemDescription}%`);
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
    SELECT TOP 200
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
      CAST(ISNULL(p.QTY, 0) AS DECIMAL(18,4)) AS po_qty,
      CAST(ISNULL(p.BONUS_QTY, 0) AS DECIMAL(18,4)) AS bonus_qty,
      CAST(ISNULL(p.UNIT_COST, 0) AS DECIMAL(18,6)) AS unit_cost,
      CAST(ISNULL(p.NET_AMOUNT, 0) AS DECIMAL(18,6)) AS net_amount,
      p.INV_YEAR_CODE AS invoice_year_code,
      p.CREATED_AT AS created_at,
      CAST(ISNULL(approved.approved_qty, 0) AS DECIMAL(18,4)) AS approved_qty,
      CAST(ISNULL(pending.pending_qty, 0) AS DECIMAL(18,4)) AS pending_qty,
      CAST(
        ISNULL(p.QTY, 0)
        - ISNULL(approved.approved_qty, 0)
        - ISNULL(pending.pending_qty, 0)
        AS DECIMAL(18,4)
      ) AS available_qty
    FROM dbo.BS_Purchase_Invoices_For_Budget AS p
    OUTER APPLY (
      SELECT SUM(requested_qty) AS approved_qty
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = p.ID
        AND status = '${PO_LINK_STATUS.APPROVED}'
    ) AS approved
    OUTER APPLY (
      SELECT SUM(requested_qty) AS pending_qty
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = p.ID
        AND status = '${PO_LINK_STATUS.PENDING}'
    ) AS pending
    WHERE ${where.join(" AND ")}
    ORDER BY p.CREATED_AT DESC, p.ID DESC
  `);

  return result.recordset;
}

export async function getSuggestedPurchaseInvoiceLinesRepo({
  packageSubItemId,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .query(`
      WITH selectedSubItem AS (
        SELECT TOP 1 catalog_sub_item_id
        FROM dbo.BS_category_budget_package_sub_items
        WHERE id = @packageSubItemId
      ),
      activeMappings AS (
        SELECT
          mapping.id AS mapping_id,
          mapping.po_item_code,
          mapping.po_item_description AS mapped_po_item_description,
          mapping.mapping_source,
          mapping.learned_count,
          mapping.last_learned_at
        FROM dbo.BS_PO_CATALOG_MAPPINGS AS mapping
        INNER JOIN selectedSubItem
          ON selectedSubItem.catalog_sub_item_id = mapping.catalog_sub_item_id
        WHERE mapping.is_active = 1
      )
      SELECT TOP 100
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
        CAST(ISNULL(p.QTY, 0) AS DECIMAL(18,4)) AS po_qty,
        CAST(ISNULL(p.BONUS_QTY, 0) AS DECIMAL(18,4)) AS bonus_qty,
        CAST(ISNULL(p.UNIT_COST, 0) AS DECIMAL(18,6)) AS unit_cost,
        CAST(ISNULL(p.NET_AMOUNT, 0) AS DECIMAL(18,6)) AS net_amount,
        p.INV_YEAR_CODE AS invoice_year_code,
        p.CREATED_AT AS created_at,
        CAST(ISNULL(approved.approved_qty, 0) AS DECIMAL(18,4)) AS approved_qty,
        CAST(ISNULL(pending.pending_qty, 0) AS DECIMAL(18,4)) AS pending_qty,
        CAST(
          ISNULL(p.QTY, 0)
          - ISNULL(approved.approved_qty, 0)
          - ISNULL(pending.pending_qty, 0)
          AS DECIMAL(18,4)
        ) AS available_qty,
        activeMappings.mapping_id,
        activeMappings.mapping_source,
        activeMappings.learned_count,
        activeMappings.last_learned_at,
        activeMappings.mapped_po_item_description
      FROM activeMappings
      INNER JOIN dbo.BS_Purchase_Invoices_For_Budget AS p
        ON LTRIM(RTRIM(p.ITEM_CODE)) = activeMappings.po_item_code
      OUTER APPLY (
        SELECT SUM(requested_qty) AS approved_qty
        FROM dbo.BS_category_po_links
        WHERE purchase_invoice_line_id = p.ID
          AND status = '${PO_LINK_STATUS.APPROVED}'
      ) AS approved
      OUTER APPLY (
        SELECT SUM(requested_qty) AS pending_qty
        FROM dbo.BS_category_po_links
        WHERE purchase_invoice_line_id = p.ID
          AND status = '${PO_LINK_STATUS.PENDING}'
      ) AS pending
      WHERE ${poEligibilityWhere("p")}
      ORDER BY
        CASE WHEN activeMappings.mapping_source = '${PO_MAPPING_SOURCE.MANUAL}' THEN 1 ELSE 0 END DESC,
        activeMappings.learned_count DESC,
        activeMappings.last_learned_at DESC,
        available_qty DESC,
        p.CREATED_AT DESC,
        p.ID DESC
    `);

  return result.recordset;
}

export async function findPendingPOLinkRepo({
  purchaseInvoiceLineId,
  packageSubItemId,
  transaction = null,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId)
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .query(`
      SELECT TOP 1 id
      FROM dbo.BS_category_po_links
      WHERE purchase_invoice_line_id = @purchaseInvoiceLineId
        AND category_budget_package_sub_item_id = @packageSubItemId
        AND status = '${PO_LINK_STATUS.PENDING}'
    `);

  return result.recordset[0] || null;
}

export async function createPOLinkRepo(data, transaction = null) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("purchaseInvoiceLineId", sql.BigInt, data.purchase_invoice_line_id)
    .input("packageSubItemId", sql.BigInt, data.category_budget_package_sub_item_id)
    .input("requestedQty", sql.Decimal(18, 4), data.requested_qty)
    .input("unitCost", sql.Decimal(18, 6), data.unit_cost_snapshot)
    .input("requestedBy", sql.Int, data.requested_by)
    .input("requestedUserRoleId", sql.Int, data.requested_user_role_id)
    .query(`
      INSERT INTO dbo.BS_category_po_links
      (
        purchase_invoice_line_id,
        category_budget_package_sub_item_id,
        requested_qty,
        unit_cost_snapshot,
        status,
        requested_by,
        requested_user_role_id
      )
      OUTPUT INSERTED.id
      VALUES
      (
        @purchaseInvoiceLineId,
        @packageSubItemId,
        @requestedQty,
        @unitCost,
        '${PO_LINK_STATUS.PENDING}',
        @requestedBy,
        @requestedUserRoleId
      )
    `);

  return result.recordset[0]?.id || null;
}

export async function getPOLinkDetailsRepo(id, transaction = null) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("id", sql.BigInt, id)
    .query(`
      ${poLinkSelect()}
      WHERE link.id = @id
    `);

  return result.recordset[0] || null;
}

export async function getMyPOLinksRepo(userId) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("userId", sql.Int, userId)
    .query(`
      ${poLinkSelect()}
      WHERE link.requested_by = @userId
      ORDER BY link.requested_at DESC, link.id DESC
    `);

  return result.recordset;
}

export async function getPOLinksForApprovalRepo({
  status = "PENDING",
  financialYearId = null,
  budgetCategoryId = null,
} = {}) {
  const pool = await poolPromise;
  const request = createRequest(pool);
  request.input("status", sql.VarChar(30), status === "ALL" ? null : status);
  request.input("financialYearId", sql.Int, financialYearId || null);
  request.input("budgetCategoryId", sql.Int, budgetCategoryId || null);

  const result = await request.query(`
    ${poLinkSelect()}
    WHERE
      (@status IS NULL OR link.status = @status)
      AND (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
      AND (@budgetCategoryId IS NULL OR pkg.budget_category_id = @budgetCategoryId)
    ORDER BY link.requested_at ASC, link.id ASC
  `);

  return result.recordset;
}

export async function approvePOLinkRepo({
  poLinkId,
  userId,
  userRoleId,
  transaction = null,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("id", sql.BigInt, poLinkId)
    .input("userId", sql.Int, userId)
    .input("userRoleId", sql.Int, userRoleId)
    .query(`
      UPDATE dbo.BS_category_po_links
      SET
        status = '${PO_LINK_STATUS.APPROVED}',
        approved_by = @userId,
        approved_user_role_id = @userRoleId,
        approved_at = SYSUTCDATETIME(),
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      WHERE id = @id
        AND status = '${PO_LINK_STATUS.PENDING}'
    `);

  return result.recordset[0]?.id || null;
}

export async function rejectPOLinkRepo({
  poLinkId,
  userId,
  userRoleId,
  reason,
  transaction = null,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("id", sql.BigInt, poLinkId)
    .input("userId", sql.Int, userId)
    .input("userRoleId", sql.Int, userRoleId)
    .input("reason", sql.NVarChar(1000), reason)
    .query(`
      UPDATE dbo.BS_category_po_links
      SET
        status = '${PO_LINK_STATUS.REJECTED}',
        rejected_by = @userId,
        rejected_user_role_id = @userRoleId,
        rejected_at = SYSUTCDATETIME(),
        rejection_reason = @reason,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      WHERE id = @id
        AND status = '${PO_LINK_STATUS.PENDING}'
    `);

  return result.recordset[0]?.id || null;
}

export async function learnPOCatalogMappingFromApprovedLinkRepo({
  poLinkId,
  userId,
  transaction = null,
}) {
  const pool = await poolPromise;
  await createRequest(pool, transaction)
    .input("poLinkId", sql.BigInt, poLinkId)
    .input("userId", sql.Int, userId)
    .query(`
      DECLARE @poItemCode NVARCHAR(100);
      DECLARE @poItemDescription NVARCHAR(500);
      DECLARE @catalogSubItemId INT;
      DECLARE @purchaseInvoiceLineId BIGINT;

      SELECT TOP 1
        @poItemCode = LTRIM(RTRIM(po.ITEM_CODE)),
        @poItemDescription = po.ITEM_DESC,
        @catalogSubItemId = subItem.catalog_sub_item_id,
        @purchaseInvoiceLineId = po.ID
      FROM dbo.BS_category_po_links AS link
      INNER JOIN dbo.BS_Purchase_Invoices_For_Budget AS po
        ON po.ID = link.purchase_invoice_line_id
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = link.category_budget_package_sub_item_id
      WHERE link.id = @poLinkId
        AND link.status = '${PO_LINK_STATUS.APPROVED}'
        AND po.ITEM_CODE IS NOT NULL
        AND LTRIM(RTRIM(po.ITEM_CODE)) <> '';

      IF @poItemCode IS NULL OR @catalogSubItemId IS NULL
        RETURN;

      UPDATE dbo.BS_PO_CATALOG_MAPPINGS
      SET
        learned_count = learned_count + 1,
        last_learned_at = SYSUTCDATETIME(),
        updated_by = @userId,
        updated_at = SYSUTCDATETIME()
      WHERE po_item_code = @poItemCode
        AND catalog_sub_item_id = @catalogSubItemId
        AND is_active = 1;

      IF @@ROWCOUNT = 0
      BEGIN
        INSERT INTO dbo.BS_PO_CATALOG_MAPPINGS
        (
          po_item_code,
          po_item_description,
          catalog_sub_item_id,
          mapping_source,
          source_po_link_id,
          source_purchase_invoice_line_id,
          learned_count,
          last_learned_at,
          created_by
        )
        VALUES
        (
          @poItemCode,
          @poItemDescription,
          @catalogSubItemId,
          '${PO_MAPPING_SOURCE.APPROVED_PO_LINK}',
          @poLinkId,
          @purchaseInvoiceLineId,
          1,
          SYSUTCDATETIME(),
          @userId
        );
      END
    `);
}

export async function getPOAllocationHistoryRepo(purchaseInvoiceLineId) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("purchaseInvoiceLineId", sql.BigInt, purchaseInvoiceLineId)
    .query(`
      ${poLinkSelect()}
      WHERE link.purchase_invoice_line_id = @purchaseInvoiceLineId
      ORDER BY link.requested_at DESC, link.id DESC
    `);

  return result.recordset;
}

export async function getPackageSubItemPOLinksRepo(packageSubItemId) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .query(`
      ${poLinkSelect()}
      WHERE link.category_budget_package_sub_item_id = @packageSubItemId
      ORDER BY
        CASE link.status
          WHEN '${PO_LINK_STATUS.APPROVED}' THEN 1
          WHEN '${PO_LINK_STATUS.PENDING}' THEN 2
          ELSE 3
        END,
        COALESCE(link.approved_at, link.requested_at) DESC,
        link.id DESC
    `);

  return result.recordset;
}

export async function getPackageSubItemPriceIntelligenceDetailsRepo({
  packageSubItemId,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool)
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .query(`
      DECLARE @evidenceWindowStart DATETIME2 = DATEADD(MONTH, -24, SYSUTCDATETIME());

      SELECT TOP 1
        subItem.id AS package_sub_item_id,
        subItem.id AS id,
        subItem.category_budget_package_item_id,
        subItem.catalog_sub_item_id,
        subItem.name AS sub_item_name,
        subItem.name AS type_name,
        catalogSub.sub_item_code,
        subItem.specification,
        subItem.quantity,
        subItem.unit_price,
        CAST(ISNULL(subItem.quantity, 0) * ISNULL(subItem.unit_price, 0) AS DECIMAL(18, 6)) AS total_amount,
        COUNT(attachment.id) AS attachment_count,
        unit.name AS unit_of_measure_name,
        unit.unit_code AS unit_of_measure_code,
        packageItem.id AS package_item_id,
        packageItem.catalog_item_id,
        catalog.name AS catalog_item_name,
        catalog.item_code AS catalog_item_code,
        pkg.id AS category_budget_package_id,
        pkg.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        pkg.status AS package_status,
        pkg.budget_category_id,
        category.name AS category_name,
        category.category_code
      INTO #package_sub_item
      FROM dbo.BS_category_budget_package_sub_items AS subItem
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.id = subItem.category_budget_package_item_id
       AND packageItem.is_active = 1
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = pkg.budget_category_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.id = packageItem.catalog_item_id
      INNER JOIN dbo.BS_budget_catalog_sub_items AS catalogSub
        ON catalogSub.id = subItem.catalog_sub_item_id
      LEFT JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = subItem.unit_of_measure_id
      LEFT JOIN dbo.BS_category_budget_package_sub_item_attachments AS attachment
        ON attachment.category_budget_package_sub_item_id = subItem.id
       AND attachment.is_active = 1
      WHERE subItem.id = @packageSubItemId
        AND subItem.is_active = 1
      GROUP BY
        subItem.id,
        subItem.category_budget_package_item_id,
        subItem.catalog_sub_item_id,
        subItem.name,
        catalogSub.sub_item_code,
        subItem.specification,
        subItem.quantity,
        subItem.unit_price,
        unit.name,
        unit.unit_code,
        packageItem.id,
        packageItem.catalog_item_id,
        catalog.name,
        catalog.item_code,
        pkg.id,
        pkg.financial_year_id,
        fy.year,
        fy.status,
        pkg.status,
        pkg.budget_category_id,
        category.name,
        category.category_code;

      SELECT DISTINCT
        packageSubItem.package_sub_item_id,
        LTRIM(RTRIM(mapping.po_item_code)) AS po_item_code
      INTO #active_mappings
      FROM #package_sub_item AS packageSubItem
      INNER JOIN dbo.BS_PO_CATALOG_MAPPINGS AS mapping
        ON mapping.catalog_sub_item_id = packageSubItem.catalog_sub_item_id
      WHERE mapping.is_active = 1
        AND mapping.po_item_code IS NOT NULL
        AND LTRIM(RTRIM(mapping.po_item_code)) <> '';

      SELECT
        mapping.package_sub_item_id,
        po.ID AS purchase_invoice_line_id,
        LTRIM(RTRIM(po.ITEM_CODE)) AS item_code,
        po.ITEM_DESC AS item_description,
        po.PARENT_ITEM_NAME AS parent_item_name,
        po.SUPPLIER_NAME_EN AS supplier_name,
        CAST(ISNULL(po.QTY, 0) AS DECIMAL(18, 4)) AS quantity,
        CAST(po.UNIT_COST AS DECIMAL(18, 6)) AS unit_cost,
        CAST(ISNULL(po.NET_AMOUNT, 0) AS DECIMAL(18, 6)) AS net_amount,
        po.CREATED_AT AS created_at
      INTO #all_history
      FROM #active_mappings AS mapping
      INNER JOIN dbo.BS_Purchase_Invoices_For_Budget AS po
        ON LTRIM(RTRIM(po.ITEM_CODE)) = mapping.po_item_code
      WHERE po.UNIT_COST IS NOT NULL
        AND po.UNIT_COST > 0;

      SELECT
        history.*,
        CASE
          WHEN ISNULL(recent.recent_purchase_count, 0) > 0
            THEN 'RECENT_24_MONTHS'
          ELSE 'ALL_HISTORY'
        END AS evidence_window_used
      INTO #scoped_history
      FROM #all_history AS history
      LEFT JOIN (
        SELECT
          package_sub_item_id,
          COUNT(*) AS recent_purchase_count
        FROM #all_history
        WHERE created_at >= @evidenceWindowStart
        GROUP BY package_sub_item_id
      ) AS recent
        ON recent.package_sub_item_id = history.package_sub_item_id
      WHERE
        (
          ISNULL(recent.recent_purchase_count, 0) > 0
          AND history.created_at >= @evidenceWindowStart
        )
        OR ISNULL(recent.recent_purchase_count, 0) = 0;

      SELECT *
      FROM #package_sub_item;

      WITH ordered_history AS (
        SELECT
          scoped.*,
          ROW_NUMBER() OVER (
            PARTITION BY scoped.package_sub_item_id
            ORDER BY scoped.unit_cost ASC, scoped.purchase_invoice_line_id ASC
          ) AS median_row_number,
          COUNT(*) OVER (
            PARTITION BY scoped.package_sub_item_id
          ) AS median_row_count,
          ROW_NUMBER() OVER (
            PARTITION BY scoped.package_sub_item_id
            ORDER BY scoped.created_at DESC, scoped.purchase_invoice_line_id DESC
          ) AS latest_row_number
        FROM #scoped_history AS scoped
      ),
      medians AS (
        SELECT
          package_sub_item_id,
          AVG(unit_cost) AS median_unit_cost
        FROM ordered_history
        WHERE median_row_number IN (
          (median_row_count + 1) / 2,
          (median_row_count + 2) / 2
        )
        GROUP BY package_sub_item_id
      ),
      aggregates AS (
        SELECT
          package_sub_item_id,
          COUNT(*) AS purchase_count,
          COUNT(DISTINCT NULLIF(LTRIM(RTRIM(supplier_name)), '')) AS supplier_count,
          AVG(unit_cost) AS average_unit_cost,
          MIN(unit_cost) AS min_unit_cost,
          MAX(unit_cost) AS max_unit_cost,
          MAX(evidence_window_used) AS evidence_window_used
        FROM #scoped_history
        GROUP BY package_sub_item_id
      ),
      latest AS (
        SELECT
          package_sub_item_id,
          unit_cost AS last_purchase_unit_cost,
          created_at AS last_purchase_at
        FROM ordered_history
        WHERE latest_row_number = 1
      ),
      mapped_codes AS (
        SELECT
          active.package_sub_item_id,
          STUFF((
            SELECT DISTINCT ', ' + active2.po_item_code
            FROM #active_mappings AS active2
            WHERE active2.package_sub_item_id = active.package_sub_item_id
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS mapped_item_codes
        FROM #active_mappings AS active
        GROUP BY active.package_sub_item_id
      )
      SELECT
        packageSubItem.package_sub_item_id,
        medians.median_unit_cost AS historical_benchmark,
        aggregates.average_unit_cost,
        aggregates.min_unit_cost,
        aggregates.max_unit_cost,
        latest.last_purchase_unit_cost,
        latest.last_purchase_at,
        ISNULL(aggregates.purchase_count, 0) AS purchase_count,
        ISNULL(aggregates.supplier_count, 0) AS supplier_count,
        mapped_codes.mapped_item_codes,
        aggregates.evidence_window_used
      FROM #package_sub_item AS packageSubItem
      LEFT JOIN aggregates
        ON aggregates.package_sub_item_id = packageSubItem.package_sub_item_id
      LEFT JOIN medians
        ON medians.package_sub_item_id = packageSubItem.package_sub_item_id
      LEFT JOIN latest
        ON latest.package_sub_item_id = packageSubItem.package_sub_item_id
      LEFT JOIN mapped_codes
        ON mapped_codes.package_sub_item_id = packageSubItem.package_sub_item_id;

      SELECT TOP 50
        purchase_invoice_line_id,
        item_code,
        item_description,
        parent_item_name,
        supplier_name,
        quantity,
        unit_cost,
        net_amount,
        created_at
      FROM #scoped_history
      ORDER BY created_at DESC, purchase_invoice_line_id DESC;
    `);

  return {
    packageSubItem: result.recordsets?.[0]?.[0] || null,
    benchmark: result.recordsets?.[1]?.[0] || null,
    recentPurchases: result.recordsets?.[2] || [],
  };
}

export async function getPOCatalogMappingsRepo(filters = {}) {
  const pool = await poolPromise;
  const request = createRequest(pool);
  const where = [];

  if (filters.search) {
    request.input("search", sql.NVarChar(200), `%${filters.search}%`);
    where.push(`(
      item.name LIKE @search
      OR subItem.name LIKE @search
      OR mapping.po_item_code LIKE @search
      OR mapping.po_item_description LIKE @search
    )`);
  }

  if (filters.source && filters.source !== "ALL") {
    request.input("source", sql.VarChar(30), filters.source);
    where.push("mapping.mapping_source = @source");
  }

  if (filters.status === "ACTIVE") where.push("mapping.is_active = 1");
  if (filters.status === "INACTIVE") where.push("mapping.is_active = 0");

  const result = await request.query(`
    SELECT
      mapping.*,
      item.id AS catalog_item_id,
      item.name AS catalog_item_name,
      subItem.name AS sub_item_name,
      subItem.sub_item_code,
      createdUser.USER_NAME AS created_by_name,
      updatedUser.USER_NAME AS updated_by_name,
      disabledUser.USER_NAME AS disabled_by_name
    FROM dbo.BS_PO_CATALOG_MAPPINGS AS mapping
    INNER JOIN dbo.BS_budget_catalog_sub_items AS subItem
      ON subItem.id = mapping.catalog_sub_item_id
    INNER JOIN dbo.BS_budget_catalog_items AS item
      ON item.id = subItem.catalog_item_id
    LEFT JOIN dbo.USERS AS createdUser
      ON createdUser.USER_ID = mapping.created_by
    LEFT JOIN dbo.USERS AS updatedUser
      ON updatedUser.USER_ID = mapping.updated_by
    LEFT JOIN dbo.USERS AS disabledUser
      ON disabledUser.USER_ID = mapping.disabled_by
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY mapping.is_active DESC, item.name ASC, subItem.name ASC, mapping.po_item_code ASC
  `);

  return result.recordset;
}

export async function findPOCatalogMappingBySubItemAndCodeRepo({
  catalogSubItemId,
  poItemCode,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("catalogSubItemId", sql.Int, catalogSubItemId)
    .input("poItemCode", sql.NVarChar(100), normalizeCode(poItemCode))
    .query(`
      SELECT TOP 1 *
      FROM dbo.BS_PO_CATALOG_MAPPINGS
      WHERE catalog_sub_item_id = @catalogSubItemId
        AND po_item_code = @poItemCode
    `);

  return result.recordset[0] || null;
}

export async function createManualPOCatalogMappingRepo(data) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("catalogSubItemId", sql.Int, data.catalog_sub_item_id)
    .input("poItemCode", sql.NVarChar(100), normalizeCode(data.po_item_code))
    .input("poItemDescription", sql.NVarChar(500), data.po_item_description || null)
    .input("createdBy", sql.Int, data.created_by)
    .query(`
      INSERT INTO dbo.BS_PO_CATALOG_MAPPINGS
      (
        catalog_sub_item_id,
        po_item_code,
        po_item_description,
        mapping_source,
        learned_count,
        created_by
      )
      OUTPUT INSERTED.id
      VALUES
      (
        @catalogSubItemId,
        @poItemCode,
        @poItemDescription,
        '${PO_MAPPING_SOURCE.MANUAL}',
        0,
        @createdBy
      )
    `);

  return result.recordset[0]?.id || null;
}

export async function setPOCatalogMappingStatusRepo({
  id,
  isActive,
  userId,
  reason = null,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("id", sql.BigInt, id)
    .input("isActive", sql.Bit, isActive)
    .input("userId", sql.Int, userId)
    .input("reason", sql.NVarChar(500), reason)
    .query(`
      UPDATE dbo.BS_PO_CATALOG_MAPPINGS
      SET
        is_active = @isActive,
        disabled_by = CASE WHEN @isActive = 0 THEN @userId ELSE NULL END,
        disabled_at = CASE WHEN @isActive = 0 THEN SYSUTCDATETIME() ELSE NULL END,
        disabled_reason = CASE WHEN @isActive = 0 THEN @reason ELSE NULL END,
        updated_by = @userId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      WHERE id = @id
    `);

  return result.recordset[0]?.id || null;
}

export async function findPOCatalogMappingByIdRepo(id) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("id", sql.BigInt, id)
    .query(`
      SELECT TOP 1 *
      FROM dbo.BS_PO_CATALOG_MAPPINGS
      WHERE id = @id
    `);

  return result.recordset[0] || null;
}

export async function searchCatalogSubItemsForMappingRepo({ search } = {}) {
  const pool = await poolPromise;
  const request = createRequest(pool);
  const where = ["subItem.is_active = 1", "item.is_active = 1"];

  if (search) {
    request.input("search", sql.NVarChar(200), `%${search}%`);
    where.push(`(
      item.name LIKE @search
      OR item.item_code LIKE @search
      OR subItem.name LIKE @search
      OR subItem.sub_item_code LIKE @search
    )`);
  }

  const result = await request.query(`
    SELECT TOP 50
      subItem.id,
      subItem.id AS catalog_sub_item_id,
      subItem.name,
      subItem.sub_item_code,
      item.id AS catalog_item_id,
      item.name AS catalog_item_name,
      item.item_code AS catalog_item_code,
      item.budget_category_id
    FROM dbo.BS_budget_catalog_sub_items AS subItem
    INNER JOIN dbo.BS_budget_catalog_items AS item
      ON item.id = subItem.catalog_item_id
    WHERE ${where.join(" AND ")}
    ORDER BY item.name ASC, subItem.name ASC
  `);

  return result.recordset;
}

export async function searchPOItemsForMappingRepo({ search } = {}) {
  const pool = await poolPromise;
  const request = createRequest(pool);
  const where = ["ITEM_CODE IS NOT NULL", "LTRIM(RTRIM(ITEM_CODE)) <> ''"];

  if (search) {
    request.input("search", sql.NVarChar(200), `%${search}%`);
    where.push(`(
      ITEM_CODE LIKE @search
      OR ITEM_DESC LIKE @search
      OR PARENT_ITEM_NAME LIKE @search
      OR SUPPLIER_NAME_EN LIKE @search
    )`);
  }

  const result = await request.query(`
    SELECT TOP 50
      LTRIM(RTRIM(ITEM_CODE)) AS po_item_code,
      MAX(ITEM_DESC) AS po_item_description,
      MAX(PARENT_ITEM_NAME) AS parent_item_name,
      COUNT(*) AS po_record_count,
      MAX(CREATED_AT) AS last_seen_at
    FROM dbo.BS_Purchase_Invoices_For_Budget
    WHERE ${where.join(" AND ")}
    GROUP BY LTRIM(RTRIM(ITEM_CODE))
    ORDER BY MAX(CREATED_AT) DESC
  `);

  return result.recordset;
}
