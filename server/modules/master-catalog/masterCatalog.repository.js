import { poolPromise, sql } from "../../config/db.js";

function bindNullableInt(request, name, value) {
  return request.input(name, sql.Int, value === null || value === undefined ? null : value);
}

export async function getCategoriesRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT id, category_code, name, description, sort_order, is_active
    FROM dbo.BS_budget_categories
    WHERE is_active = 1
    ORDER BY sort_order, name;
  `);
  return result.recordset;
}

export async function findCategoryByIdRepo(id) {
  const pool = await poolPromise;
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1 id, category_code, name, description, sort_order, is_active
    FROM dbo.BS_budget_categories
    WHERE id = @id;
  `);
  return result.recordset[0] || null;
}

export async function findCategoryByCodeRepo(categoryCode) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("categoryCode", sql.VarChar(30), categoryCode).query(`
      SELECT TOP 1 id, category_code, name, description, sort_order, is_active
      FROM dbo.BS_budget_categories
      WHERE category_code = @categoryCode;
    `);
  return result.recordset[0] || null;
}

export async function createCategoryRepo(payload) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("categoryCode", sql.VarChar(30), payload.category_code)
    .input("name", sql.NVarChar(100), payload.name)
    .input("description", sql.NVarChar(500), payload.description)
    .input("sortOrder", sql.Int, payload.sort_order)
    .input("createdBy", sql.Int, payload.created_by ?? null).query(`
      DECLARE @Inserted TABLE (id INT NOT NULL);

      INSERT INTO dbo.BS_budget_categories
      (
        category_code,
        name,
        description,
        sort_order,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @categoryCode,
        @name,
        @description,
        @sortOrder,
        1,
        @createdBy
      );

      SELECT c.id, c.category_code, c.name, c.description, c.sort_order, c.is_active
      FROM dbo.BS_budget_categories AS c
      INNER JOIN @Inserted AS inserted ON inserted.id = c.id;
    `);
  return result.recordset[0] || null;
}

export async function updateCategoryRepo(id, payload) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("name", sql.NVarChar(100), payload.name)
    .input("description", sql.NVarChar(500), payload.description)
    .input("updatedBy", sql.Int, payload.updated_by ?? null).query(`
      DECLARE @Updated TABLE (id INT NOT NULL);

      UPDATE dbo.BS_budget_categories
      SET
        name = @name,
        description = @description,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @id
        AND is_active = 1;

      SELECT c.id, c.category_code, c.name, c.description, c.sort_order, c.is_active
      FROM dbo.BS_budget_categories AS c
      INNER JOIN @Updated AS updated ON updated.id = c.id;
    `);
  return result.recordset[0] || null;
}

export async function getUnitsRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT id, unit_code, name, description, is_active
    FROM dbo.BS_units_of_measure
    WHERE is_active = 1
    ORDER BY name;
  `);
  return result.recordset;
}

export async function findUnitByIdRepo(id) {
  const pool = await poolPromise;
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1 id, unit_code, name, description, is_active
    FROM dbo.BS_units_of_measure
    WHERE id = @id
      AND is_active = 1;
  `);
  return result.recordset[0] || null;
}

export async function getCatalogItemsByCategoryRepo(categoryId, options = {}) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("includeInactive", sql.Bit, options.includeInactive ? 1 : 0).query(`
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
      AND (@includeInactive = 1 OR ci.is_active = 1)
    ORDER BY ci.sort_order, ci.name;
  `);
  return result.recordset;
}

export async function getAllCatalogItemsRepo() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
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
    WHERE ci.is_active = 1
      AND c.is_active = 1
    ORDER BY c.sort_order, ci.sort_order, ci.name;
  `);
  return result.recordset;
}

export async function findCatalogItemByIdRepo(id) {
  const pool = await poolPromise;
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1
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
    WHERE ci.id = @id;
  `);
  return result.recordset[0] || null;
}

export async function findCatalogItemByNameInCategoryRepo(categoryId, name) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("name", sql.NVarChar(200), name).query(`
      SELECT TOP 1 id, budget_category_id, item_code, name, is_active
      FROM dbo.BS_budget_catalog_items
      WHERE budget_category_id = @categoryId
        AND LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@name)));
    `);
  return result.recordset[0] || null;
}

export async function findCatalogItemByCodeRepo(itemCode) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("itemCode", sql.VarChar(80), itemCode).query(`
      SELECT TOP 1 id, budget_category_id, item_code, name, is_active
      FROM dbo.BS_budget_catalog_items
      WHERE item_code = @itemCode;
    `);
  return result.recordset[0] || null;
}

export async function getNextCatalogItemSortOrderRepo(categoryId, transaction) {
  const request = transaction ? new sql.Request(transaction) : (await poolPromise).request();
  const result = await request.input("categoryId", sql.Int, categoryId).query(`
    SELECT ISNULL(MAX(sort_order), 0) + 1 AS next_sort_order
    FROM dbo.BS_budget_catalog_items
    WHERE budget_category_id = @categoryId;
  `);
  return result.recordset[0]?.next_sort_order || 1;
}

export async function createCatalogItemRepo(transaction, payload) {
  const request = new sql.Request(transaction);
  const result = await request
    .input("categoryId", sql.Int, payload.budget_category_id)
    .input("itemCode", sql.VarChar(80), payload.item_code)
    .input("name", sql.NVarChar(200), payload.name)
    .input("description", sql.NVarChar(1000), payload.description)
    .input("expenseType", sql.VarChar(10), payload.expense_type)
    .input("unitOfMeasureId", sql.Int, payload.unit_of_measure_id)
    .input("sortOrder", sql.Int, payload.sort_order)
    .input("createdBy", sql.Int, payload.created_by ?? null).query(`
      DECLARE @Inserted TABLE (id INT NOT NULL);

      INSERT INTO dbo.BS_budget_catalog_items
      (
        budget_category_id,
        item_code,
        name,
        description,
        expense_type,
        unit_of_measure_id,
        sort_order,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @categoryId,
        @itemCode,
        @name,
        @description,
        @expenseType,
        @unitOfMeasureId,
        @sortOrder,
        1,
        @createdBy
      );

      SELECT id FROM @Inserted;
    `);
  return result.recordset[0] || null;
}

export async function updateCatalogItemRepo(id, payload) {
  const pool = await poolPromise;
  const request = pool
    .request()
    .input("id", sql.Int, id)
    .input("itemCode", sql.VarChar(80), payload.item_code)
    .input("name", sql.NVarChar(200), payload.name)
    .input("description", sql.NVarChar(1000), payload.description)
    .input("expenseType", sql.VarChar(10), payload.expense_type)
    .input("unitOfMeasureId", sql.Int, payload.unit_of_measure_id)
    .input("updatedBy", sql.Int, payload.updated_by ?? null);

  const result = await request.query(`
    DECLARE @Updated TABLE (id INT NOT NULL);

    UPDATE dbo.BS_budget_catalog_items
    SET
      item_code = @itemCode,
      name = @name,
      description = @description,
      expense_type = @expenseType,
      unit_of_measure_id = @unitOfMeasureId,
      updated_by = @updatedBy,
      updated_at = SYSUTCDATETIME()
    OUTPUT INSERTED.id INTO @Updated (id)
    WHERE id = @id
      AND is_active = 1;

    SELECT id FROM @Updated;
  `);
  return result.recordset[0] || null;
}

export async function updateCatalogItemStatusRepo(id, isActive, updatedBy = null) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("isActive", sql.Bit, isActive)
    .input("updatedBy", sql.Int, updatedBy).query(`
      DECLARE @Updated TABLE (id INT NOT NULL);

      UPDATE dbo.BS_budget_catalog_items
      SET
        is_active = @isActive,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @id;

      SELECT id FROM @Updated;
    `);
  return result.recordset[0] || null;
}

export async function getSubItemsByCatalogItemRepo(catalogItemId) {
  const pool = await poolPromise;
  const result = await pool.request().input("catalogItemId", sql.Int, catalogItemId)
    .query(`
      SELECT
        si.id,
        si.catalog_item_id,
        si.sub_item_code,
        si.name,
        si.default_specification,
        si.default_unit_of_measure_id,
        u.name AS unit_name,
        u.unit_code,
        si.is_default_general,
        si.is_active,
        si.row_version
      FROM dbo.BS_budget_catalog_sub_items AS si
      INNER JOIN dbo.BS_units_of_measure AS u
        ON u.id = si.default_unit_of_measure_id
      WHERE si.catalog_item_id = @catalogItemId
        AND si.is_active = 1
      ORDER BY si.is_default_general DESC, si.name;
    `);
  return result.recordset;
}

export async function findSubItemByIdRepo(id) {
  const pool = await poolPromise;
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1
      si.id,
      si.catalog_item_id,
      si.sub_item_code,
      si.name,
      si.default_specification,
      si.default_unit_of_measure_id,
      u.name AS unit_name,
      u.unit_code,
      si.is_default_general,
      si.is_active,
      si.row_version
    FROM dbo.BS_budget_catalog_sub_items AS si
    INNER JOIN dbo.BS_units_of_measure AS u
      ON u.id = si.default_unit_of_measure_id
    WHERE si.id = @id;
  `);
  return result.recordset[0] || null;
}

export async function findSubItemByCodeRepo(catalogItemId, subItemCode) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("catalogItemId", sql.Int, catalogItemId)
    .input("subItemCode", sql.VarChar(100), subItemCode).query(`
      SELECT TOP 1 id, catalog_item_id, sub_item_code, name, is_active, is_default_general
      FROM dbo.BS_budget_catalog_sub_items
      WHERE catalog_item_id = @catalogItemId
        AND sub_item_code = @subItemCode;
    `);
  return result.recordset[0] || null;
}

export async function findSubItemByNameRepo(catalogItemId, name) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("catalogItemId", sql.Int, catalogItemId)
    .input("name", sql.NVarChar(300), name).query(`
      SELECT TOP 1 id, catalog_item_id, sub_item_code, name, is_active, is_default_general
      FROM dbo.BS_budget_catalog_sub_items
      WHERE catalog_item_id = @catalogItemId
        AND LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@name)));
    `);
  return result.recordset[0] || null;
}

export async function countActiveGeneralSubItemsRepo(catalogItemId) {
  const pool = await poolPromise;
  const result = await pool.request().input("catalogItemId", sql.Int, catalogItemId)
    .query(`
      SELECT COUNT(1) AS count
      FROM dbo.BS_budget_catalog_sub_items
      WHERE catalog_item_id = @catalogItemId
        AND is_default_general = 1
        AND is_active = 1;
    `);
  return result.recordset[0]?.count || 0;
}

export async function createSubItemRepo(transaction, payload) {
  const request = new sql.Request(transaction);
  const result = await request
    .input("catalogItemId", sql.Int, payload.catalog_item_id)
    .input("subItemCode", sql.VarChar(100), payload.sub_item_code ?? null)
    .input("name", sql.NVarChar(300), payload.name)
    .input("defaultSpecification", sql.NVarChar(2000), payload.default_specification)
    .input("defaultUnitOfMeasureId", sql.Int, payload.default_unit_of_measure_id)
    .input("isDefaultGeneral", sql.Bit, payload.is_default_general)
    .input("createdBy", sql.Int, payload.created_by ?? null).query(`
      DECLARE @Inserted TABLE (id INT NOT NULL);
      DECLARE @ResolvedSubItemCode VARCHAR(100) = @subItemCode;

      IF @ResolvedSubItemCode IS NULL
      BEGIN
        SELECT @ResolvedSubItemCode = CONCAT(
          'SUB-',
          RIGHT(
            CONCAT(
              '00000000',
              CAST(NEXT VALUE FOR dbo.BS_budget_catalog_sub_item_code_seq AS VARCHAR(20))
            ),
            8
          )
        );
      END;

      INSERT INTO dbo.BS_budget_catalog_sub_items
      (
        catalog_item_id,
        sub_item_code,
        name,
        default_specification,
        default_unit_of_measure_id,
        is_default_general,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @catalogItemId,
        @ResolvedSubItemCode,
        @name,
        @defaultSpecification,
        @defaultUnitOfMeasureId,
        @isDefaultGeneral,
        1,
        @createdBy
      );

      SELECT id FROM @Inserted;
    `);
  return result.recordset[0] || null;
}

export async function updateSubItemRepo(id, payload) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("name", sql.NVarChar(300), payload.name)
    .input("defaultSpecification", sql.NVarChar(2000), payload.default_specification)
    .input("defaultUnitOfMeasureId", sql.Int, payload.default_unit_of_measure_id)
    .input("isDefaultGeneral", sql.Bit, payload.is_default_general)
    .input("updatedBy", sql.Int, payload.updated_by ?? null).query(`
      DECLARE @Updated TABLE (id INT NOT NULL);

      UPDATE dbo.BS_budget_catalog_sub_items
      SET
        name = @name,
        default_specification = @defaultSpecification,
        default_unit_of_measure_id = @defaultUnitOfMeasureId,
        is_default_general = @isDefaultGeneral,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @id
        AND is_active = 1;

      SELECT id FROM @Updated;
    `);
  return result.recordset[0] || null;
}

export async function updateSubItemStatusRepo(id, isActive, updatedBy = null) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("isActive", sql.Bit, isActive)
    .input("updatedBy", sql.Int, updatedBy).query(`
      DECLARE @Updated TABLE (id INT NOT NULL);

      UPDATE dbo.BS_budget_catalog_sub_items
      SET
        is_active = @isActive,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id INTO @Updated (id)
      WHERE id = @id;

      SELECT id FROM @Updated;
    `);
  return result.recordset[0] || null;
}

export async function getCategoryUsageRepo(categoryId) {
  const pool = await poolPromise;
  const result = await pool.request().input("categoryId", sql.Int, categoryId).query(`
    SELECT
      dcb.id AS budget_id,
      CONCAT('department-category-budget:', dcb.id) AS usage_key,
      dept.name AS department_name,
      dept.department_code,
      fy.year AS financial_year,
      fy.status AS financial_year_status,
      dcb.status,
      COUNT(item.id) AS items_count,
      COALESCE(SUM(item.requested_quantity), 0) AS total_requested_quantity,
      COALESCE(SUM(item.category_approved_quantity), 0) AS total_approved_quantity
    FROM dbo.BS_department_category_budget_items AS item
    INNER JOIN dbo.BS_department_category_budgets AS dcb
      ON dcb.id = item.department_category_budget_id
    INNER JOIN dbo.BS_department_budgets AS db
      ON db.id = dcb.department_budget_id
    INNER JOIN dbo.BS_financial_years AS fy
      ON fy.id = db.financial_year_id
    INNER JOIN dbo.BS_departments AS dept
      ON dept.id = db.department_id
    WHERE dcb.budget_category_id = @categoryId
      AND item.is_active = 1
    GROUP BY
      dcb.id,
      dept.name,
      dept.department_code,
      fy.year,
      fy.status,
      dcb.status
    ORDER BY fy.year DESC, dept.name;
  `);
  return result.recordset;
}

export async function getCatalogItemUsageRepo(catalogItemId) {
  const pool = await poolPromise;
  const result = await pool.request().input("catalogItemId", sql.Int, catalogItemId)
    .query(`
      SELECT
        dcb.id AS budget_id,
        CONCAT('department-category-budget:', dcb.id) AS usage_key,
        dept.name AS department_name,
        dept.department_code,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        dcb.status,
        COUNT(item.id) AS items_count,
        COALESCE(SUM(item.requested_quantity), 0) AS total_requested_quantity,
        COALESCE(SUM(item.category_approved_quantity), 0) AS total_approved_quantity
      FROM dbo.BS_department_category_budget_items AS item
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_financial_years AS fy
        ON fy.id = db.financial_year_id
      INNER JOIN dbo.BS_departments AS dept
        ON dept.id = db.department_id
      WHERE item.catalog_item_id = @catalogItemId
        AND item.is_active = 1
      GROUP BY
        dcb.id,
        dept.name,
        dept.department_code,
        fy.year,
        fy.status,
        dcb.status
      ORDER BY fy.year DESC, dept.name;
    `);
  return result.recordset;
}
