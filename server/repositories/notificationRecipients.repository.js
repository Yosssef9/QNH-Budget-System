import sql from "mssql";
import { poolPromise } from "../config/db.js";

function activeBudgetUserExistsSql(userAlias = "u") {
  return `
    EXISTS (
      SELECT 1
      FROM dbo.BS_budget_user_roles bur
      INNER JOIN dbo.BS_budget_roles br
        ON br.id = bur.role_id
       AND br.is_active = 1
      WHERE bur.user_id = ${userAlias}.USER_ID
        AND bur.is_active = 1
    )
  `;
}

export async function getActiveBudgetUsersExceptRepo(actorUserId) {
  const pool = await poolPromise;

  const result = await pool.request().input("actorUserId", sql.Int, actorUserId)
    .query(`
      SELECT DISTINCT
        u.USER_ID,
        u.USER_NAME,
        u.email
      FROM dbo.USERS u
      INNER JOIN dbo.BS_budget_user_roles bur
        ON bur.user_id = u.USER_ID
       AND bur.is_active = 1
      INNER JOIN dbo.BS_budget_roles br
        ON br.id = bur.role_id
       AND br.is_active = 1
      WHERE
        u.IS_ACTIVE = 1
        AND u.email IS NOT NULL
        AND u.USER_ID <> @actorUserId
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
      INNER JOIN dbo.USERS u
        ON u.USER_ID = t.requested_by
      WHERE t.id = @transferId
        AND u.IS_ACTIVE = 1
        AND u.email IS NOT NULL
        AND ${activeBudgetUserExistsSql("u")}
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

      INNER JOIN BS_budget_user_roles bur
        ON bur.department_id = b.department_id
       AND bur.is_active = 1

      INNER JOIN BS_budget_roles br
        ON br.id = bur.role_id
       AND UPPER(br.name) = 'HOD'

      INNER JOIN dbo.USERS u
        ON u.USER_ID = bur.user_id

      WHERE b.id = @budgetId
        AND br.is_active = 1
        AND u.IS_ACTIVE = 1
        AND u.email IS NOT NULL
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
      INNER JOIN dbo.USERS u
        ON u.USER_ID = r.requested_by
      WHERE r.id = @requestId
        AND u.IS_ACTIVE = 1
        AND u.email IS NOT NULL
        AND ${activeBudgetUserExistsSql("u")}
    `);

  return result.recordset;
}

export async function getPOLinkRequesterRepo(poLinkId) {
  const pool = await poolPromise;

  const result = await pool.request().input("poLinkId", sql.BigInt, poLinkId)
    .query(`
      SELECT TOP 1
        U.USER_ID,
        U.USER_NAME,
        U.email
      FROM dbo.BS_category_po_links PL
      INNER JOIN dbo.USERS U
        ON U.USER_ID = PL.requested_by
      WHERE PL.id = @poLinkId
        AND U.IS_ACTIVE = 1
        AND U.email IS NOT NULL
        AND ${activeBudgetUserExistsSql("U")}
    `);

  return result.recordset;
}
