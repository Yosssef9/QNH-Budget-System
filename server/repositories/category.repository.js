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
      VALUES (@name, 1, GETDATE())
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
        GETDATE()
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
