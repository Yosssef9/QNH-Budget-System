import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";
import { TRANSFER_STATUS } from "./transfers.constants.js";

function requestFor(transaction) {
  return new sql.Request(transaction);
}

function rowVersion(rowVersion) {
  return rowVersion ? Buffer.from(rowVersion).toString("base64") : null;
}

function transferSelect() {
  return `
    SELECT
      transfer.*,
      fy.id AS financial_year_id,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      pkg.id AS category_budget_package_id,
      pkg.budget_category_id,
      category.name AS category_name,
      category.category_code,
      fromPackageItem.catalog_item_id AS from_catalog_item_id,
      fromCatalog.name AS from_item_name,
      fromCatalog.expense_type AS from_expense_type,
      fromSub.id AS from_package_sub_item_id,
      fromSub.name AS from_sub_item_name,
      fromSub.unit_price AS from_unit_price,
      fromSub.quantity AS from_base_quantity,
      CAST(
        fromSub.quantity
        + COALESCE(fromApprovedIn.approved_quantity, 0)
        - COALESCE(fromApprovedOut.approved_quantity, 0)
        - COALESCE(fromPendingOut.pending_quantity, 0)
        + CASE
            WHEN transfer.status = '${TRANSFER_STATUS.APPROVED}'
              THEN transfer.source_quantity
            ELSE 0
          END
        + CASE
            WHEN transfer.status = '${TRANSFER_STATUS.PENDING_APPROVAL}'
              THEN transfer.source_quantity
            ELSE 0
          END
        AS DECIMAL(24,12)
      ) AS from_remaining_before_transfer,
      CAST(
        fromSub.quantity
        + COALESCE(fromApprovedIn.approved_quantity, 0)
        - COALESCE(fromApprovedOut.approved_quantity, 0)
        - COALESCE(fromPendingOut.pending_quantity, 0)
        + CASE
            WHEN transfer.status = '${TRANSFER_STATUS.APPROVED}'
              THEN transfer.source_quantity
            ELSE 0
          END
        + CASE
            WHEN transfer.status = '${TRANSFER_STATUS.PENDING_APPROVAL}'
              THEN transfer.source_quantity
            ELSE 0
          END
        - transfer.source_quantity
        AS DECIMAL(24,12)
      ) AS from_remaining_after_transfer,
      toPackageItem.catalog_item_id AS to_catalog_item_id,
      toCatalog.name AS to_item_name,
      toCatalog.expense_type AS to_expense_type,
      toSub.id AS to_package_sub_item_id,
      toSub.name AS to_sub_item_name,
      toSub.unit_price AS to_unit_price,
      toSub.quantity AS to_base_quantity,
      CAST(
        toSub.quantity
        + COALESCE(toApprovedIn.approved_quantity, 0)
        - COALESCE(toApprovedOut.approved_quantity, 0)
        - COALESCE(toPendingOut.pending_quantity, 0)
        - CASE
            WHEN transfer.status = '${TRANSFER_STATUS.APPROVED}'
              THEN transfer.destination_quantity
            ELSE 0
          END
        AS DECIMAL(24,12)
      ) AS to_remaining_before_transfer,
      CAST(
        toSub.quantity
        + COALESCE(toApprovedIn.approved_quantity, 0)
        - COALESCE(toApprovedOut.approved_quantity, 0)
        - COALESCE(toPendingOut.pending_quantity, 0)
        - CASE
            WHEN transfer.status = '${TRANSFER_STATUS.APPROVED}'
              THEN transfer.destination_quantity
            ELSE 0
          END
        + transfer.destination_quantity
        AS DECIMAL(24,12)
      ) AS to_remaining_after_transfer,
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
    OUTER APPLY (
      SELECT SUM(source_quantity) AS pending_quantity
      FROM dbo.BS_category_budget_transfers AS pendingTransfer
      WHERE pendingTransfer.from_package_sub_item_id = fromSub.id
        AND pendingTransfer.status = '${TRANSFER_STATUS.PENDING_APPROVAL}'
    ) AS fromPendingOut
    OUTER APPLY (
      SELECT SUM(source_quantity) AS approved_quantity
      FROM dbo.BS_category_budget_transfers AS approvedTransfer
      WHERE approvedTransfer.from_package_sub_item_id = fromSub.id
        AND approvedTransfer.status = '${TRANSFER_STATUS.APPROVED}'
    ) AS fromApprovedOut
    OUTER APPLY (
      SELECT SUM(destination_quantity) AS approved_quantity
      FROM dbo.BS_category_budget_transfers AS approvedTransfer
      WHERE approvedTransfer.to_package_sub_item_id = fromSub.id
        AND approvedTransfer.status = '${TRANSFER_STATUS.APPROVED}'
    ) AS fromApprovedIn
    OUTER APPLY (
      SELECT SUM(source_quantity) AS pending_quantity
      FROM dbo.BS_category_budget_transfers AS pendingTransfer
      WHERE pendingTransfer.from_package_sub_item_id = toSub.id
        AND pendingTransfer.status = '${TRANSFER_STATUS.PENDING_APPROVAL}'
    ) AS toPendingOut
    OUTER APPLY (
      SELECT SUM(source_quantity) AS approved_quantity
      FROM dbo.BS_category_budget_transfers AS approvedTransfer
      WHERE approvedTransfer.from_package_sub_item_id = toSub.id
        AND approvedTransfer.status = '${TRANSFER_STATUS.APPROVED}'
    ) AS toApprovedOut
    OUTER APPLY (
      SELECT SUM(destination_quantity) AS approved_quantity
      FROM dbo.BS_category_budget_transfers AS approvedTransfer
      WHERE approvedTransfer.to_package_sub_item_id = toSub.id
        AND approvedTransfer.status = '${TRANSFER_STATUS.APPROVED}'
    ) AS toApprovedIn
    LEFT JOIN dbo.users AS requester
      ON requester.USER_ID = transfer.requested_by
    LEFT JOIN dbo.users AS approver
      ON approver.USER_ID = transfer.approved_by
    LEFT JOIN dbo.users AS rejecter
      ON rejecter.USER_ID = transfer.rejected_by
  `;
}

export async function listTransferSubItemsRepo({
  budgetCategoryId,
  financialYearId = null,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("budgetCategoryId", sql.Int, budgetCategoryId)
    .input("financialYearId", sql.Int, financialYearId)
    .query(`
      WITH pendingOut AS (
        SELECT from_package_sub_item_id, SUM(source_quantity) AS pending_quantity
        FROM dbo.BS_category_budget_transfers
        WHERE status = '${TRANSFER_STATUS.PENDING_APPROVAL}'
        GROUP BY from_package_sub_item_id
      ),
      approvedOut AS (
        SELECT from_package_sub_item_id, SUM(source_quantity) AS approved_quantity
        FROM dbo.BS_category_budget_transfers
        WHERE status = '${TRANSFER_STATUS.APPROVED}'
        GROUP BY from_package_sub_item_id
      ),
      approvedIn AS (
        SELECT to_package_sub_item_id, SUM(destination_quantity) AS approved_quantity
        FROM dbo.BS_category_budget_transfers
        WHERE status = '${TRANSFER_STATUS.APPROVED}'
        GROUP BY to_package_sub_item_id
      ),
      approvedPo AS (
        SELECT category_budget_package_sub_item_id, SUM(requested_qty) AS approved_quantity
        FROM dbo.BS_category_po_links
        WHERE status = 'APPROVED'
        GROUP BY category_budget_package_sub_item_id
      ),
      pendingPo AS (
        SELECT category_budget_package_sub_item_id, SUM(requested_qty) AS pending_quantity
        FROM dbo.BS_category_po_links
        WHERE status = 'PENDING'
        GROUP BY category_budget_package_sub_item_id
      )
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
        catalog.id AS catalog_item_id,
        catalog.name AS catalog_item_name,
        catalog.expense_type,
        catalogSub.id AS catalog_sub_item_id,
        subItem.name AS sub_item_name,
        catalog.name AS generic_item_name,
        subItem.name AS model_name,
        CONCAT(catalog.name, ' - ', subItem.name) AS name,
        subItem.quantity,
        subItem.unit_price,
        CAST(COALESCE(approvedIn.approved_quantity, 0) AS DECIMAL(24,12)) AS approved_transfer_in_quantity,
        CAST(COALESCE(approvedOut.approved_quantity, 0) AS DECIMAL(24,12)) AS approved_transfer_out_quantity,
        CAST(COALESCE(pendingOut.pending_quantity, 0) AS DECIMAL(24,12)) AS pending_transfer_out_quantity,
        CAST(COALESCE(approvedPo.approved_quantity, 0) AS DECIMAL(24,12)) AS approved_po_linked_quantity,
        CAST(COALESCE(pendingPo.pending_quantity, 0) AS DECIMAL(24,12)) AS pending_po_linked_quantity,
        CAST(
          (
            subItem.quantity
            + COALESCE(approvedIn.approved_quantity, 0)
            - COALESCE(approvedOut.approved_quantity, 0)
            - COALESCE(pendingOut.pending_quantity, 0)
            - COALESCE(approvedPo.approved_quantity, 0)
            - COALESCE(pendingPo.pending_quantity, 0)
          )
          AS DECIMAL(24,12)
        ) AS available_quantity,
        CAST(
          (
            subItem.quantity
            + COALESCE(approvedIn.approved_quantity, 0)
            - COALESCE(approvedOut.approved_quantity, 0)
            - COALESCE(pendingOut.pending_quantity, 0)
            - COALESCE(approvedPo.approved_quantity, 0)
            - COALESCE(pendingPo.pending_quantity, 0)
          ) * subItem.unit_price
          AS DECIMAL(18,6)
        ) AS available_amount,
        CASE
          WHEN COALESCE(pendingOut.pending_quantity, 0) > 0
            OR COALESCE(pendingPo.pending_quantity, 0) > 0
          THEN 1 ELSE 0
        END AS is_locked
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
      LEFT JOIN pendingOut
        ON pendingOut.from_package_sub_item_id = subItem.id
      LEFT JOIN approvedOut
        ON approvedOut.from_package_sub_item_id = subItem.id
      LEFT JOIN approvedIn
        ON approvedIn.to_package_sub_item_id = subItem.id
      LEFT JOIN approvedPo
        ON approvedPo.category_budget_package_sub_item_id = subItem.id
      LEFT JOIN pendingPo
        ON pendingPo.category_budget_package_sub_item_id = subItem.id
      WHERE pkg.budget_category_id = @budgetCategoryId
        AND (
          (@financialYearId IS NULL AND fy.status = 'PRE_CLOSING')
          OR
          (
            @financialYearId IS NOT NULL
            AND fy.id = @financialYearId
            AND fy.status IN ('OPEN', 'PRE_CLOSING', 'CLOSED')
          )
        )
        AND pkg.status = 'CFO_REVIEW_COMPLETED'
        AND subItem.is_active = 1
      ORDER BY catalog.name, subItem.name;
    `);
  return result.recordset;
}

export async function listTransferDestinationCatalogRepo({ budgetCategoryId }) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("budgetCategoryId", sql.Int, budgetCategoryId)
    .query(`
      SELECT
        item.id,
        item.name,
        item.item_code,
        item.expense_type,
        item.budget_category_id,
        category.name AS category_name
      FROM dbo.BS_budget_catalog_items AS item
      INNER JOIN dbo.BS_budget_categories AS category
        ON category.id = item.budget_category_id
      WHERE item.budget_category_id = @budgetCategoryId
        AND item.is_active = 1
      ORDER BY item.name;
    `);
  return result.recordset;
}

export async function listReusableSubItemsForCatalogItemRepo({
  catalogItemId,
  budgetCategoryId,
}) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("catalogItemId", sql.Int, catalogItemId)
    .input("budgetCategoryId", sql.Int, budgetCategoryId)
    .query(`
      SELECT
        subItem.id,
        subItem.catalog_item_id,
        subItem.sub_item_code,
        subItem.name,
        subItem.default_specification,
        subItem.default_unit_of_measure_id,
        unit.name AS unit_of_measure_name
      FROM dbo.BS_budget_catalog_sub_items AS subItem
      INNER JOIN dbo.BS_budget_catalog_items AS item
        ON item.id = subItem.catalog_item_id
       AND item.budget_category_id = @budgetCategoryId
      LEFT JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = subItem.default_unit_of_measure_id
      WHERE subItem.catalog_item_id = @catalogItemId
        AND subItem.is_active = 1
      ORDER BY subItem.is_default_general DESC, subItem.name;
    `);
  return result.recordset;
}

export async function findSubItemContextRepo({ packageSubItemId }, transaction = null) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("packageSubItemId", sql.BigInt, packageSubItemId)
    .query(`
      SELECT TOP 1
        subItem.id,
        subItem.quantity,
        subItem.unit_price,
        CAST(
          (
            subItem.quantity
            + COALESCE(approvedIn.approved_quantity, 0)
            - COALESCE(approvedOut.approved_quantity, 0)
            - COALESCE(pendingOut.pending_quantity, 0)
          ) AS DECIMAL(24,12)
        ) AS available_quantity,
        CAST(
          (
            subItem.quantity
            + COALESCE(approvedIn.approved_quantity, 0)
            - COALESCE(approvedOut.approved_quantity, 0)
            - COALESCE(pendingOut.pending_quantity, 0)
          ) * subItem.unit_price AS DECIMAL(18,6)
        ) AS available_amount,
        subItem.name AS sub_item_name,
        packageItem.id AS package_item_id,
        packageItem.catalog_item_id,
        pkg.id AS package_id,
        pkg.financial_year_id,
        pkg.budget_category_id,
        pkg.status AS package_status,
        fy.status AS financial_year_status
      FROM dbo.BS_category_budget_package_sub_items AS subItem WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem WITH (UPDLOCK, HOLDLOCK)
        ON packageItem.id = subItem.category_budget_package_item_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
        ON pkg.id = packageItem.category_budget_package_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = pkg.financial_year_id
      LEFT JOIN (
        SELECT from_package_sub_item_id, SUM(source_quantity) AS pending_quantity
        FROM dbo.BS_category_budget_transfers
        WHERE status = 'PENDING_APPROVAL'
        GROUP BY from_package_sub_item_id
      ) AS pendingOut
        ON pendingOut.from_package_sub_item_id = subItem.id
      LEFT JOIN (
        SELECT from_package_sub_item_id, SUM(source_quantity) AS approved_quantity
        FROM dbo.BS_category_budget_transfers
        WHERE status = 'APPROVED'
        GROUP BY from_package_sub_item_id
      ) AS approvedOut
        ON approvedOut.from_package_sub_item_id = subItem.id
      LEFT JOIN (
        SELECT to_package_sub_item_id, SUM(destination_quantity) AS approved_quantity
        FROM dbo.BS_category_budget_transfers
        WHERE status = 'APPROVED'
        GROUP BY to_package_sub_item_id
      ) AS approvedIn
        ON approvedIn.to_package_sub_item_id = subItem.id
      WHERE subItem.id = @packageSubItemId
        AND subItem.is_active = 1
        AND packageItem.is_active = 1;
    `);
  return result.recordset[0] || null;
}

export async function ensureDestinationPackageSubItemRepo(transaction, payload) {
  const request = requestFor(transaction)
    .input("packageId", sql.BigInt, payload.package_id)
    .input("catalogItemId", sql.Int, payload.catalog_item_id)
    .input("catalogSubItemId", sql.Int, payload.catalog_sub_item_id)
    .input("unitPrice", sql.Decimal(18, 6), payload.unit_price)
    .input("actorUserId", sql.Int, payload.actor_user_id);

  const result = await request.query(`
    DECLARE @PackageItemId BIGINT;
    DECLARE @PackageSubItemId BIGINT;

    SELECT @PackageItemId = id
    FROM dbo.BS_category_budget_package_items WITH (UPDLOCK, HOLDLOCK)
    WHERE category_budget_package_id = @packageId
      AND catalog_item_id = @catalogItemId;

    IF @PackageItemId IS NULL
    BEGIN
      DECLARE @InsertedPackageItem TABLE (id BIGINT NOT NULL);
      INSERT INTO dbo.BS_category_budget_package_items
      (
        category_budget_package_id,
        catalog_item_id,
        catalog_item_name_snapshot,
        catalog_item_code_snapshot,
        expense_type_snapshot,
        unit_of_measure_id_snapshot,
        unit_name_snapshot,
        unit_code_snapshot,
        cfo_review_status,
        needs_reconciliation,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @InsertedPackageItem (id)
      SELECT
        @packageId,
        catalogItem.id,
        catalogItem.name,
        catalogItem.item_code,
        catalogItem.expense_type,
        catalogItem.unit_of_measure_id,
        unit.name,
        unit.unit_code,
        'CFO_ACCEPTED',
        0,
        1,
        @actorUserId
      FROM dbo.BS_budget_catalog_items AS catalogItem
      INNER JOIN dbo.BS_units_of_measure AS unit
        ON unit.id = catalogItem.unit_of_measure_id
      INNER JOIN dbo.BS_category_budget_packages AS pkg
        ON pkg.id = @packageId
       AND pkg.budget_category_id = catalogItem.budget_category_id
      WHERE catalogItem.id = @catalogItemId
        AND catalogItem.is_active = 1;

      SELECT @PackageItemId = id FROM @InsertedPackageItem;
    END;

    SELECT @PackageSubItemId = subItem.id
    FROM dbo.BS_category_budget_package_sub_items AS subItem WITH (UPDLOCK, HOLDLOCK)
    WHERE subItem.category_budget_package_item_id = @PackageItemId
      AND subItem.catalog_sub_item_id = @catalogSubItemId
      AND subItem.is_active = 1;

    IF @PackageSubItemId IS NULL
    BEGIN
      DECLARE @InsertedSubItem TABLE (id BIGINT NOT NULL);

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
      OUTPUT INSERTED.id INTO @InsertedSubItem (id)
      SELECT
        @PackageItemId,
        catalogSub.id,
        catalogSub.name,
        catalogSub.default_specification,
        catalogSub.default_unit_of_measure_id,
        0,
        @unitPrice,
        NULL,
        1,
        @actorUserId
      FROM dbo.BS_budget_catalog_sub_items AS catalogSub
      WHERE catalogSub.id = @catalogSubItemId
        AND catalogSub.catalog_item_id = @catalogItemId
        AND catalogSub.is_active = 1;

      SELECT @PackageSubItemId = id FROM @InsertedSubItem;
    END;

    SELECT TOP 1
      subItem.id,
      subItem.quantity,
      subItem.unit_price,
      packageItem.id AS package_item_id,
      packageItem.catalog_item_id,
      pkg.id AS package_id,
      pkg.financial_year_id,
      pkg.budget_category_id,
      pkg.status AS package_status
    FROM dbo.BS_category_budget_package_sub_items AS subItem
    INNER JOIN dbo.BS_category_budget_package_items AS packageItem
      ON packageItem.id = subItem.category_budget_package_item_id
    INNER JOIN dbo.BS_category_budget_packages AS pkg
      ON pkg.id = packageItem.category_budget_package_id
    WHERE subItem.id = @PackageSubItemId;
  `);

  return result.recordset[0] || null;
}

export async function createCategoryTransferRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("fromPackageSubItemId", sql.BigInt, payload.from_package_sub_item_id)
    .input("toPackageSubItemId", sql.BigInt, payload.to_package_sub_item_id)
    .input("transferAmount", sql.Decimal(18, 6), payload.transfer_amount)
    .input("sourceQuantity", sql.Decimal(24, 12), payload.source_quantity)
    .input("sourceUnitPrice", sql.Decimal(18, 6), payload.source_unit_price_snapshot)
    .input("destinationQuantity", sql.Decimal(24, 12), payload.destination_quantity)
    .input("destinationUnitPrice", sql.Decimal(18, 6), payload.destination_unit_price_snapshot)
    .input("reason", sql.NVarChar(2000), payload.reason)
    .input("requestedBy", sql.Int, payload.requested_by)
    .input("requestedUserRoleId", sql.Int, payload.requested_user_role_id)
    .query(`
      DECLARE @Inserted TABLE (id BIGINT NOT NULL);
      INSERT INTO dbo.BS_category_budget_transfers
      (
        from_package_sub_item_id,
        to_package_sub_item_id,
        transfer_amount,
        source_quantity,
        source_unit_price_snapshot,
        destination_quantity,
        destination_unit_price_snapshot,
        reason,
        status,
        requested_by,
        requested_user_role_id
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @fromPackageSubItemId,
        @toPackageSubItemId,
        @transferAmount,
        @sourceQuantity,
        @sourceUnitPrice,
        @destinationQuantity,
        @destinationUnitPrice,
        @reason,
        '${TRANSFER_STATUS.PENDING_APPROVAL}',
        @requestedBy,
        @requestedUserRoleId
      );

      SELECT id FROM @Inserted;
    `);
  return result.recordset[0] || null;
}

export async function getTransferByIdRepo({ transferId }, transaction = null) {
  const pool = await poolPromise;
  const result = await createRequest(pool, transaction)
    .input("transferId", sql.BigInt, transferId)
    .query(`${transferSelect()} WHERE transfer.id = @transferId;`);
  const row = result.recordset[0] || null;
  return row ? { ...row, row_version: rowVersion(row.row_version) } : null;
}

export async function listTransfersRepo({ status, financialYearId, budgetCategoryId = null, requestedBy = null }) {
  const pool = await poolPromise;
  const result = await createRequest(pool)
    .input("status", sql.VarChar(30), status)
    .input("financialYearId", sql.Int, financialYearId)
    .input("budgetCategoryId", sql.Int, budgetCategoryId)
    .input("requestedBy", sql.Int, requestedBy)
    .query(`
      ${transferSelect()}
      WHERE (@status IS NULL OR transfer.status = @status)
        AND (@financialYearId IS NULL OR fy.id = @financialYearId)
        AND (@budgetCategoryId IS NULL OR pkg.budget_category_id = @budgetCategoryId)
        AND (@requestedBy IS NULL OR transfer.requested_by = @requestedBy)
      ORDER BY transfer.requested_at DESC;
    `);
  return result.recordset.map((row) => ({ ...row, row_version: rowVersion(row.row_version) }));
}

export async function approveTransferRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("transferId", sql.BigInt, payload.transfer_id)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("actorUserRoleId", sql.Int, payload.actor_user_role_id)
    .query(`
      UPDATE dbo.BS_category_budget_transfers
      SET
        status = '${TRANSFER_STATUS.APPROVED}',
        approved_by = @actorUserId,
        approved_user_role_id = @actorUserRoleId,
        approved_at = SYSUTCDATETIME(),
        updated_at = SYSUTCDATETIME()
      WHERE id = @transferId
        AND status = '${TRANSFER_STATUS.PENDING_APPROVAL}';

      SELECT @@ROWCOUNT AS affected_count;
    `);
  return Number(result.recordset[0]?.affected_count || 0);
}

export async function rejectTransferRepo(transaction, payload) {
  const result = await requestFor(transaction)
    .input("transferId", sql.BigInt, payload.transfer_id)
    .input("actorUserId", sql.Int, payload.actor_user_id)
    .input("actorUserRoleId", sql.Int, payload.actor_user_role_id)
    .input("reason", sql.NVarChar(1000), payload.reason)
    .query(`
      UPDATE dbo.BS_category_budget_transfers
      SET
        status = '${TRANSFER_STATUS.REJECTED}',
        rejected_by = @actorUserId,
        rejected_user_role_id = @actorUserRoleId,
        rejected_at = SYSUTCDATETIME(),
        rejection_reason = @reason,
        updated_at = SYSUTCDATETIME()
      WHERE id = @transferId
        AND status = '${TRANSFER_STATUS.PENDING_APPROVAL}';

      SELECT @@ROWCOUNT AS affected_count;
    `);
  return Number(result.recordset[0]?.affected_count || 0);
}
