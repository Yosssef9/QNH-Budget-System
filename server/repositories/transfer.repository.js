import { poolPromise, sql } from "../config/db.js";

export async function createTransferRepo(data) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("fromItem", sql.BigInt, data.from_budget_item_id)
    .input("toItem", sql.BigInt, data.to_budget_item_id)
    .input("amount", sql.Decimal(18, 2), data.amount)
    .input("reason", sql.NVarChar(sql.MAX), data.reason)
    .input("requestedBy", sql.Int, data.requested_by).query(`
      INSERT INTO BS_budget_transfers
      (
        from_budget_item_id,
        to_budget_item_id,
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
        @amount,
        @reason,
        @requestedBy,
        'PENDING_APPROVAL'
      )
    `);

  return result.recordset[0];
}

export async function getTransfersRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      t.*,

      f.id AS from_item_id,
      ft.name AS from_item_name,

      tt.name AS to_item_name

    FROM BS_budget_transfers t

    INNER JOIN BS_budget_items f
      ON f.id = t.from_budget_item_id

    INNER JOIN BS_budget_types ft
      ON ft.id = f.type_id

    LEFT JOIN BS_budget_items ti
      ON ti.id = t.to_budget_item_id

    LEFT JOIN BS_budget_types tt
      ON tt.id = ti.type_id

    ORDER BY t.requested_at DESC
  `);

  return result.recordset;
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
          tt.name AS to_item_name

      FROM BS_budget_transfers t

      INNER JOIN BS_budget_items fi
          ON fi.id = t.from_budget_item_id

      INNER JOIN BS_budget_types ft
          ON ft.id = fi.type_id

      LEFT JOIN BS_budget_items ti
          ON ti.id = t.to_budget_item_id

      LEFT JOIN BS_budget_types tt
          ON tt.id = ti.type_id

      WHERE t.id = @id
  `);

  return result.recordset[0] || null;
}
export async function getPendingTransfersRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
      SELECT
          t.*,

          ft.name AS from_item_name,
          tt.name AS to_item_name

      FROM BS_budget_transfers t

      INNER JOIN BS_budget_items fi
          ON fi.id = t.from_budget_item_id

      INNER JOIN BS_budget_types ft
          ON ft.id = fi.type_id

      LEFT JOIN BS_budget_items ti
          ON ti.id = t.to_budget_item_id

      LEFT JOIN BS_budget_types tt
          ON tt.id = ti.type_id

      WHERE t.status = 'PENDING_APPROVAL'

      ORDER BY t.requested_at DESC
  `);

  return result.recordset;
}
