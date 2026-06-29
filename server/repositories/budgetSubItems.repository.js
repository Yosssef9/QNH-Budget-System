import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function getBudgetSubItemsByTypeRepo({
  budgetTypeId,
  includeInactive = false,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .input("includeInactive", sql.Bit, includeInactive ? 1 : 0)
    .query(`
      SELECT
        bsi.id,
        bsi.budget_type_id,
        bt.name AS budget_type_name,
        bt.category_id,
        c.code AS category_code,
        c.name AS category_name,
        bsi.name,
        bsi.description,
        bsi.specification_summary,
        bsi.is_active,
        bsi.created_by,
        bsi.created_at,
        bsi.updated_by,
        bsi.updated_at
      FROM dbo.BS_budget_sub_items bsi
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = bsi.budget_type_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = bt.category_id
      WHERE bsi.budget_type_id = @budgetTypeId
        AND (@includeInactive = 1 OR bsi.is_active = 1)
      ORDER BY bsi.is_active DESC, bsi.name ASC
    `);

  return result.recordset || [];
}

export async function findBudgetSubItemByIdRepo(
  subItemId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("subItemId", sql.Int, subItemId)
    .query(`
      SELECT TOP 1
        bsi.id,
        bsi.budget_type_id,
        bt.name AS budget_type_name,
        bt.category_id,
        c.code AS category_code,
        c.name AS category_name,
        bsi.name,
        bsi.description,
        bsi.specification_summary,
        bsi.is_active,
        bsi.created_by,
        bsi.created_at,
        bsi.updated_by,
        bsi.updated_at
      FROM dbo.BS_budget_sub_items bsi
      INNER JOIN dbo.BS_budget_types bt
        ON bt.id = bsi.budget_type_id
      INNER JOIN dbo.BS_budget_categories c
        ON c.id = bt.category_id
      WHERE bsi.id = @subItemId
    `);

  return result.recordset[0] || null;
}

export async function findBudgetSubItemByNameRepo({
  budgetTypeId,
  name,
  excludeId = null,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .input("name", sql.NVarChar(255), name)
    .input("excludeId", sql.Int, excludeId)
    .query(`
      SELECT TOP 1 id
      FROM dbo.BS_budget_sub_items
      WHERE budget_type_id = @budgetTypeId
        AND UPPER(name) = UPPER(@name)
        AND (@excludeId IS NULL OR id <> @excludeId)
    `);

  return result.recordset[0] || null;
}

export async function createBudgetSubItemRepo({
  budgetTypeId,
  name,
  description,
  specificationSummary,
  createdBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("budgetTypeId", sql.Int, budgetTypeId)
    .input("name", sql.NVarChar(255), name)
    .input("description", sql.NVarChar(1000), description)
    .input("specificationSummary", sql.NVarChar(2000), specificationSummary)
    .input("createdBy", sql.Int, createdBy)
    .query(`
      INSERT INTO dbo.BS_budget_sub_items (
        budget_type_id,
        name,
        description,
        specification_summary,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @budgetTypeId,
        @name,
        @description,
        @specificationSummary,
        @createdBy
      )
    `);

  return result.recordset[0] || null;
}

export async function updateBudgetSubItemRepo({
  subItemId,
  name,
  description,
  specificationSummary,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("subItemId", sql.Int, subItemId)
    .input("name", sql.NVarChar(255), name)
    .input("description", sql.NVarChar(1000), description)
    .input("specificationSummary", sql.NVarChar(2000), specificationSummary)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_budget_sub_items
      SET
        name = COALESCE(@name, name),
        description = CASE
          WHEN @description IS NULL THEN description
          ELSE @description
        END,
        specification_summary = CASE
          WHEN @specificationSummary IS NULL THEN specification_summary
          ELSE @specificationSummary
        END,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @subItemId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function deactivateBudgetSubItemRepo({
  subItemId,
  updatedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("subItemId", sql.Int, subItemId)
    .input("updatedBy", sql.Int, updatedBy)
    .query(`
      UPDATE dbo.BS_budget_sub_items
      SET
        is_active = 0,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @subItemId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}
