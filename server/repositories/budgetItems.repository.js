import { poolPromise, sql } from "../config/db.js";

/**
 * Get budget basic info (for validation)
 */
export async function getBudgetByIdRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.Int, budgetId)
    .query(`
      SELECT 
        b.id,
        b.status,
        b.department_id,
        b.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status
      FROM BS_budgets b
      JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      WHERE b.id = @budgetId
        AND b.is_active = 1
    `);

  return result.recordset[0] || null;
}

/**
 * Validate category & type relation
 */
export async function validateTypeExistsRepo(typeId) {
  const pool = await poolPromise;

  const result = await pool.request().input("typeId", sql.Int, typeId).query(`
      SELECT TOP 1 id
      FROM BS_budget_types
      WHERE id = @typeId
        AND is_active = 1
    `);

  return !!result.recordset[0];
}

export async function getExistingBudgetItemTypeRepo(budgetId, typeId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.Int, budgetId)
    .input("typeId", sql.Int, typeId).query(`
      SELECT TOP 1 id
      FROM BS_budget_items
      WHERE budget_id = @budgetId
        AND type_id = @typeId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

/**
 * Insert budget item
 */
export async function createBudgetItemRepo({
  budgetId,
  typeId,
  quantity,
  unitPrice,
  totalAmount,
  distributionMethod,
  distributionLevel,
  isProject = false,
  createdBy,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.Int, budgetId)
    .input("typeId", sql.Int, typeId)
    .input("quantity", sql.Decimal(18, 2), quantity)
    .input("unitPrice", sql.Decimal(18, 2), unitPrice)
    .input("totalAmount", sql.Decimal(18, 2), totalAmount)
    .input("distributionMethod", sql.VarChar(50), distributionMethod)
    .input("distributionLevel", sql.VarChar(50), distributionLevel)
    .input("isProject", sql.Bit, isProject ? 1 : 0)
    .input("createdBy", sql.Int, createdBy).query(`
      INSERT INTO BS_budget_items (
        budget_id,
        type_id,
        quantity,
        unit_price,
        total_amount,
        distribution_method,
        distribution_level,
        is_project,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @budgetId,
        @typeId,
        @quantity,
        @unitPrice,
        @totalAmount,
        @distributionMethod,
        @distributionLevel,
        @isProject,
        @createdBy
      )
    `);

  return result.recordset[0];
}

/**
 * Insert distribution rows
 */
export async function insertDistributionRepo(itemId, distributionRows) {
  if (!distributionRows.length) return;

  const pool = await poolPromise;

  const request = pool.request().input("itemId", sql.Int, itemId);

  const values = distributionRows
    .map((row, index) => {
      request.input(`period_type_${index}`, sql.VarChar(20), row.period_type);
      request.input(`period_no_${index}`, sql.Int, row.period_no);
      request.input(`quantity_${index}`, sql.Decimal(18, 2), row.quantity);

      return `(
        @itemId,
        @period_type_${index},
        @period_no_${index},
        @quantity_${index}
      )`;
    })
    .join(",");

  await request.query(`
    INSERT INTO BS_budget_item_distribution (
      budget_item_id,
      period_type,
      period_no,
      quantity
    )
    VALUES ${values}
  `);
}

export async function getBudgetItemsByBudgetIdRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.Int, budgetId)
    .query(`
SELECT
  bi.id,
  bi.budget_id,
  t.category_id,
  c.name AS category_name,
  c.is_active AS category_is_active,
  bi.type_id,
  t.name AS type_name,
  t.is_active AS type_is_active,
  t.expense_type,
        bi.quantity,
        bi.unit_price,
       bi.total_amount,
bi.is_project,
bi.distribution_method,
bi.distribution_level,

bi.created_from_transfer,
bi.source_transfer_id,

d.period_type,
        d.period_no,
        d.quantity AS distribution_quantity
      FROM BS_budget_items bi
     INNER JOIN BS_budget_types t
  ON t.id = bi.type_id
INNER JOIN BS_budget_categories c
  ON c.id = t.category_id
      LEFT JOIN BS_budget_item_distribution d
        ON d.budget_item_id = bi.id
      WHERE bi.budget_id = @budgetId
        AND bi.is_active = 1
      ORDER BY bi.id ASC, d.period_no ASC
    `);

  return result.recordset;
}

export async function deleteBudgetItemRepo({ budgetId, itemId }) {
  const pool = await poolPromise;

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request2 = new sql.Request(transaction);

    const result = await request2
      .input("budgetId", sql.Int, budgetId)
      .input("itemId", sql.Int, itemId).query(`
    DELETE FROM BS_budget_item_distribution
    WHERE budget_item_id = @itemId;

    DELETE FROM BS_budget_items
    WHERE id = @itemId
      AND budget_id = @budgetId;
  `);

    await transaction.commit();

    return result.rowsAffected[0] > 0;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
export async function replaceBudgetItemsRepo({ budgetId, items, createdBy }) {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const normalizedItems = items.map((item) => ({
      id: item.id ? Number(item.id) : null,
      type_id: Number(item.type_id),
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      distribution_method: item.distribution_method,
      distribution_level: item.distribution_level,
      is_project:
        item.is_project === undefined || item.is_project === null
          ? null
          : item.is_project === true ||
            item.is_project === 1 ||
            item.is_project === "1",
      distribution: item.distribution || [],
    }));

    const duplicateTypes = normalizedItems
      .map((item) => item.type_id)
      .filter((typeId, index, arr) => arr.indexOf(typeId) !== index);

    if (duplicateTypes.length > 0) {
      throw new Error("Duplicate item/type found in budget items");
    }

    const existingResult = await new sql.Request(transaction).input(
      "budgetId",
      sql.Int,
      budgetId,
    ).query(`
       SELECT
  id,
  type_id,
  is_project
FROM BS_budget_items
WHERE budget_id = @budgetId
  AND is_active = 1
      `);

    const existingIds = existingResult.recordset.map((row) => Number(row.id));
    const existingTypeByItemId = new Map(
      existingResult.recordset.map((row) => [
        Number(row.id),
        Number(row.type_id),
      ]),
    );
    const existingProjectByItemId = new Map(
      existingResult.recordset.map((row) => [
        Number(row.id),
        row.is_project === true || row.is_project === 1,
      ]),
    );
    const sentExistingIds = normalizedItems
      .filter((item) => item.id && existingIds.includes(Number(item.id)))
      .map((item) => Number(item.id));

    const idsToHardDelete = existingIds.filter(
      (id) => !sentExistingIds.includes(id),
    );

    for (const itemId of idsToHardDelete) {
      await new sql.Request(transaction).input("itemId", sql.Int, itemId)
        .query(`
      DELETE FROM BS_budget_item_distribution
      WHERE budget_item_id = @itemId;

      DELETE FROM BS_budget_items
      WHERE id = @itemId;
    `);
    }
    for (const item of normalizedItems) {
      const existingTypeId = item.id
        ? existingTypeByItemId.get(Number(item.id))
        : null;

      const isNewItem = !item.id || !existingIds.includes(Number(item.id));
      const isProject =
        item.is_project === null
          ? existingProjectByItemId.get(Number(item.id)) === true
          : item.is_project === true;

      const typeChanged =
        !isNewItem && Number(existingTypeId) !== Number(item.type_id);

      if (isNewItem || typeChanged) {
        const activeTypeAndCategoryResult = await new sql.Request(
          transaction,
        ).input("typeId", sql.Int, item.type_id).query(`
      SELECT TOP 1
        t.id
      FROM BS_budget_types t
      INNER JOIN BS_budget_categories c
        ON c.id = t.category_id
      WHERE t.id = @typeId
        AND t.is_active = 1
        AND c.is_active = 1
    `);

        if (!activeTypeAndCategoryResult.recordset[0]) {
          throw new Error(
            "Inactive category or item/type cannot be selected for new budget rows",
          );
        }
      }
      const totalAmount = item.quantity * item.unit_price;
      let budgetItemId = item.id;

      if (item.id && existingIds.includes(Number(item.id))) {
        await new sql.Request(transaction)
          .input("itemId", sql.Int, item.id)
          .input("typeId", sql.Int, item.type_id)
          .input("quantity", sql.Decimal(18, 2), item.quantity)
          .input("unitPrice", sql.Decimal(18, 2), item.unit_price)
          .input("totalAmount", sql.Decimal(18, 2), totalAmount)
          .input(
            "distributionMethod",
            sql.VarChar(30),
            item.distribution_method,
          )
          .input("distributionLevel", sql.VarChar(30), item.distribution_level)
          .input("isProject", sql.Bit, isProject ? 1 : 0)
          .query(`
            UPDATE BS_budget_items
            SET
              type_id = @typeId,
              quantity = @quantity,
              unit_price = @unitPrice,
              total_amount = @totalAmount,
              distribution_method = @distributionMethod,
              distribution_level = @distributionLevel,
              is_project = @isProject,
              updated_at = GETUTCDATE()
            WHERE id = @itemId
              AND is_active = 1
          `);
      } else {
        const itemResult = await new sql.Request(transaction)
          .input("budgetId", sql.Int, budgetId)
          .input("typeId", sql.Int, item.type_id)
          .input("quantity", sql.Decimal(18, 2), item.quantity)
          .input("unitPrice", sql.Decimal(18, 2), item.unit_price)
          .input("totalAmount", sql.Decimal(18, 2), totalAmount)
          .input(
            "distributionMethod",
            sql.VarChar(30),
            item.distribution_method,
          )
          .input("distributionLevel", sql.VarChar(30), item.distribution_level)
          .input("isProject", sql.Bit, isProject ? 1 : 0)
          .input("createdBy", sql.Int, Number(createdBy)).query(`
            INSERT INTO BS_budget_items (
              budget_id,
              type_id,
              quantity,
              unit_price,
              total_amount,
              distribution_method,
              distribution_level,
              is_project,
              created_by
            )
            OUTPUT INSERTED.id
            VALUES (
              @budgetId,
              @typeId,
              @quantity,
              @unitPrice,
              @totalAmount,
              @distributionMethod,
              @distributionLevel,
              @isProject,
              @createdBy
            )
          `);

        budgetItemId = itemResult.recordset[0].id;
      }

      await new sql.Request(transaction).input(
        "budgetItemId",
        sql.Int,
        budgetItemId,
      ).query(`
          DELETE FROM BS_budget_item_distribution
          WHERE budget_item_id = @budgetItemId
        `);

      for (const period of item.distribution) {
        await new sql.Request(transaction)
          .input("budgetItemId", sql.Int, budgetItemId)
          .input("periodType", sql.VarChar(20), period.period_type)
          .input("periodNo", sql.Int, Number(period.period_no))
          .input("quantity", sql.Decimal(18, 2), Number(period.quantity || 0))
          .query(`
            INSERT INTO BS_budget_item_distribution (
              budget_item_id,
              period_type,
              period_no,
              quantity
            )
            VALUES (
              @budgetItemId,
              @periodType,
              @periodNo,
              @quantity
            )
          `);
      }
    }

    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
