import { poolPromise, sql } from "../config/db.js";

export async function createTransferRepo(data) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("fromItem", sql.BigInt, data.from_budget_item_id)
    .input("toItem", sql.BigInt, data.to_budget_item_id)
    .input("amount", sql.Decimal(18, 2), data.amount)
    .input("reason", sql.NVarChar(sql.MAX), data.reason)
    .input("requestedBy", sql.Int, data.requested_by)
    .input("isNewItem", sql.Bit, data.is_new_item)
    .input("newItemTypeId", sql.BigInt, data.new_item_type_id)
    .input("newItemQty", sql.Decimal(18, 2), data.new_item_quantity)
    .input("newItemPrice", sql.Decimal(18, 2), data.new_item_unit_price)
    .input("newItemAmount", sql.Decimal(18, 2), data.new_item_total_amount)
    .query(`
      INSERT INTO BS_budget_transfers
      (
        from_budget_item_id,
        to_budget_item_id,

        is_new_item,

        new_item_type_id,
        new_item_quantity,
        new_item_unit_price,
        new_item_total_amount,

        amount,
        reason,
        requested_by,
        status
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @fromItem,
        @toItem,

        @isNewItem,

        @newItemTypeId,
        @newItemQty,
        @newItemPrice,
        @newItemAmount,

        @amount,
        @reason,
        @requestedBy,
        'PENDING_APPROVAL'
      )
    `);

  return result.recordset[0];
}

export async function approveTransferRepo(transferId, userId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, transferId)
    .input("userId", sql.Int, userId).query(`
      UPDATE BS_budget_transfers
      SET
        status='APPROVED',
        approved_by=@userId,
        approved_at=GETDATE()

      OUTPUT INSERTED.*

    WHERE id=@id
AND status='PENDING_APPROVAL'
    `);

  return result.recordset[0];
}
export async function rejectTransferRepo(transferId, userId, note) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.BigInt, transferId)
    .input("userId", sql.Int, userId)
    .input("note", sql.NVarChar(sql.MAX), note).query(`
      UPDATE BS_budget_transfers
      SET
        status='REJECTED',
        rejected_by=@userId,
        rejected_at=GETDATE(),
        rejection_note=@note

      OUTPUT INSERTED.*

     WHERE id=@id
AND status='PENDING_APPROVAL'
    `);

  return result.recordset[0];
}
export async function getTransferByIdRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.BigInt, id).query(`
   SELECT
  t.*,

  ft.name AS from_item_name,
  ft.expense_type AS from_expense_type,

  tt.name AS to_item_name,
  tt.expense_type AS to_expense_type,

  nit.name AS new_item_type_name,
  nit.expense_type AS new_item_expense_type,
  nc.name AS category_name,

     req.USER_NAME AS requested_by_name,
appr.USER_NAME AS approved_by_name,
rej.USER_NAME AS rejected_by_name

    FROM BS_budget_transfers t

    INNER JOIN BS_budget_items fi
      ON fi.id = t.from_budget_item_id

    INNER JOIN BS_budget_types ft
      ON ft.id = fi.type_id

    LEFT JOIN BS_budget_items ti
      ON ti.id = t.to_budget_item_id

    LEFT JOIN BS_budget_types tt
      ON tt.id = ti.type_id
LEFT JOIN BS_budget_types nit
  ON nit.id = t.new_item_type_id

LEFT JOIN BS_budget_categories nc
  ON nc.id = nit.category_id
   LEFT JOIN users req
  ON req.USER_ID = t.requested_by

LEFT JOIN users appr
  ON appr.USER_ID = t.approved_by

LEFT JOIN users rej
  ON rej.USER_ID = t.rejected_by

    WHERE t.id = @id
  `);

  return result.recordset[0] || null;
}

export async function getTransferItemsRepo({ departmentId }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("departmentId", sql.Int, departmentId).query(`
      SELECT
        bi.id,
        bi.budget_id,
        bt.name,
        bt.expense_type,
        bi.total_amount,
        b.department_id,
        b.financial_year_id,

        CASE
          WHEN locked.item_id IS NULL THEN 0
          ELSE 1
        END AS is_locked

      FROM BS_budget_items bi

      INNER JOIN BS_budgets b
        ON b.id = bi.budget_id

      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id

      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id

      LEFT JOIN (
          SELECT from_budget_item_id AS item_id
          FROM BS_budget_transfers
          WHERE status = 'PENDING_APPROVAL'

          UNION

          SELECT to_budget_item_id
          FROM BS_budget_transfers
          WHERE status = 'PENDING_APPROVAL'
      ) locked
        ON locked.item_id = bi.id

      WHERE
        b.status = 'APPROVED'
        AND fy.status = 'PRE_CLOSING'
        AND b.department_id = @departmentId

      ORDER BY
        locked.item_id DESC,
        bt.name
    `);

  return result.recordset;
}
export async function getMyTransfersRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
  t.*,

  ft.name AS from_item_name,
  ft.expense_type AS from_expense_type,

  tt.name AS to_item_name,
  tt.expense_type AS to_expense_type,

  nit.name AS new_item_type_name,
  nit.expense_type AS new_item_expense_type,
  nc.name AS category_name

    FROM BS_budget_transfers t

    INNER JOIN BS_budget_items fi
      ON fi.id = t.from_budget_item_id

    INNER JOIN BS_budget_types ft
      ON ft.id = fi.type_id

    LEFT JOIN BS_budget_items ti
      ON ti.id = t.to_budget_item_id

    LEFT JOIN BS_budget_types tt
      ON tt.id = ti.type_id

    LEFT JOIN BS_budget_types nit
      ON nit.id = t.new_item_type_id

    LEFT JOIN BS_budget_categories nc
      ON nc.id = nit.category_id

    ORDER BY t.requested_at DESC
  `);

  return result.recordset;
}
export async function getTransfersRepo(status) {
  const pool = await poolPromise;
  const request = pool.request();

  request.input(
    "status",
    sql.VarChar(30),
    status && status !== "ALL" ? status : null,
  );

  const result = await request.query(`
    SELECT
        t.*,

        b.id AS budget_id,
        b.department_id,

        d.name AS department_name,

        fy.year AS financial_year,

       ft.name AS from_item_name,
ft.expense_type AS from_expense_type,

tt.name AS to_item_name,
tt.expense_type AS to_expense_type,

nit.name AS new_item_type_name,
nit.expense_type AS new_item_expense_type,
nc.name AS category_name,

        fi.type_id AS from_type_id,
        ti.type_id AS to_type_id,

        fi.total_amount AS from_item_amount,
        ti.total_amount AS to_item_amount

    FROM BS_budget_transfers t

    INNER JOIN BS_budget_items fi
        ON fi.id = t.from_budget_item_id

    INNER JOIN BS_budgets b
        ON b.id = fi.budget_id

    LEFT JOIN BS_departments d
        ON d.id = b.department_id

    LEFT JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id

    INNER JOIN BS_budget_types ft
        ON ft.id = fi.type_id

    LEFT JOIN BS_budget_items ti
        ON ti.id = t.to_budget_item_id

    LEFT JOIN BS_budget_types tt
        ON tt.id = ti.type_id

    LEFT JOIN BS_budget_types nit
        ON nit.id = t.new_item_type_id

    LEFT JOIN BS_budget_categories nc
        ON nc.id = nit.category_id

    WHERE (
        @status IS NULL
        OR t.status = @status
    )

    ORDER BY t.requested_at DESC
  `);

  return result.recordset;
}
export async function getTransferDashboardRepo(
  userId,
  departmentId,
  isApprover,
) {
  const pool = await poolPromise;

  if (isApprover) {
    const result = await pool.request().query(`
      SELECT TOP 20
        *
      FROM BS_budget_transfers
      WHERE status = 'PENDING_APPROVAL'
      ORDER BY requested_at DESC
    `);

    return result.recordset;
  }

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("departmentId", sql.Int, departmentId || null).query(`
      SELECT TOP 20
          t.*
      FROM BS_budget_transfers t

      INNER JOIN BS_budget_items fi
          ON fi.id = t.from_budget_item_id

      INNER JOIN BS_budgets b
          ON b.id = fi.budget_id

      WHERE
      (
          t.requested_by = @userId
      )
      OR
      (
          @departmentId IS NOT NULL
          AND b.department_id = @departmentId
      )

      ORDER BY t.requested_at DESC
  `);

  return result.recordset;
}
export async function findPendingTransferForItemsRepo(fromItemId, toItemId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("fromItemId", sql.BigInt, fromItemId)
    .input("toItemId", sql.BigInt, toItemId).query(`
      SELECT TOP 1
          id,
          from_budget_item_id,
          to_budget_item_id
      FROM BS_budget_transfers
      WHERE status = 'PENDING_APPROVAL'
      AND (
            from_budget_item_id = @fromItemId
         OR to_budget_item_id = @fromItemId
         OR from_budget_item_id = @toItemId
         OR to_budget_item_id = @toItemId
      )
    `);

  return result.recordset[0] || null;
}
export async function findPendingNewItemTransferRepo(budgetId, typeId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.BigInt, budgetId)
    .input("typeId", sql.Int, typeId).query(`
      SELECT TOP 1
        t.id

      FROM BS_budget_transfers t

      INNER JOIN BS_budget_items bi
        ON bi.id = t.from_budget_item_id

      WHERE
        t.status = 'PENDING_APPROVAL'
        AND t.is_new_item = 1
        AND t.new_item_type_id = @typeId
        AND bi.budget_id = @budgetId
    `);

  return result.recordset[0] || null;
}
