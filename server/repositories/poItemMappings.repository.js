import { poolPromise, sql } from "../config/db.js";

function normalizeItemCode(value) {
  return String(value || "").trim();
}

export async function getPOItemMappingsRepo(filters = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  const where = [];

  if (filters.search) {
    request.input("search", sql.NVarChar(200), `%${filters.search}%`);
    where.push(`(
      bt.name LIKE @search
      OR m.po_item_code LIKE @search
      OR m.po_item_description LIKE @search
    )`);
  }

  if (filters.source && filters.source !== "ALL") {
    request.input("source", sql.VarChar(30), filters.source);
    where.push("m.mapping_source = @source");
  }

  if (filters.status === "ACTIVE") {
    where.push("m.is_active = 1");
  }

  if (filters.status === "INACTIVE") {
    where.push("m.is_active = 0");
  }

  const result = await request.query(`
    SELECT
      m.id,
      m.budget_type_id,
      bt.name AS budget_type_name,
      m.po_item_code,
      m.po_item_description,
      m.mapping_source,
      m.source_po_link_id,
      m.learned_count,
      m.last_learned_at,
      m.is_active,
      m.created_by,
      createdUser.USER_NAME AS created_by_name,
      m.created_at,
      m.updated_by,
      updatedUser.USER_NAME AS updated_by_name,
      m.updated_at,
      m.disabled_by,
      disabledUser.USER_NAME AS disabled_by_name,
      m.disabled_at,
      m.disabled_reason
    FROM BS_PO_ITEM_MAPPINGS m
    INNER JOIN BS_budget_types bt
      ON bt.id = m.budget_type_id
    LEFT JOIN USERS createdUser
      ON createdUser.USER_ID = m.created_by
    LEFT JOIN USERS updatedUser
      ON updatedUser.USER_ID = m.updated_by
    LEFT JOIN USERS disabledUser
      ON disabledUser.USER_ID = m.disabled_by
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY m.is_active DESC, bt.name ASC, m.po_item_code ASC
  `);

  return result.recordset;
}

export async function findPOItemMappingByIdRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.BigInt, id).query(`
    SELECT TOP 1
      id,
      budget_type_id,
      po_item_code,
      po_item_description,
      mapping_source,
      source_po_link_id,
      learned_count,
      last_learned_at,
      is_active
    FROM BS_PO_ITEM_MAPPINGS
    WHERE id = @id
  `);

  return result.recordset[0] || null;
}

export async function findPOItemMappingByTypeAndCodeRepo({
  budgetTypeId,
  poItemCode,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .input("poItemCode", sql.NVarChar(100), normalizeItemCode(poItemCode))
    .query(`
      SELECT TOP 1
        id,
        budget_type_id,
        po_item_code,
        po_item_description,
        mapping_source,
        is_active
      FROM BS_PO_ITEM_MAPPINGS
      WHERE budget_type_id = @budgetTypeId
        AND po_item_code = @poItemCode
    `);

  return result.recordset[0] || null;
}

export async function createManualPOItemMappingRepo(data) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetTypeId", sql.Int, data.budget_type_id)
    .input("poItemCode", sql.NVarChar(100), normalizeItemCode(data.po_item_code))
    .input(
      "poItemDescription",
      sql.NVarChar(500),
      data.po_item_description || null,
    )
    .input("createdBy", sql.Int, data.created_by).query(`
      INSERT INTO BS_PO_ITEM_MAPPINGS (
        budget_type_id,
        po_item_code,
        po_item_description,
        mapping_source,
        learned_count,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @budgetTypeId,
        @poItemCode,
        @poItemDescription,
        'MANUAL',
        0,
        @createdBy
      )
    `);

  return result.recordset[0] || null;
}

export async function setPOItemMappingStatusRepo({
  id,
  isActive,
  userId,
  reason = null,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, id)
    .input("isActive", sql.Bit, isActive)
    .input("userId", sql.Int, userId)
    .input("reason", sql.NVarChar(500), reason).query(`
      UPDATE BS_PO_ITEM_MAPPINGS
      SET
        is_active = @isActive,
        disabled_by = CASE WHEN @isActive = 0 THEN @userId ELSE NULL END,
        disabled_at = CASE WHEN @isActive = 0 THEN SYSUTCDATETIME() ELSE NULL END,
        disabled_reason = CASE WHEN @isActive = 0 THEN @reason ELSE NULL END,
        updated_by = @userId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

  return result.recordset[0] || null;
}

export async function searchBudgetTypesForMappingRepo({ search } = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  const where = ["is_active = 1"];

  if (search) {
    request.input("search", sql.NVarChar(200), `%${search}%`);
    where.push("name LIKE @search");
  }

  const result = await request.query(`
    SELECT TOP 50
      id,
      name,
      expense_type
    FROM BS_budget_types
    WHERE ${where.join(" AND ")}
    ORDER BY name ASC
  `);

  return result.recordset;
}

export async function searchPOItemsForMappingRepo({ search } = {}) {
  const pool = await poolPromise;
  const request = pool.request();
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
    FROM BS_Purchase_Invoices_For_Budget
    WHERE ${where.join(" AND ")}
    GROUP BY LTRIM(RTRIM(ITEM_CODE))
    ORDER BY MAX(CREATED_AT) DESC
  `);

  return result.recordset;
}

export async function getPOItemMappingCategoriesRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      id,
      category_code,
      name,
      description,
      sort_order,
      is_active
    FROM dbo.BS_budget_categories
    WHERE is_active = 1
    ORDER BY sort_order ASC, name ASC
  `);

  return result.recordset;
}

export async function getPOItemMappingCatalogItemsRepo(categoryId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        ci.id,
        ci.budget_category_id,
        c.name AS category_name,
        c.category_code,
        ci.item_code,
        ci.name,
        ci.description,
        ci.expense_type,
        ci.unit_of_measure_id,
        u.name AS unit_name,
        u.unit_code,
        ci.sort_order,
        ci.is_active,
        general.id AS general_sub_item_id
      FROM dbo.BS_budget_catalog_items AS ci
      INNER JOIN dbo.BS_budget_categories AS c
        ON c.id = ci.budget_category_id
      INNER JOIN dbo.BS_units_of_measure AS u
        ON u.id = ci.unit_of_measure_id
      LEFT JOIN dbo.BS_budget_catalog_sub_items AS general
        ON general.catalog_item_id = ci.id
        AND general.is_default_general = 1
        AND general.is_active = 1
      WHERE ci.budget_category_id = @categoryId
        AND ci.is_active = 1
        AND c.is_active = 1
      ORDER BY ci.sort_order ASC, ci.name ASC
    `);

  return result.recordset;
}

export async function getPOItemMappingCatalogSubItemsRepo(catalogItemId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("catalogItemId", sql.Int, catalogItemId)
    .query(`
      SELECT
        subItem.id,
        subItem.catalog_item_id,
        item.name AS catalog_item_name,
        item.item_code AS catalog_item_code,
        item.budget_category_id,
        subItem.name,
        subItem.sub_item_code,
        subItem.default_specification,
        subItem.default_specification AS description,
        subItem.default_unit_of_measure_id AS unit_of_measure_id,
        u.name AS unit_name,
        u.unit_code,
        subItem.is_default_general,
        subItem.is_active
      FROM dbo.BS_budget_catalog_sub_items AS subItem
      INNER JOIN dbo.BS_budget_catalog_items AS item
        ON item.id = subItem.catalog_item_id
      INNER JOIN dbo.BS_units_of_measure AS u
        ON u.id = subItem.default_unit_of_measure_id
      WHERE subItem.catalog_item_id = @catalogItemId
        AND subItem.is_active = 1
        AND item.is_active = 1
      ORDER BY subItem.is_default_general DESC, subItem.name ASC
    `);

  return result.recordset;
}

export async function learnPOItemMappingFromApprovedLinkRepo({
  poLinkId,
  userId,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("poLinkId", sql.BigInt, poLinkId)
    .input("userId", sql.Int, userId).query(`
      DECLARE @budgetTypeId INT;
      DECLARE @poItemCode NVARCHAR(100);
      DECLARE @poItemDescription NVARCHAR(500);
      DECLARE @approvedAt DATETIME2;

      SELECT TOP 1
        @budgetTypeId = bi.type_id,
        @poItemCode = LTRIM(RTRIM(po.ITEM_CODE)),
        @poItemDescription = po.ITEM_DESC,
        @approvedAt = pl.APPROVED_AT
      FROM BS_PO_LINKS pl
      INNER JOIN BS_budget_items bi
        ON bi.id = pl.BUDGET_ITEM_ID
      INNER JOIN BS_Purchase_Invoices_For_Budget po
        ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
      WHERE pl.ID = @poLinkId
        AND pl.STATUS = 'APPROVED'
        AND po.ITEM_CODE IS NOT NULL
        AND LTRIM(RTRIM(po.ITEM_CODE)) <> '';

      IF @budgetTypeId IS NULL OR @poItemCode IS NULL
      BEGIN
        SELECT CAST(NULL AS BIGINT) AS id;
        RETURN;
      END;

      UPDATE BS_PO_ITEM_MAPPINGS
      SET
        learned_count = learned_count + 1,
        last_learned_at = ISNULL(@approvedAt, SYSUTCDATETIME()),
        po_item_description = COALESCE(po_item_description, @poItemDescription),
        updated_by = @userId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE budget_type_id = @budgetTypeId
        AND po_item_code = @poItemCode;

      IF @@ROWCOUNT = 0
      BEGIN
        INSERT INTO BS_PO_ITEM_MAPPINGS (
          budget_type_id,
          po_item_code,
          po_item_description,
          mapping_source,
          source_po_link_id,
          learned_count,
          last_learned_at,
          created_by,
          created_at
        )
        OUTPUT INSERTED.*
        SELECT
          @budgetTypeId,
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
          FROM BS_PO_ITEM_MAPPINGS WITH (UPDLOCK, HOLDLOCK)
          WHERE budget_type_id = @budgetTypeId
            AND po_item_code = @poItemCode
        );
      END;
    `);

  return result.recordset[0] || null;
}
