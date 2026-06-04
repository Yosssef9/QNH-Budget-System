import { poolPromise, sql } from "../config/db.js";

export async function getCategoriesRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      id,
      name
    FROM BS_budget_categories
    WHERE is_active = 1
    ORDER BY name
  `);

  return result.recordset;
}

export async function getTypesByCategoryRepo(categoryId) {
  const pool = await poolPromise;

  const result = await pool.request().input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        id,
        category_id,
        name,
        expense_type
      FROM BS_budget_types
      WHERE category_id = @categoryId
        AND is_active = 1
      ORDER BY name
    `);

  return result.recordset;
}

export async function findCategoryByIdRepo(categoryId) {
  const pool = await poolPromise;

  const result = await pool.request().input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT TOP 1
        id,
        name
      FROM BS_budget_categories
      WHERE id = @categoryId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function findCategoryByNameRepo(name) {
  const pool = await poolPromise;

  const result = await pool.request().input("name", sql.NVarChar(200), name)
    .query(`
      SELECT TOP 1
        id,
        name,
        is_active
      FROM BS_budget_categories
      WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@name)))
    `);

  return result.recordset[0] || null;
}

export async function createCategoryRepo({ name }) {
  const pool = await poolPromise;

  const result = await pool.request().input("name", sql.NVarChar(200), name)
    .query(`
      INSERT INTO BS_budget_categories (name, is_active, created_at)
      OUTPUT
        INSERTED.id,
        INSERTED.name,
        INSERTED.is_active,
        INSERTED.created_at
      VALUES (@name, 1, GETUTCDATE())
    `);

  return result.recordset[0];
}

export async function reactivateCategoryRepo(categoryId) {
  const pool = await poolPromise;

  const result = await pool.request().input("categoryId", sql.Int, categoryId)
    .query(`
      UPDATE BS_budget_categories
      SET is_active = 1
      OUTPUT
        INSERTED.id,
        INSERTED.name,
        INSERTED.is_active,
        INSERTED.created_at
      WHERE id = @categoryId
    `);

  return result.recordset[0];
}

export async function findTypeByNameInCategoryRepo(categoryId, name) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("name", sql.NVarChar(200), name).query(`
      SELECT TOP 1
        id,
        category_id,
        name,
        expense_type,
        is_active
      FROM BS_budget_types
      WHERE category_id = @categoryId
        AND LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@name)))
    `);

  return result.recordset[0] || null;
}

export async function createTypeRepo({ categoryId, name, expenseType }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("name", sql.NVarChar(200), name)
    .input("expenseType", sql.VarChar(10), expenseType).query(`
      INSERT INTO BS_budget_types (
        category_id,
        name,
        expense_type,
        is_active,
        created_at
      )
      OUTPUT
        INSERTED.id,
        INSERTED.category_id,
        INSERTED.name,
        INSERTED.expense_type,
        INSERTED.is_active,
        INSERTED.created_at
      VALUES (
        @categoryId,
        @name,
        @expenseType,
        1,
        GETUTCDATE()
      )
    `);

  return result.recordset[0];
}

export async function reactivateTypeRepo(typeId, expenseType) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("typeId", sql.Int, typeId)
    .input("expenseType", sql.VarChar(10), expenseType).query(`
      UPDATE BS_budget_types
      SET 
        is_active = 1,
        expense_type = @expenseType
      OUTPUT
        INSERTED.id,
        INSERTED.category_id,
        INSERTED.name,
        INSERTED.expense_type,
        INSERTED.is_active,
        INSERTED.created_at
      WHERE id = @typeId
    `);

  return result.recordset[0];
}
export async function findTypeByIdRepo(typeId) {
  const pool = await poolPromise;

  const result = await pool.request().input("typeId", sql.Int, typeId).query(`
    SELECT TOP 1
      id,
      category_id,
      name,
      expense_type,
      is_active
    FROM BS_budget_types
    WHERE id = @typeId
      AND is_active = 1
  `);

  return result.recordset[0] || null;
}

export async function updateCategoryRepo({ categoryId, name }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("name", sql.NVarChar(200), name).query(`
      UPDATE BS_budget_categories
      SET name = @name
      OUTPUT
        INSERTED.id,
        INSERTED.name,
        INSERTED.is_active,
        INSERTED.created_at
      WHERE id = @categoryId
        AND is_active = 1
    `);

  return result.recordset[0];
}

export async function updateTypeRepo({
  typeId,
  categoryId,
  name,
  expenseType,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("typeId", sql.Int, typeId)
    .input("categoryId", sql.Int, categoryId)
    .input("name", sql.NVarChar(200), name)
    .input("expenseType", sql.VarChar(10), expenseType).query(`
      UPDATE BS_budget_types
      SET
        category_id = @categoryId,
        name = @name,
        expense_type = @expenseType
      OUTPUT
        INSERTED.id,
        INSERTED.category_id,
        INSERTED.name,
        INSERTED.expense_type,
        INSERTED.is_active,
        INSERTED.created_at
      WHERE id = @typeId
        AND is_active = 1
    `);

  return result.recordset[0];
}

export async function getCategoryUsageRepo(categoryId) {
  const pool = await poolPromise;

  const result = await pool.request().input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        b.id AS budget_id,
        d.name AS department_name,
        fy.year AS financial_year,
        b.status,
        COUNT(bi.id) AS items_count,
        ISNULL(SUM(bi.total_amount), 0) AS total_amount
      FROM BS_budget_items bi
      INNER JOIN BS_budget_types t
        ON t.id = bi.type_id
      INNER JOIN BS_budgets b
        ON b.id = bi.budget_id
       AND b.is_active = 1
      INNER JOIN BS_departments d
        ON d.id = b.department_id
      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      WHERE t.category_id = @categoryId
        AND bi.is_active = 1
      GROUP BY
        b.id,
        d.name,
        fy.year,
        b.status
      ORDER BY fy.year DESC, d.name ASC
    `);

  return result.recordset;
}

export async function getTypeUsageRepo(typeId) {
  const pool = await poolPromise;

  const result = await pool.request().input("typeId", sql.Int, typeId).query(`
    SELECT
      b.id AS budget_id,
      d.name AS department_name,
      fy.year AS financial_year,
      b.status,
      COUNT(bi.id) AS items_count,
      ISNULL(SUM(bi.total_amount), 0) AS total_amount
    FROM BS_budget_items bi
    INNER JOIN BS_budgets b
      ON b.id = bi.budget_id
     AND b.is_active = 1
    INNER JOIN BS_departments d
      ON d.id = b.department_id
    INNER JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id
    WHERE bi.type_id = @typeId
      AND bi.is_active = 1
    GROUP BY
      b.id,
      d.name,
      fy.year,
      b.status
    ORDER BY fy.year DESC, d.name ASC
  `);

  return result.recordset;
}

export async function deleteCategoryRepo(categoryId) {
  const pool = await poolPromise;

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    await new sql.Request(transaction).input("categoryId", sql.Int, categoryId)
      .query(`
        UPDATE BS_budget_types
        SET is_active = 0
        WHERE category_id = @categoryId
      `);

    const result = await new sql.Request(transaction).input(
      "categoryId",
      sql.Int,
      categoryId,
    ).query(`
        UPDATE BS_budget_categories
        SET is_active = 0
        OUTPUT
          INSERTED.id,
          INSERTED.name,
          INSERTED.is_active
        WHERE id = @categoryId
          AND is_active = 1
      `);

    await transaction.commit();

    return result.recordset[0];
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function deleteTypeRepo({ categoryId, typeId }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .input("typeId", sql.Int, typeId).query(`
      UPDATE BS_budget_types
      SET is_active = 0
      OUTPUT
        INSERTED.id,
        INSERTED.category_id,
        INSERTED.name,
        INSERTED.expense_type,
        INSERTED.is_active
      WHERE id = @typeId
        AND category_id = @categoryId
        AND is_active = 1
    `);

  return result.recordset[0];
}
export async function getAllTypesRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      t.id,
      t.category_id,
      c.name AS category_name,
      t.name,
      t.expense_type
    FROM BS_budget_types t
    INNER JOIN BS_budget_categories c
      ON c.id = t.category_id
    WHERE t.is_active = 1
      AND c.is_active = 1
    ORDER BY
      c.name,
      t.name
  `);

  return result.recordset;
}
