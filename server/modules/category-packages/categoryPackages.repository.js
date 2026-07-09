import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import {
  CATEGORY_PACKAGE_ITEM_CFO_STATUS,
  CATEGORY_PACKAGE_STATUS,
  CATEGORY_SUBMISSION_WINDOW_STATUS,
  DEPARTMENT_REVIEW_STATUS,
} from "./categoryPackages.constants.js";

function requestFor(transaction) {
  return new sql.Request(transaction);
}

function bufferRowVersion(rowVersion) {
  return rowVersion ? Buffer.from(rowVersion).toString("base64") : null;
}

export async function findCurrentPackageForCategoryRepo(
  { budgetCategoryId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input(
    "budgetCategoryId",
    sql.Int,
    budgetCategoryId,
  ).query(`
      SELECT TOP 1
        pkg.id,
        pkg.financial_year_id,
        pkg.budget_category_id,
        pkg.status,
        pkg.submitted_to_cfo_by,
        submittedUser.USER_NAME AS submitted_to_cfo_by_name,
        pkg.submitted_to_cfo_at,
        pkg.returned_by_cfo,
        returnedUser.USER_NAME AS returned_by_cfo_name,
        pkg.returned_at,
        pkg.return_reason,
        pkg.cfo_review_completed_by,
        cfoUser.USER_NAME AS cfo_review_completed_by_name,
        pkg.cfo_review_completed_at,
        pkg.row_version,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        category.category_code,
        category.name AS category_name,
        window.id AS submission_window_id,
        window.status AS submission_window_status,
        window.closed_at AS submission_window_closed_at,
        window.close_reason AS submission_window_close_reason
      FROM dbo.BS_category_budget_packages AS pkg
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = pkg.budget_category_id
      LEFT JOIN dbo.BS_category_submission_windows AS window
        ON window.financial_year_id = pkg.financial_year_id
       AND window.budget_category_id = pkg.budget_category_id
      LEFT JOIN dbo.users AS submittedUser
        ON submittedUser.USER_ID = pkg.submitted_to_cfo_by
      LEFT JOIN dbo.users AS returnedUser
        ON returnedUser.USER_ID = pkg.returned_by_cfo
      LEFT JOIN dbo.users AS cfoUser
        ON cfoUser.USER_ID = pkg.cfo_review_completed_by
      WHERE pkg.budget_category_id = @budgetCategoryId
        AND fy.status = 'OPEN'
      ORDER BY fy.year DESC, pkg.id DESC;
    `);

  const row = result.recordset[0] || null;
  if (row) row.row_version = bufferRowVersion(row.row_version);
  return row;
}

export async function listPackageItemsRepo({ packageId }, transaction = null) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("packageId", sql.BigInt, packageId).query(`
    WITH demand AS (
      SELECT
        item.catalog_item_id,
        COUNT(DISTINCT dcb.id) AS department_count,
        COALESCE(SUM(item.requested_quantity), 0) AS requested_quantity,
        COALESCE(SUM(item.category_approved_quantity), 0) AS approved_quantity
      FROM dbo.BS_department_category_budget_items AS item
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.financial_year_id = db.financial_year_id
       AND pkg.budget_category_id = dcb.budget_category_id
      WHERE pkg.id = @packageId
        AND item.is_active = 1
        AND item.review_status = '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'
        AND dcb.status = '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'
      GROUP BY item.catalog_item_id
    ),
    allocated AS (
      SELECT
        packageItem.id AS package_item_id,
        COALESCE(SUM(allocation.allocated_quantity), 0) AS allocated_quantity
      FROM dbo.BS_category_budget_package_items AS packageItem
      LEFT JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1
      LEFT JOIN dbo.BS_category_budget_package_sub_item_allocations AS allocation
        ON allocation.category_budget_package_sub_item_id = subItem.id
      WHERE packageItem.category_budget_package_id = @packageId
      GROUP BY packageItem.id
    ),
    activeSubItems AS (
      SELECT
        subItem.category_budget_package_item_id AS package_item_id,
        COUNT(1) AS active_sub_item_count
      FROM dbo.BS_category_budget_package_sub_items AS subItem
      WHERE subItem.is_active = 1
      GROUP BY subItem.category_budget_package_item_id
    ),
    valueTotals AS (
      SELECT
        subItem.category_budget_package_item_id AS package_item_id,
        COALESCE(SUM(subItem.quantity * subItem.unit_price), 0) AS estimated_total
      FROM dbo.BS_category_budget_package_sub_items AS subItem
      WHERE subItem.is_active = 1
      GROUP BY subItem.category_budget_package_item_id
    ),
    departmentAllocation AS (
      SELECT
        packageItem.id AS package_item_id,
        item.id AS department_item_id,
        item.category_approved_quantity AS approved_quantity,
        COALESCE(SUM(allocation.allocated_quantity), 0) AS allocated_quantity
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.financial_year_id = pkg.financial_year_id
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.department_budget_id = db.id
       AND dcb.budget_category_id = pkg.budget_category_id
       AND dcb.status = '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'
      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.catalog_item_id = packageItem.catalog_item_id
       AND item.is_active = 1
       AND item.review_status = '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'
      LEFT JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1
      LEFT JOIN dbo.BS_category_budget_package_sub_item_allocations AS allocation
        ON allocation.category_budget_package_sub_item_id = subItem.id
       AND allocation.department_category_budget_item_id = item.id
      WHERE packageItem.category_budget_package_id = @packageId
        AND packageItem.is_active = 1
      GROUP BY
        packageItem.id,
        item.id,
        item.category_approved_quantity
    ),
    departmentMismatches AS (
      SELECT
        package_item_id,
        COUNT(1) AS mismatch_count
      FROM departmentAllocation
      WHERE ROUND(approved_quantity, 4) <> ROUND(allocated_quantity, 4)
      GROUP BY package_item_id
    )
    SELECT
      packageItem.id,
      packageItem.category_budget_package_id,
      packageItem.catalog_item_id,
      catalog.name AS catalog_item_name,
      catalog.item_code AS catalog_item_code,
      packageItem.cfo_review_status,
      packageItem.cfo_review_note,
      CASE
        WHEN COALESCE(demand.approved_quantity, 0) > 0
         AND COALESCE(activeSubItems.active_sub_item_count, 0) = 0
        THEN 1
        WHEN ROUND(COALESCE(demand.approved_quantity, 0), 4) <>
             ROUND(COALESCE(allocated.allocated_quantity, 0), 4)
        THEN 1
        WHEN COALESCE(departmentMismatches.mismatch_count, 0) > 0
        THEN 1
        ELSE 0
      END AS needs_reconciliation,
      packageItem.row_version,
      COALESCE(demand.department_count, 0) AS department_count,
      COALESCE(demand.requested_quantity, 0) AS requested_quantity,
      COALESCE(demand.approved_quantity, 0) AS approved_quantity,
      COALESCE(allocated.allocated_quantity, 0) AS allocated_quantity,
      COALESCE(valueTotals.estimated_total, 0) AS estimated_total,
      COALESCE(activeSubItems.active_sub_item_count, 0) AS active_sub_item_count
    FROM dbo.BS_category_budget_package_items AS packageItem
    INNER JOIN dbo.BS_budget_catalog_items AS catalog
      ON catalog.id = packageItem.catalog_item_id
    LEFT JOIN demand
      ON demand.catalog_item_id = packageItem.catalog_item_id
    LEFT JOIN allocated
      ON allocated.package_item_id = packageItem.id
    LEFT JOIN activeSubItems
      ON activeSubItems.package_item_id = packageItem.id
    LEFT JOIN valueTotals
      ON valueTotals.package_item_id = packageItem.id
    LEFT JOIN departmentMismatches
      ON departmentMismatches.package_item_id = packageItem.id
    WHERE packageItem.category_budget_package_id = @packageId
      AND packageItem.is_active = 1
    ORDER BY
      CASE
        WHEN COALESCE(demand.approved_quantity, 0) > 0
         AND COALESCE(activeSubItems.active_sub_item_count, 0) = 0
        THEN 0
        WHEN ROUND(COALESCE(demand.approved_quantity, 0), 4) <>
             ROUND(COALESCE(allocated.allocated_quantity, 0), 4)
        THEN 0
        WHEN COALESCE(departmentMismatches.mismatch_count, 0) > 0
        THEN 0
        ELSE 1
      END,
      catalog.name;
  `);

  return result.recordset.map((row) => ({
    ...row,
    row_version: bufferRowVersion(row.row_version),
  }));
}

export async function listDepartmentPackageViewRowsRepo(
  { packageId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);

  const result = await request.input("packageId", sql.BigInt, packageId).query(`
      SELECT
        dept.id AS department_id,
        dept.name AS department_name,
        dept.department_code,

        item.id AS department_item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.review_note,
        item.row_version AS department_item_row_version,

        catalog.name AS catalog_item_name,
        catalog.item_code AS catalog_item_code,

        packageItem.id AS package_item_id,
        packageItem.needs_reconciliation,
        packageItem.cfo_review_status,
        packageItem.cfo_review_note,
        packageItem.row_version AS package_item_row_version,

        subItem.id AS package_sub_item_id,
        subItem.catalog_sub_item_id,
        subItem.name AS package_sub_item_name,
        subItem.specification AS package_sub_item_specification,
        subItem.unit_price,
        subItem.quantity AS package_sub_item_quantity,
        subItem.row_version AS package_sub_item_row_version,

        unit.name AS unit_of_measure_name,
        unit.unit_code AS unit_of_measure_code,

        allocation.id AS allocation_id,
        allocation.allocated_quantity,
        allocation.row_version AS allocation_row_version

      FROM dbo.BS_category_budget_packages AS pkg

      INNER JOIN dbo.BS_department_budgets AS departmentBudget
        ON departmentBudget.financial_year_id = pkg.financial_year_id

      INNER JOIN dbo.BS_department_category_budgets AS departmentCategoryBudget
        ON departmentCategoryBudget.department_budget_id = departmentBudget.id
       AND departmentCategoryBudget.budget_category_id = pkg.budget_category_id
       AND departmentCategoryBudget.status =
         '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'

      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = departmentCategoryBudget.id
       AND item.is_active = 1
       AND item.review_status =
         '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'

      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = departmentBudget.department_id

      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.id = item.catalog_item_id

      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.category_budget_package_id = pkg.id
       AND packageItem.catalog_item_id = item.catalog_item_id
       AND packageItem.is_active = 1

      LEFT JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1

      LEFT JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = subItem.unit_of_measure_id

      LEFT JOIN dbo.BS_category_budget_package_sub_item_allocations AS allocation
        ON allocation.category_budget_package_sub_item_id = subItem.id
       AND allocation.department_category_budget_item_id = item.id

      WHERE pkg.id = @packageId

      ORDER BY
        dept.name,
        catalog.name,
        subItem.name;
    `);

  return result.recordset.map((row) => ({
    ...row,
    department_item_row_version: bufferRowVersion(
      row.department_item_row_version,
    ),
    package_item_row_version: bufferRowVersion(row.package_item_row_version),
    package_sub_item_row_version: bufferRowVersion(
      row.package_sub_item_row_version,
    ),
    allocation_row_version: bufferRowVersion(row.allocation_row_version),
  }));
}

export async function listPackageItemDetailRowsRepo(
  { packageItemId },
  transaction = null,
) {
  const pool = await poolPromise;

  const subItems = await createRequest(pool, transaction).input(
    "packageItemId",
    sql.BigInt,
    packageItemId,
  ).query(`
      SELECT
        subItem.id,
        subItem.category_budget_package_item_id,
        subItem.catalog_sub_item_id,
        subItem.name,
        subItem.specification,
        subItem.unit_of_measure_id,

        unit.name AS unit_of_measure_name,
        unit.unit_code AS unit_of_measure_code,

        subItem.quantity,
        subItem.unit_price,
        subItem.note,
        subItem.is_active,
        subItem.row_version,

        catalogSub.sub_item_code,
        catalogSub.is_default_general,

        COUNT(attachment.id) AS attachment_count

      FROM dbo.BS_category_budget_package_sub_items AS subItem

      INNER JOIN dbo.BS_budget_catalog_sub_items AS catalogSub
        ON catalogSub.id = subItem.catalog_sub_item_id

      INNER JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = subItem.unit_of_measure_id

      LEFT JOIN dbo.BS_category_budget_package_sub_item_attachments AS attachment
        ON attachment.category_budget_package_sub_item_id = subItem.id
       AND attachment.is_active = 1

      WHERE subItem.category_budget_package_item_id = @packageItemId
        AND subItem.is_active = 1

      GROUP BY
        subItem.id,
        subItem.category_budget_package_item_id,
        subItem.catalog_sub_item_id,
        subItem.name,
        subItem.specification,
        subItem.unit_of_measure_id,

        unit.name,
        unit.unit_code,

        subItem.quantity,
        subItem.unit_price,
        subItem.note,
        subItem.is_active,
        subItem.row_version,

        catalogSub.sub_item_code,
        catalogSub.is_default_general

      ORDER BY
        catalogSub.is_default_general DESC,
        subItem.name;
    `);

  const departments = await createRequest(pool, transaction).input(
    "packageItemId",
    sql.BigInt,
    packageItemId,
  ).query(`
      SELECT
        item.id AS department_item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.review_note,
        item.row_version,

        dept.id AS department_id,
        dept.name AS department_name,
        dept.department_code,

        COALESCE(
          SUM(allocation.allocated_quantity),
          0
        ) AS allocated_quantity

      FROM dbo.BS_category_budget_package_items AS packageItem

      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = packageItem.category_budget_package_id

      INNER JOIN dbo.BS_department_budgets AS db
        ON db.financial_year_id = pkg.financial_year_id

      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.department_budget_id = db.id
       AND dcb.budget_category_id = pkg.budget_category_id

      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.department_category_budget_id = dcb.id
       AND item.catalog_item_id = packageItem.catalog_item_id
       AND item.is_active = 1
       AND item.review_status =
         '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'

      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id

      LEFT JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1

      LEFT JOIN dbo.BS_category_budget_package_sub_item_allocations AS allocation
        ON allocation.category_budget_package_sub_item_id = subItem.id
       AND allocation.department_category_budget_item_id = item.id

      WHERE packageItem.id = @packageItemId
        AND packageItem.is_active = 1
        AND dcb.status =
          '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'

      GROUP BY
        item.id,
        item.department_category_budget_id,
        item.catalog_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.review_note,
        item.row_version,

        dept.id,
        dept.name,
        dept.department_code

      ORDER BY
        dept.name;
    `);

  return {
    subItems: subItems.recordset.map((row) => ({
      ...row,
      row_version: bufferRowVersion(row.row_version),
    })),

    departments: departments.recordset.map((row) => ({
      ...row,
      row_version: bufferRowVersion(row.row_version),
    })),
  };
}

export async function listAllocationsForPackageItemRepo(
  { packageItemId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("packageItemId", sql.BigInt, packageItemId)
    .query(`
      SELECT
        allocation.id,
        allocation.category_budget_package_sub_item_id,
        allocation.department_category_budget_item_id,
        allocation.allocated_quantity,
        allocation.row_version
      FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = allocation.category_budget_package_sub_item_id
      WHERE subItem.category_budget_package_item_id = @packageItemId
        AND subItem.is_active = 1;
    `);

  return result.recordset.map((row) => ({
    ...row,
    row_version: bufferRowVersion(row.row_version),
  }));
}

export async function findPackageContextByItemRepo(
  { packageItemId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("packageItemId", sql.BigInt, packageItemId)
    .query(`
      SELECT TOP 1
        packageItem.id AS package_item_id,
        packageItem.catalog_item_id,
        packageItem.needs_reconciliation,
        packageItem.cfo_review_status,
        packageItem.row_version AS package_item_row_version,
        pkg.id AS package_id,
        pkg.financial_year_id,
        pkg.budget_category_id,
        pkg.status AS package_status,
        pkg.row_version AS package_row_version,
        fy.status AS financial_year_status,
        category.name AS category_name,
        category.category_code,
        window.status AS submission_window_status
      FROM dbo.BS_category_budget_package_items AS packageItem WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = pkg.budget_category_id
      LEFT JOIN dbo.BS_category_submission_windows AS window
        ON window.financial_year_id = pkg.financial_year_id
       AND window.budget_category_id = pkg.budget_category_id
      WHERE packageItem.id = @packageItemId
        AND packageItem.is_active = 1;
    `);

  const row = result.recordset[0] || null;
  if (row) {
    row.package_item_row_version = bufferRowVersion(
      row.package_item_row_version,
    );
    row.package_row_version = bufferRowVersion(row.package_row_version);
  }
  return row;
}

export async function findPackageContextBySubItemRepo(
  { packageSubItemId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input(
    "packageSubItemId",
    sql.BigInt,
    packageSubItemId,
  ).query(`
      SELECT TOP 1
        subItem.id AS package_sub_item_id,
        subItem.category_budget_package_item_id AS package_item_id,
        subItem.catalog_sub_item_id,
        subItem.name,
        subItem.quantity,
        subItem.unit_price,
        subItem.row_version AS package_sub_item_row_version,
        packageItem.catalog_item_id,
        packageItem.cfo_review_status,
        packageItem.row_version AS package_item_row_version,
        pkg.id AS package_id,
        pkg.financial_year_id,
        pkg.budget_category_id,
        pkg.status AS package_status,
        fy.status AS financial_year_status,
        window.status AS submission_window_status
      FROM dbo.BS_category_budget_package_sub_items AS subItem WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem WITH (UPDLOCK, HOLDLOCK)
        ON packageItem.id = subItem.category_budget_package_item_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      LEFT JOIN dbo.BS_category_submission_windows AS window
        ON window.financial_year_id = pkg.financial_year_id
       AND window.budget_category_id = pkg.budget_category_id
      WHERE subItem.id = @packageSubItemId
        AND subItem.is_active = 1
        AND packageItem.is_active = 1;
    `);

  const row = result.recordset[0] || null;
  if (row) {
    row.package_sub_item_row_version = bufferRowVersion(
      row.package_sub_item_row_version,
    );
    row.package_item_row_version = bufferRowVersion(
      row.package_item_row_version,
    );
  }
  return row;
}

function mapAttachmentRow(row) {
  return {
    ...row,
    row_version: bufferRowVersion(row.row_version),
  };
}

export async function listPackageSubItemAttachmentsRepo(
  { packageSubItemId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input(
    "packageSubItemId",
    sql.BigInt,
    packageSubItemId,
  ).query(`
      SELECT
        attachment.id,
        attachment.category_budget_package_sub_item_id,
        attachment.document_type,
        attachment.original_file_name,
        attachment.storage_key,
        attachment.mime_type,
        attachment.file_size_bytes,
        attachment.description,
        attachment.uploaded_by,
        uploadedUser.USER_NAME AS uploaded_by_name,
        attachment.uploaded_at,
        attachment.row_version
      FROM dbo.BS_category_budget_package_sub_item_attachments AS attachment
      LEFT JOIN dbo.users AS uploadedUser
        ON uploadedUser.USER_ID = attachment.uploaded_by
      WHERE attachment.category_budget_package_sub_item_id = @packageSubItemId
        AND attachment.is_active = 1
      ORDER BY attachment.uploaded_at DESC, attachment.id DESC;
    `);

  return result.recordset.map(mapAttachmentRow);
}

export async function findPackageAttachmentContextRepo(
  { packageSubItemId, attachmentId },
  transaction = null,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .input("attachmentId", sql.BigInt, attachmentId).query(`
      SELECT TOP 1
        attachment.id,
        attachment.category_budget_package_sub_item_id,
        attachment.document_type,
        attachment.original_file_name,
        attachment.storage_key,
        attachment.mime_type,
        attachment.file_size_bytes,
        attachment.description,
        attachment.uploaded_by,
        uploadedUser.USER_NAME AS uploaded_by_name,
        attachment.uploaded_at,
        attachment.row_version,
        subItem.category_budget_package_item_id AS package_item_id,
        packageItem.category_budget_package_id AS package_id,
        packageItem.cfo_review_status,
        pkg.financial_year_id,
        pkg.budget_category_id,
        pkg.status AS package_status,
        fy.status AS financial_year_status
      FROM dbo.BS_category_budget_package_sub_item_attachments AS attachment
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = attachment.category_budget_package_sub_item_id
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.id = subItem.category_budget_package_item_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      LEFT JOIN dbo.users AS uploadedUser
        ON uploadedUser.USER_ID = attachment.uploaded_by
      WHERE attachment.id = @attachmentId
        AND attachment.category_budget_package_sub_item_id = @packageSubItemId
        AND attachment.is_active = 1
        AND subItem.is_active = 1
        AND packageItem.is_active = 1;
    `);

  const row = result.recordset[0] || null;
  return row ? mapAttachmentRow(row) : null;
}

export async function createPackageSubItemAttachmentRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageSubItemId", sql.BigInt, payload.package_sub_item_id)
    .input("documentType", sql.VarChar(50), payload.document_type ?? null)
    .input("originalFileName", sql.NVarChar(300), payload.original_file_name)
    .input("storageKey", sql.NVarChar(500), payload.storage_key)
    .input("mimeType", sql.NVarChar(150), payload.mime_type ?? null)
    .input("fileSizeBytes", sql.BigInt, payload.file_size_bytes)
    .input("description", sql.NVarChar(500), payload.description ?? null)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_category_budget_package_sub_item_attachments
      (
        category_budget_package_sub_item_id,
        document_type,
        original_file_name,
        storage_key,
        mime_type,
        file_size_bytes,
        description,
        is_active,
        uploaded_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @packageSubItemId,
        @documentType,
        @originalFileName,
        @storageKey,
        @mimeType,
        @fileSizeBytes,
        @description,
        1,
        @actorUserId
      );

      SELECT
        attachment.id,
        attachment.category_budget_package_sub_item_id,
        attachment.document_type,
        attachment.original_file_name,
        attachment.storage_key,
        attachment.mime_type,
        attachment.file_size_bytes,
        attachment.description,
        attachment.uploaded_by,
        uploadedUser.USER_NAME AS uploaded_by_name,
        attachment.uploaded_at,
        attachment.row_version
      FROM dbo.BS_category_budget_package_sub_item_attachments AS attachment
      LEFT JOIN dbo.users AS uploadedUser
        ON uploadedUser.USER_ID = attachment.uploaded_by
      INNER JOIN @Inserted AS inserted ON inserted.id = attachment.id;
    `);

  const row = result.recordset[0] || null;
  return row ? mapAttachmentRow(row) : null;
}

export async function deactivatePackageSubItemAttachmentRepo(
  transaction,
  payload,
) {
  const result = await requestFor(transaction)
    .input("packageSubItemId", sql.BigInt, payload.package_sub_item_id)
    .input("attachmentId", sql.BigInt, payload.attachment_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("reason", sql.NVarChar(500), payload.reason).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_budget_package_sub_item_attachments
      SET
        is_active = 0,
        disabled_by = @actorUserId,
        disabled_at = SYSUTCDATETIME(),
        disabled_reason = @reason
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @attachmentId
        AND category_budget_package_sub_item_id = @packageSubItemId
        AND row_version = @rowVersion
        AND is_active = 1;

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function findCatalogSubItemForPackageRepo(
  { packageItemId, catalogSubItemId },
  transaction,
) {
  const result = await requestFor(transaction)
    .input("packageItemId", sql.BigInt, packageItemId)
    .input("catalogSubItemId", sql.Int, catalogSubItemId).query(`
      SELECT TOP 1
        catalogSub.id,
        catalogSub.catalog_item_id,
        catalogSub.name,
        catalogSub.default_specification,
        catalogSub.default_unit_of_measure_id,
        packageItem.id AS package_item_id
      FROM dbo.BS_budget_catalog_sub_items AS catalogSub
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.catalog_item_id = catalogSub.catalog_item_id
      WHERE packageItem.id = @packageItemId
        AND catalogSub.id = @catalogSubItemId
        AND catalogSub.is_active = 1;
    `);

  return result.recordset[0] || null;
}

export async function createPackageSubItemRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageItemId", sql.BigInt, payload.package_item_id)
    .input("catalogSubItemId", sql.Int, payload.catalog_sub_item_id)
    .input("name", sql.NVarChar(300), payload.name)
    .input("specification", sql.NVarChar(2000), payload.specification ?? null)
    .input("unitOfMeasureId", sql.Int, payload.unit_of_measure_id)
    .input("unitPrice", sql.Decimal(18, 6), payload.unit_price ?? null)
    .input("note", sql.NVarChar(1000), payload.note ?? null)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);

      INSERT INTO dbo.BS_category_budget_package_sub_items
      (
        category_budget_package_item_id,
        catalog_sub_item_id,
        name,
        specification,
        unit_of_measure_id,
        quantity,
        unit_price,
        note,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @packageItemId,
        @catalogSubItemId,
        @name,
        @specification,
        @unitOfMeasureId,
        0,
        @unitPrice,
        @note,
        1,
        @actorUserId
      );

      SELECT id FROM @Inserted;
    `);

  return result.recordset[0] || null;
}

export async function updatePackageSubItemRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageSubItemId", sql.BigInt, payload.package_sub_item_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("unitPrice", sql.Decimal(18, 6), payload.unit_price ?? null)
    .input("specification", sql.NVarChar(2000), payload.specification ?? null)
    .input("note", sql.NVarChar(1000), payload.note ?? null)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_budget_package_sub_items
      SET
        unit_price = @unitPrice,
        specification = @specification,
        note = @note,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @packageSubItemId
        AND row_version = @rowVersion
        AND is_active = 1;

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function countAllocationsForSubItemRepo(
  { packageSubItemId },
  transaction,
) {
  const result = await requestFor(transaction).input(
    "packageSubItemId",
    sql.BigInt,
    packageSubItemId,
  ).query(`
      SELECT
        COUNT(*) AS allocation_count,
        COALESCE(SUM(allocated_quantity), 0) AS allocated_quantity
      FROM dbo.BS_category_budget_package_sub_item_allocations
      WHERE category_budget_package_sub_item_id = @packageSubItemId;
    `);

  return result.recordset[0] || { allocation_count: 0, allocated_quantity: 0 };
}

export async function deactivatePackageSubItemRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageSubItemId", sql.BigInt, payload.package_sub_item_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE (id BIGINT NOT NULL);

      UPDATE dbo.BS_category_budget_package_sub_items
      SET
        is_active = 0,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @packageSubItemId
        AND row_version = @rowVersion
        AND is_active = 1;

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function deleteAllocationsForDepartmentItemRepo(
  transaction,
  { departmentItemId, packageItemId },
) {
  await requestFor(transaction)
    .input("departmentItemId", sql.BigInt, departmentItemId)
    .input("packageItemId", sql.BigInt, packageItemId).query(`
      DELETE allocation
      FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = allocation.category_budget_package_sub_item_id
      WHERE allocation.department_category_budget_item_id = @departmentItemId
        AND subItem.category_budget_package_item_id = @packageItemId;
    `);
}

export async function upsertAllocationRepo(transaction, payload) {
  await requestFor(transaction)
    .input("packageSubItemId", sql.BigInt, payload.package_sub_item_id)
    .input("departmentItemId", sql.BigInt, payload.department_item_id)
    .input("allocatedQuantity", sql.Decimal(18, 4), payload.allocated_quantity)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      IF EXISTS (
        SELECT 1
        FROM dbo.BS_category_budget_package_sub_item_allocations WITH (UPDLOCK, HOLDLOCK)
        WHERE category_budget_package_sub_item_id = @packageSubItemId
          AND department_category_budget_item_id = @departmentItemId
      )
      BEGIN
        UPDATE dbo.BS_category_budget_package_sub_item_allocations
        SET
          allocated_quantity = @allocatedQuantity,
          updated_by = @actorUserId,
          updated_at = SYSUTCDATETIME()
        WHERE category_budget_package_sub_item_id = @packageSubItemId
          AND department_category_budget_item_id = @departmentItemId;
      END
      ELSE
      BEGIN
        INSERT INTO dbo.BS_category_budget_package_sub_item_allocations
        (
          category_budget_package_sub_item_id,
          department_category_budget_item_id,
          allocated_quantity,
          created_by
        )
        VALUES
        (
          @packageSubItemId,
          @departmentItemId,
          @allocatedQuantity,
          @actorUserId
        );
      END
    `);
}

export async function recalculatePackageSubItemQuantitiesRepo(
  transaction,
  { packageItemId, actorUserId },
) {
  await requestFor(transaction)
    .input("packageItemId", sql.BigInt, packageItemId)
    .input("actorUserId", sql.Int, actorUserId).query(`
      UPDATE subItem
      SET
        quantity = COALESCE(allocations.allocated_quantity, 0),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      FROM dbo.BS_category_budget_package_sub_items AS subItem
      OUTER APPLY (
        SELECT SUM(allocation.allocated_quantity) AS allocated_quantity
        FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
        WHERE allocation.category_budget_package_sub_item_id = subItem.id
      ) AS allocations
      WHERE subItem.category_budget_package_item_id = @packageItemId
        AND subItem.is_active = 1;
    `);
}

export async function updatePackageItemReconciliationRepo(
  transaction,
  { packageItemId, actorUserId },
) {
  await requestFor(transaction)
    .input("packageItemId", sql.BigInt, packageItemId)
    .input("actorUserId", sql.Int, actorUserId).query(`
      WITH totals AS (
        SELECT
          packageItem.id,
          COALESCE(approved.approved_quantity, 0) AS approved_quantity,
          COALESCE(packageQty.package_quantity, 0) AS package_quantity
        FROM dbo.BS_category_budget_package_items AS packageItem
        INNER JOIN dbo.BS_category_budget_packages AS pkg
          ON pkg.id = packageItem.category_budget_package_id
        OUTER APPLY (
          SELECT SUM(item.category_approved_quantity) AS approved_quantity
          FROM dbo.BS_department_budgets AS db
          INNER JOIN dbo.BS_department_category_budgets AS dcb
            ON dcb.department_budget_id = db.id
           AND dcb.budget_category_id = pkg.budget_category_id
           AND dcb.status = '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'
          INNER JOIN dbo.BS_department_category_budget_items AS item
            ON item.department_category_budget_id = dcb.id
           AND item.catalog_item_id = packageItem.catalog_item_id
           AND item.is_active = 1
           AND item.review_status = '${DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED}'
          WHERE db.financial_year_id = pkg.financial_year_id
        ) AS approved
        OUTER APPLY (
          SELECT SUM(subItem.quantity) AS package_quantity
          FROM dbo.BS_category_budget_package_sub_items AS subItem
          WHERE subItem.category_budget_package_item_id = packageItem.id
            AND subItem.is_active = 1
        ) AS packageQty
        WHERE packageItem.id = @packageItemId
      )
      UPDATE packageItem
      SET
        needs_reconciliation =
          CASE
            WHEN ROUND(totals.approved_quantity, 4) = ROUND(totals.package_quantity, 4)
            THEN 0
            ELSE 1
          END,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN totals ON totals.id = packageItem.id
      WHERE packageItem.id = @packageItemId;
    `);
}

export async function deleteAllocationsForSubItemRepo(
  transaction,
  { packageSubItemId },
) {
  await requestFor(transaction).input(
    "packageSubItemId",
    sql.BigInt,
    packageSubItemId,
  ).query(`
      DELETE FROM dbo.BS_category_budget_package_sub_item_allocations
      WHERE category_budget_package_sub_item_id = @packageSubItemId;
    `);
}

export async function findDepartmentItemPackageEditContextRepo(
  { departmentItemId },
  transaction,
) {
  const result = await requestFor(transaction).input(
    "departmentItemId",
    sql.BigInt,
    departmentItemId,
  ).query(`
      SELECT TOP 1
        item.id AS department_item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.review_status,
        item.review_note,
        item.row_version AS department_item_row_version,

        dcb.status AS department_category_budget_status,
       dcb.budget_category_id AS department_budget_category_id,

        category.name AS category_name,

        db.financial_year_id,
        db.department_id,

        dept.name AS department_name,

        catalog.name AS catalog_item_name,

        packageItem.id AS package_item_id,
        packageItem.cfo_review_status,
        packageItem.cfo_review_note,

       pkg.id AS package_id,
      pkg.budget_category_id AS budget_category_id,
      pkg.status AS package_status,
        pkg.row_version AS package_row_version,

        fy.year AS financial_year,
        fy.status AS financial_year_status

      FROM dbo.BS_department_category_budget_items AS item WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_department_category_budgets AS dcb WITH (UPDLOCK, HOLDLOCK)
        ON dcb.id = item.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = dcb.budget_category_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalog
        ON catalog.id = item.catalog_item_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.financial_year_id = db.financial_year_id
       AND pkg.budget_category_id = dcb.budget_category_id
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem WITH (UPDLOCK, HOLDLOCK)
        ON packageItem.category_budget_package_id = pkg.id
       AND packageItem.catalog_item_id = item.catalog_item_id
       AND packageItem.is_active = 1
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id
      WHERE item.id = @departmentItemId
        AND item.is_active = 1;
    `);

  const row = result.recordset[0] || null;
  if (row) {
    row.department_item_row_version = bufferRowVersion(
      row.department_item_row_version,
    );
    row.package_row_version = bufferRowVersion(row.package_row_version);
  }
  return row;
}

export async function updateDepartmentApprovedQuantityForPackageRepo(
  transaction,
  payload,
) {
  const result = await requestFor(transaction)
    .input("departmentItemId", sql.BigInt, payload.department_item_id)
    .input(
      "approvedQuantity",
      sql.Decimal(18, 4),
      payload.category_approved_quantity,
    )
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE
      (
        id BIGINT NOT NULL,
        old_approved_quantity DECIMAL(18,4) NULL,
        new_approved_quantity DECIMAL(18,4) NULL
      );

      UPDATE dbo.BS_department_category_budget_items
      SET
        category_approved_quantity = @approvedQuantity,
        reviewed_by = @actorUserId,
        reviewed_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT
        INSERTED.id,
        DELETED.category_approved_quantity,
        INSERTED.category_approved_quantity
      INTO @Updated
      (
        id,
        old_approved_quantity,
        new_approved_quantity
      )
      WHERE id = @departmentItemId
        AND is_active = 1
        AND row_version = @rowVersion;

      SELECT
        id,
        old_approved_quantity,
        new_approved_quantity
      FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function findDepartmentItemAllocationContextRepo(
  { departmentItemId },
  transaction,
) {
  const result = await requestFor(transaction).input(
    "departmentItemId",
    sql.BigInt,
    departmentItemId,
  ).query(`
      SELECT TOP 1
        item.id AS department_item_id,
        item.department_category_budget_id,
        item.catalog_item_id,
        item.requested_quantity,
        item.category_approved_quantity,
        item.review_status,
        item.row_version AS department_item_row_version,
        dcb.status AS department_category_budget_status,
        dcb.budget_category_id,
        db.financial_year_id,
        db.department_id
      FROM dbo.BS_department_category_budget_items AS item WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      WHERE item.id = @departmentItemId
        AND item.is_active = 1;
    `);

  const row = result.recordset[0] || null;
  if (row)
    row.department_item_row_version = bufferRowVersion(
      row.department_item_row_version,
    );
  return row;
}

export async function listPackageSubItemsForDepartmentItemRepo(
  { departmentItemId },
  transaction,
) {
  const result = await requestFor(transaction).input(
    "departmentItemId",
    sql.BigInt,
    departmentItemId,
  ).query(`
      SELECT
        subItem.id AS package_sub_item_id,
        subItem.category_budget_package_item_id AS package_item_id,

        subItem.name AS package_sub_item_name,
        subItem.unit_price,

        packageItem.catalog_item_id,
        pkg.id AS package_id,
        pkg.budget_category_id,
        pkg.status AS package_status,
        fy.status AS financial_year_status

      FROM dbo.BS_department_category_budget_items AS item

      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id

      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id

      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.financial_year_id = db.financial_year_id
       AND pkg.budget_category_id = dcb.budget_category_id

      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.category_budget_package_id = pkg.id
       AND packageItem.catalog_item_id = item.catalog_item_id
       AND packageItem.is_active = 1

      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.category_budget_package_item_id = packageItem.id
       AND subItem.is_active = 1

      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id

      WHERE item.id = @departmentItemId

      ORDER BY subItem.name;
    `);

  return result.recordset;
}

export async function markPackageSubmittedToCfoRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("packageId", sql.BigInt, payload.package_id)
    .input("rowVersion", sql.Binary(8), payload.row_version)
    .input("actorUserId", sql.Int, payload.actor_user_id).query(`
      DECLARE @Updated TABLE
      (
        id BIGINT NOT NULL,
        old_status VARCHAR(40) NOT NULL
      );

      UPDATE dbo.BS_category_budget_packages
      SET
        status = '${CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW}',
        submitted_to_cfo_by = @actorUserId,
        submitted_to_cfo_at = SYSUTCDATETIME(),
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id, DELETED.status INTO @Updated (id, old_status)
      WHERE id = @packageId
        AND row_version = @rowVersion
        AND status IN ('${CATEGORY_PACKAGE_STATUS.DRAFT}', '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}');

      UPDATE packageItem
      SET
        cfo_review_status =
          CASE
            WHEN updated.old_status = '${CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO}'
             AND packageItem.cfo_review_status = '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.CFO_ACCEPTED}'
            THEN '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.CFO_ACCEPTED}'
            ELSE '${CATEGORY_PACKAGE_ITEM_CFO_STATUS.PENDING_CFO_REVIEW}'
          END,
        updated_by = @actorUserId,
        updated_at = SYSUTCDATETIME()
      FROM dbo.BS_category_budget_package_items AS packageItem
      INNER JOIN @Updated AS updated ON updated.id = packageItem.category_budget_package_id
      WHERE packageItem.is_active = 1;

      SELECT id FROM @Updated;
    `);

  return result.recordset[0] || null;
}

export async function createWorkflowHistoryRepo(transaction, payload) {
  await requestFor(transaction)
    .input("financialYearId", sql.Int, payload.financial_year_id)
    .input("entityType", sql.VarChar(80), payload.entity_type)
    .input("entityId", sql.BigInt, payload.entity_id)
    .input("action", sql.VarChar(100), payload.action)
    .input("oldStatus", sql.VarChar(40), payload.old_status ?? null)
    .input("newStatus", sql.VarChar(40), payload.new_status ?? null)
    .input("note", sql.NVarChar(sql.MAX), payload.note ?? null)
    .input("oldValues", sql.NVarChar(sql.MAX), payload.old_values_json ?? null)
    .input("newValues", sql.NVarChar(sql.MAX), payload.new_values_json ?? null)
    .input("userRoleId", sql.Int, payload.user_role_id ?? null)
    .input("actingWorkspace", sql.VarChar(80), payload.acting_workspace ?? null)
    .input("createdBy", sql.Int, payload.created_by).query(`
      INSERT INTO dbo.BS_budget_workflow_history
      (
        financial_year_id,
        entity_type,
        entity_id,
        action,
        old_status,
        new_status,
        note,
        old_values_json,
        new_values_json,
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
        @oldValues,
        @newValues,
        @userRoleId,
        @actingWorkspace,
        @createdBy
      );
    `);
}
