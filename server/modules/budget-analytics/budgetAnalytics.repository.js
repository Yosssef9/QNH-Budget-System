import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";

function addFinancialYearInput(request, financialYearId) {
  return request.input("financialYearId", sql.Int, financialYearId ?? null);
}

export async function listAnalyticsFinancialYearsRepo() {
  const pool = await poolPromise;
  const result = await createRequest(pool).query(`
    SELECT id, year, status, opened_at, pre_closed_at, closed_at
    FROM dbo.BS_financial_years
    ORDER BY year DESC;
  `);

  return result.recordset;
}

export async function listDepartmentBudgetAnalyticsRepo({ financialYearId }) {
  const pool = await poolPromise;
  const result = await addFinancialYearInput(
    createRequest(pool),
    financialYearId,
  ).query(`
    WITH itemSummary AS (
      SELECT
        dcb.department_budget_id,
        COUNT(DISTINCT item.id) AS items_count,
        COALESCE(SUM(item.requested_quantity), 0) AS requested_quantity,
        COALESCE(SUM(item.category_approved_quantity), 0) AS approved_quantity,
        MAX(item.reviewed_at) AS last_reviewed_at
      FROM dbo.BS_department_category_budget_items AS item
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id
      WHERE item.is_active = 1
      GROUP BY dcb.department_budget_id
    ),
    amountSummary AS (
      SELECT
        dcb.department_budget_id,
        COALESCE(SUM(allocation.allocated_quantity * COALESCE(subItem.unit_price, 0)), 0) AS approved_amount
      FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = allocation.category_budget_package_sub_item_id
       AND subItem.is_active = 1
      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.id = allocation.department_category_budget_item_id
       AND item.is_active = 1
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id
      GROUP BY dcb.department_budget_id
    ),
    categorySummary AS (
      SELECT
        dcb.department_budget_id,
        COUNT(1) AS category_count,
        SUM(CASE WHEN dcb.status <> 'DRAFT' THEN 1 ELSE 0 END) AS submitted_category_count,
        SUM(CASE WHEN dcb.status = 'CATEGORY_REVIEW_COMPLETED' THEN 1 ELSE 0 END) AS completed_category_count,
        SUM(CASE WHEN dcb.status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_category_count,
        MAX(dcb.submitted_at) AS last_submitted_at
      FROM dbo.BS_department_category_budgets AS dcb
      GROUP BY dcb.department_budget_id
    )
    SELECT
      db.id AS department_budget_id,
      db.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      dept.id AS department_id,
      dept.name AS department_name,
      dept.department_code,
      CASE
        WHEN COALESCE(categorySummary.completed_category_count, 0) >= 3
          THEN 'CATEGORY_REVIEW_COMPLETED'
        WHEN COALESCE(categorySummary.submitted_category_count, 0) > 0
          THEN 'IN_CATEGORY_REVIEW'
        ELSE 'DRAFT'
      END AS status,
      COALESCE(categorySummary.category_count, 0) AS category_count,
      COALESCE(categorySummary.submitted_category_count, 0) AS submitted_category_count,
      COALESCE(categorySummary.completed_category_count, 0) AS completed_category_count,
      COALESCE(categorySummary.draft_category_count, 0) AS draft_category_count,
      COALESCE(itemSummary.items_count, 0) AS items_count,
      COALESCE(itemSummary.requested_quantity, 0) AS requested_quantity,
      COALESCE(itemSummary.approved_quantity, 0) AS approved_quantity,
      COALESCE(amountSummary.approved_amount, 0) AS approved_amount,
      categorySummary.last_submitted_at,
      itemSummary.last_reviewed_at
    FROM dbo.BS_department_budgets AS db
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = db.financial_year_id
    INNER JOIN dbo.BS_departments AS dept
      ON dept.id = db.department_id
    LEFT JOIN itemSummary
      ON itemSummary.department_budget_id = db.id
    LEFT JOIN amountSummary
      ON amountSummary.department_budget_id = db.id
    LEFT JOIN categorySummary
      ON categorySummary.department_budget_id = db.id
    WHERE (@financialYearId IS NULL OR db.financial_year_id = @financialYearId)
    ORDER BY fy.year DESC, dept.name;
  `);

  return result.recordset;
}

export async function listCategoryPackageAnalyticsRepo({ financialYearId }) {
  const pool = await poolPromise;
  const result = await addFinancialYearInput(
    createRequest(pool),
    financialYearId,
  ).query(`
    WITH itemSummary AS (
      SELECT
        packageItem.category_budget_package_id,
        COUNT(1) AS package_item_count,
        SUM(CASE WHEN packageItem.needs_reconciliation = 1 THEN 1 ELSE 0 END) AS unreconciled_item_count,
        SUM(CASE WHEN packageItem.cfo_review_status = 'PENDING_CFO_REVIEW' THEN 1 ELSE 0 END) AS pending_cfo_item_count,
        SUM(CASE WHEN packageItem.cfo_review_status = 'CFO_ACCEPTED' THEN 1 ELSE 0 END) AS cfo_accepted_item_count,
        SUM(CASE WHEN packageItem.cfo_review_status = 'NEEDS_MODIFICATION' THEN 1 ELSE 0 END) AS needs_modification_item_count
      FROM dbo.BS_category_budget_package_items AS packageItem
      WHERE packageItem.is_active = 1
      GROUP BY packageItem.category_budget_package_id
    ),
    demandSummary AS (
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
    subItemSummary AS (
      SELECT
        packageItem.category_budget_package_id,
        COALESCE(SUM(subItem.quantity), 0) AS package_quantity,
        COALESCE(SUM(subItem.quantity * subItem.unit_price), 0) AS package_value,
        COUNT(1) AS package_sub_item_count
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1
      WHERE packageItem.is_active = 1
      GROUP BY packageItem.category_budget_package_id
    ),
    departmentCoverage AS (
      SELECT
        pkg.id AS package_id,
        COUNT(1) AS total_department_count,
        SUM(CASE WHEN dcb.status <> 'DRAFT' THEN 1 ELSE 0 END) AS submitted_department_count,
        SUM(CASE WHEN dcb.status = 'DRAFT' THEN 1 ELSE 0 END) AS not_submitted_department_count,
        SUM(CASE WHEN dcb.status = 'CATEGORY_REVIEW_COMPLETED' THEN 1 ELSE 0 END) AS completed_department_count
      FROM dbo.BS_category_budget_packages AS pkg
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.financial_year_id = pkg.financial_year_id
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.department_budget_id = db.id
       AND dcb.budget_category_id = pkg.budget_category_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
       AND dept.is_active = 1
      GROUP BY pkg.id
    )
    SELECT
      pkg.id AS package_id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.name AS category_name,
      category.category_code,
      pkg.status,
      pkg.submitted_to_cfo_at,
      pkg.returned_at,
      pkg.return_reason,
      pkg.cfo_review_completed_at,
      COALESCE(itemSummary.package_item_count, 0) AS package_item_count,
      COALESCE(itemSummary.unreconciled_item_count, 0) AS unreconciled_item_count,
      COALESCE(itemSummary.pending_cfo_item_count, 0) AS pending_cfo_item_count,
      COALESCE(itemSummary.cfo_accepted_item_count, 0) AS cfo_accepted_item_count,
      COALESCE(itemSummary.needs_modification_item_count, 0) AS needs_modification_item_count,
      COALESCE(demandSummary.requested_quantity, 0) AS requested_quantity,
      COALESCE(demandSummary.approved_quantity, 0) AS approved_quantity,
      COALESCE(subItemSummary.package_quantity, 0) AS package_quantity,
      COALESCE(subItemSummary.package_value, 0) AS package_value,
      COALESCE(subItemSummary.package_sub_item_count, 0) AS package_sub_item_count,
      COALESCE(departmentCoverage.total_department_count, 0) AS total_department_count,
      COALESCE(departmentCoverage.submitted_department_count, 0) AS submitted_department_count,
      COALESCE(departmentCoverage.not_submitted_department_count, 0) AS not_submitted_department_count,
      COALESCE(departmentCoverage.completed_department_count, 0) AS completed_department_count
    FROM dbo.BS_category_budget_packages AS pkg
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
    LEFT JOIN itemSummary
      ON itemSummary.category_budget_package_id = pkg.id
    LEFT JOIN demandSummary
      ON demandSummary.package_id = pkg.id
    LEFT JOIN subItemSummary
      ON subItemSummary.category_budget_package_id = pkg.id
    LEFT JOIN departmentCoverage
      ON departmentCoverage.package_id = pkg.id
    WHERE (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
    ORDER BY fy.year DESC, category.name;
  `);

  return result.recordset;
}

export async function listPackageItemAnalyticsRepo({ financialYearId }) {
  const pool = await poolPromise;
  const result = await addFinancialYearInput(
    createRequest(pool),
    financialYearId,
  ).query(`
    WITH demand AS (
      SELECT
        pkg.id AS package_id,
        item.catalog_item_id,
        COUNT(DISTINCT dept.id) AS department_count,
        COALESCE(SUM(item.requested_quantity), 0) AS requested_quantity,
        COALESCE(SUM(item.category_approved_quantity), 0) AS approved_quantity
      FROM dbo.BS_category_budget_packages AS pkg
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.financial_year_id = pkg.financial_year_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.department_budget_id = db.id
       AND dcb.budget_category_id = pkg.budget_category_id
       AND dcb.status = 'CATEGORY_REVIEW_COMPLETED'
      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.is_active = 1
       AND item.review_status = 'CATEGORY_REVIEW_COMPLETED'
      GROUP BY pkg.id, item.catalog_item_id
    ),
    subItems AS (
      SELECT
        packageItem.id AS package_item_id,
        COUNT(1) AS sub_item_count,
        COALESCE(SUM(subItem.quantity), 0) AS package_quantity,
        COALESCE(SUM(subItem.quantity * subItem.unit_price), 0) AS package_value
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1
      WHERE packageItem.is_active = 1
      GROUP BY packageItem.id
    )
    SELECT
      packageItem.id AS package_item_id,
      packageItem.category_budget_package_id AS package_id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.name AS category_name,
      category.category_code,
      packageItem.catalog_item_id,
      COALESCE(packageItem.catalog_item_name_snapshot, catalog.name) AS catalog_item_name,
      COALESCE(packageItem.catalog_item_code_snapshot, catalog.item_code) AS catalog_item_code,
      packageItem.needs_reconciliation,
      packageItem.cfo_review_status,
      packageItem.cfo_review_note,
      COALESCE(demand.department_count, 0) AS department_count,
      COALESCE(demand.requested_quantity, 0) AS requested_quantity,
      COALESCE(demand.approved_quantity, 0) AS approved_quantity,
      COALESCE(subItems.package_quantity, 0) AS package_quantity,
      COALESCE(subItems.package_value, 0) AS package_value,
      COALESCE(subItems.sub_item_count, 0) AS sub_item_count
    FROM dbo.BS_category_budget_package_items AS packageItem
    INNER JOIN dbo.BS_category_budget_packages AS pkg
      ON pkg.id = packageItem.category_budget_package_id
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
    INNER JOIN dbo.BS_budget_catalog_items AS catalog
      ON catalog.id = packageItem.catalog_item_id
    LEFT JOIN demand
      ON demand.package_id = pkg.id
     AND demand.catalog_item_id = packageItem.catalog_item_id
    LEFT JOIN subItems
      ON subItems.package_item_id = packageItem.id
    WHERE packageItem.is_active = 1
      AND (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
    ORDER BY fy.year DESC, category.name, COALESCE(packageItem.catalog_item_name_snapshot, catalog.name);
  `);

  return result.recordset;
}

export async function listPackageSubItemAnalyticsRepo({ financialYearId }) {
  const pool = await poolPromise;
  const result = await addFinancialYearInput(
    createRequest(pool),
    financialYearId,
  ).query(`
    WITH approvedPo AS (
      SELECT category_budget_package_sub_item_id, SUM(requested_qty) AS quantity, SUM(linked_amount) AS amount
      FROM dbo.BS_category_po_links
      WHERE status = 'APPROVED'
      GROUP BY category_budget_package_sub_item_id
    ),
    pendingPo AS (
      SELECT category_budget_package_sub_item_id, SUM(requested_qty) AS quantity, SUM(linked_amount) AS amount
      FROM dbo.BS_category_po_links
      WHERE status = 'PENDING'
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
    ),
    attachmentSummary AS (
      SELECT category_budget_package_sub_item_id, COUNT(1) AS attachment_count
      FROM dbo.BS_category_budget_package_sub_item_attachments
      WHERE is_active = 1
      GROUP BY category_budget_package_sub_item_id
    )
    SELECT
      subItem.id AS package_sub_item_id,
      packageItem.id AS package_item_id,
      pkg.id AS package_id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.name AS category_name,
      category.category_code,
      packageItem.catalog_item_id,
      COALESCE(packageItem.catalog_item_name_snapshot, catalog.name) AS catalog_item_name,
      subItem.catalog_sub_item_id,
      subItem.name AS sub_item_name,
      subItem.specification,
      subItem.quantity AS base_quantity,
      subItem.unit_price,
      subItem.quantity * subItem.unit_price AS base_value,
      COALESCE(approvedTransferIn.quantity, 0) AS approved_transfer_in_quantity,
      COALESCE(approvedTransferOut.quantity, 0) AS approved_transfer_out_quantity,
      COALESCE(pendingTransferOut.quantity, 0) AS pending_transfer_out_quantity,
      COALESCE(approvedPo.quantity, 0) AS approved_po_quantity,
      COALESCE(pendingPo.quantity, 0) AS pending_po_quantity,
      COALESCE(approvedPo.amount, 0) AS approved_po_amount,
      COALESCE(pendingPo.amount, 0) AS pending_po_amount,
      CAST(
        subItem.quantity
        + COALESCE(approvedTransferIn.quantity, 0)
        - COALESCE(approvedTransferOut.quantity, 0)
        - COALESCE(pendingTransferOut.quantity, 0)
        - COALESCE(approvedPo.quantity, 0)
        - COALESCE(pendingPo.quantity, 0)
        AS DECIMAL(24,12)
      ) AS available_quantity,
      COALESCE(attachmentSummary.attachment_count, 0) AS attachment_count
    FROM dbo.BS_category_budget_package_sub_items AS subItem
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
    LEFT JOIN approvedPo
      ON approvedPo.category_budget_package_sub_item_id = subItem.id
    LEFT JOIN pendingPo
      ON pendingPo.category_budget_package_sub_item_id = subItem.id
    LEFT JOIN approvedTransferIn
      ON approvedTransferIn.to_package_sub_item_id = subItem.id
    LEFT JOIN approvedTransferOut
      ON approvedTransferOut.from_package_sub_item_id = subItem.id
    LEFT JOIN pendingTransferOut
      ON pendingTransferOut.from_package_sub_item_id = subItem.id
    LEFT JOIN attachmentSummary
      ON attachmentSummary.category_budget_package_sub_item_id = subItem.id
    WHERE subItem.is_active = 1
      AND packageItem.is_active = 1
      AND (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
    ORDER BY fy.year DESC, category.name, COALESCE(packageItem.catalog_item_name_snapshot, catalog.name), subItem.name;
  `);

  return result.recordset;
}

export async function listDepartmentDemandAnalyticsRepo({ financialYearId }) {
  const pool = await poolPromise;
  const result = await addFinancialYearInput(
    createRequest(pool),
    financialYearId,
  ).query(`
    SELECT
      item.id AS department_item_id,
      db.id AS department_budget_id,
      dcb.id AS department_category_budget_id,
      db.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      dept.id AS department_id,
      dept.name AS department_name,
      dept.department_code,
      dcb.budget_category_id,
      category.name AS category_name,
      category.category_code,
      item.catalog_item_id,
      COALESCE(item.catalog_item_name_snapshot, catalog.name) AS catalog_item_name,
      COALESCE(item.catalog_item_code_snapshot, catalog.item_code) AS catalog_item_code,
      item.requested_quantity,
      item.category_approved_quantity AS approved_quantity,
      item.distribution_method,
      item.review_status,
      item.review_note,
      reviewer.USER_NAME AS reviewed_by_name,
      item.reviewed_at,
      COALESCE(allocationSummary.allocated_quantity, 0) AS allocated_quantity,
      COALESCE(allocationSummary.allocated_value, 0) AS approved_value,
      COALESCE(allocationSummary.model_count, 0) AS model_count
    FROM dbo.BS_department_category_budget_items AS item
    INNER JOIN dbo.BS_department_category_budgets AS dcb
      ON dcb.id = item.department_category_budget_id
    INNER JOIN dbo.BS_department_budgets AS db
      ON db.id = dcb.department_budget_id
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = db.financial_year_id
    INNER JOIN dbo.BS_departments AS dept
      ON dept.id = db.department_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = dcb.budget_category_id
    INNER JOIN dbo.BS_budget_catalog_items AS catalog
      ON catalog.id = item.catalog_item_id
    LEFT JOIN dbo.users AS reviewer
      ON reviewer.USER_ID = item.reviewed_by
    OUTER APPLY (
      SELECT
        SUM(allocation.allocated_quantity) AS allocated_quantity,
        SUM(allocation.allocated_quantity * COALESCE(subItem.unit_price, 0)) AS allocated_value,
        COUNT(DISTINCT subItem.id) AS model_count
      FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = allocation.category_budget_package_sub_item_id
       AND subItem.is_active = 1
      WHERE allocation.department_category_budget_item_id = item.id
    ) AS allocationSummary
    WHERE item.is_active = 1
      AND (@financialYearId IS NULL OR db.financial_year_id = @financialYearId)
    ORDER BY fy.year DESC, dept.name, category.name, COALESCE(item.catalog_item_name_snapshot, catalog.name);
  `);

  return result.recordset;
}

export async function listTransferAnalyticsRepo({ financialYearId }) {
  const pool = await poolPromise;
  const result = await addFinancialYearInput(
    createRequest(pool),
    financialYearId,
  ).query(`
    SELECT
      transfer.id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.name AS category_name,
      transfer.status,
      transfer.source_quantity,
      transfer.destination_quantity,
      transfer.reason,
      transfer.rejection_reason,
      transfer.requested_at,
      transfer.approved_at,
      transfer.rejected_at,
      fromCatalog.name AS from_item_name,
      fromSub.name AS from_sub_item_name,
      fromSub.unit_price AS from_unit_price,
      toCatalog.name AS to_item_name,
      toSub.name AS to_sub_item_name,
      toSub.unit_price AS to_unit_price,
      requester.USER_NAME AS requested_by_name,
      approver.USER_NAME AS approved_by_name,
      rejecter.USER_NAME AS rejected_by_name
    FROM dbo.BS_category_budget_transfers AS transfer
    INNER JOIN dbo.BS_category_budget_package_sub_items AS fromSub
      ON fromSub.id = transfer.from_package_sub_item_id
    INNER JOIN dbo.BS_category_budget_package_items AS fromPackageItem
      ON fromPackageItem.id = fromSub.category_budget_package_item_id
    INNER JOIN dbo.BS_budget_catalog_items AS fromCatalog
      ON fromCatalog.id = fromPackageItem.catalog_item_id
    INNER JOIN dbo.BS_category_budget_packages AS pkg
      ON pkg.id = fromPackageItem.category_budget_package_id
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = pkg.financial_year_id
    INNER JOIN dbo.BS_budget_categories AS category
      ON category.id = pkg.budget_category_id
    INNER JOIN dbo.BS_category_budget_package_sub_items AS toSub
      ON toSub.id = transfer.to_package_sub_item_id
    INNER JOIN dbo.BS_category_budget_package_items AS toPackageItem
      ON toPackageItem.id = toSub.category_budget_package_item_id
    INNER JOIN dbo.BS_budget_catalog_items AS toCatalog
      ON toCatalog.id = toPackageItem.catalog_item_id
    LEFT JOIN dbo.users AS requester
      ON requester.USER_ID = transfer.requested_by
    LEFT JOIN dbo.users AS approver
      ON approver.USER_ID = transfer.approved_by
    LEFT JOIN dbo.users AS rejecter
      ON rejecter.USER_ID = transfer.rejected_by
    WHERE (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
    ORDER BY transfer.requested_at DESC, transfer.id DESC;
  `);

  return result.recordset;
}

export async function listPoLinkAnalyticsRepo({ financialYearId }) {
  const pool = await poolPromise;
  const result = await addFinancialYearInput(
    createRequest(pool),
    financialYearId,
  ).query(`
    SELECT
      link.id,
      pkg.financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.budget_category_id,
      category.name AS category_name,
      category.category_code,
      link.category_budget_package_sub_item_id AS package_sub_item_id,
      link.status,
      link.requested_qty,
      link.unit_cost_snapshot AS unit_cost,
      link.linked_amount,
      link.requested_at,
      link.approved_at,
      link.rejected_at,
      link.rejection_reason,
      catalog.name AS catalog_item_name,
      subItem.name AS sub_item_name,
      po.INVOICE_NO AS invoice_no,
      po.ORDER_ID AS order_id,
      po.ITEM_CODE AS po_item_code,
      po.ITEM_DESC AS po_item_description,
      po.SUPPLIER_NAME_EN AS supplier_name,
      requester.USER_NAME AS requested_by_name,
      approver.USER_NAME AS approved_by_name,
      rejecter.USER_NAME AS rejected_by_name
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
    LEFT JOIN dbo.users AS requester
      ON requester.USER_ID = link.requested_by
    LEFT JOIN dbo.users AS approver
      ON approver.USER_ID = link.approved_by
    LEFT JOIN dbo.users AS rejecter
      ON rejecter.USER_ID = link.rejected_by
    WHERE (@financialYearId IS NULL OR pkg.financial_year_id = @financialYearId)
    ORDER BY link.requested_at DESC, link.id DESC;
  `);

  return result.recordset;
}
