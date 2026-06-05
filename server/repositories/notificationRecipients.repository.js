import sql from "mssql";
import { poolPromise } from "../config/db.js";

export async function getUsersByPermissionRepo(permissionColumn) {
  const allowedPermissions = [
    "can_approve_transfer",
    "can_approve_budget",
    "can_manage_categories",
    "can_manage_financial_years",
  ];

  if (!allowedPermissions.includes(permissionColumn)) {
    throw new Error(`Invalid permission column: ${permissionColumn}`);
  }

  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT DISTINCT
      u.USER_ID,
      u.USER_NAME,
      u.email
    FROM BS_budget_user_roles r
    INNER JOIN USERS u
      ON u.USER_ID = r.user_id
    WHERE
      r.is_active = 1
      AND u.IS_ACTIVE = 1
      AND u.email IS NOT NULL
      AND r.${permissionColumn} = 1
  `);

  return result.recordset;
}

export async function getAllActiveUsersExceptRepo(actorUserId) {
  const pool = await poolPromise;

  const result = await pool.request().input("actorUserId", sql.Int, actorUserId)
    .query(`
      SELECT
        USER_ID,
        USER_NAME,
        email
      FROM USERS
      WHERE
        IS_ACTIVE = 1
        AND email IS NOT NULL
        AND USER_ID <> @actorUserId
    `);

  return result.recordset;
}

export async function getTransferRequesterRepo(transferId) {
  const pool = await poolPromise;

  const result = await pool.request().input("transferId", sql.Int, transferId)
    .query(`
      SELECT TOP 1
        u.USER_ID,
        u.USER_NAME,
        u.email
      FROM BS_budget_transfers t
      INNER JOIN USERS u
        ON u.USER_ID = t.requested_by
      WHERE t.id = @transferId
    `);

  return result.recordset;
}

export async function getBudgetOwnerRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.Int, budgetId)
    .query(`
      SELECT TOP 1
        u.USER_ID,
        u.USER_NAME,
        u.email
      FROM BS_budgets b
      INNER JOIN USERS u
        ON u.USER_ID = b.created_by
      WHERE b.id = @budgetId
    `);

  return result.recordset;
}

export async function getItemRequestOwnerRepo(requestId) {
  const pool = await poolPromise;

  const result = await pool.request().input("requestId", sql.Int, requestId)
    .query(`
      SELECT TOP 1
        u.USER_ID,
        u.USER_NAME,
        u.email
      FROM BS_budget_item_requests r
      INNER JOIN USERS u
        ON u.USER_ID = r.requested_by
      WHERE r.id = @requestId
    `);

  return result.recordset;
}
