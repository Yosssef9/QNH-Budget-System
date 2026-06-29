import sql from "mssql";
import { poolPromise } from "../config/db.js";

export async function getUsersByPermissionRepo(permissionColumn) {
  const allowedPermissions = [
    "can_approve_transfer",
    "can_approve_budget",
    "can_manage_categories",
    "can_manage_financial_years",
    "can_approve_po_links",
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
    LEFT JOIN BS_budget_role_permissions brp
      ON brp.role_id = r.role_id
    INNER JOIN USERS u
      ON u.USER_ID = r.user_id
    WHERE
      r.is_active = 1
      AND u.IS_ACTIVE = 1
      AND u.email IS NOT NULL
      AND COALESCE(r.${permissionColumn}, brp.${permissionColumn}, 0) = 1
  `);

  return result.recordset;
}

export async function getBudgetChangeRequestReviewersRepo({ categoryId }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT DISTINCT
        u.USER_ID,
        u.USER_NAME,
        u.email
      FROM BS_budget_user_roles r
      LEFT JOIN BS_budget_role_permissions brp
        ON brp.role_id = r.role_id
      INNER JOIN BS_budget_roles br
        ON br.id = r.role_id
      INNER JOIN USERS u
        ON u.USER_ID = r.user_id
      INNER JOIN BS_budget_categories c
        ON c.id = @categoryId
      WHERE
        r.is_active = 1
        AND u.IS_ACTIVE = 1
        AND u.email IS NOT NULL
        AND (
          COALESCE(r.can_approve_budget, brp.can_approve_budget, 0) = 1
          OR (
            UPPER(br.name) = 'CATEGORY BUDGET MANAGER'
            AND r.category_id = c.id
          )
        )
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

export async function getCategoryTransferRequesterRepo(categoryTransferId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryTransferId", sql.BigInt, categoryTransferId)
    .query(`
      SELECT TOP 1
        u.USER_ID,
        u.USER_NAME,
        u.email
      FROM BS_category_budget_transfers t
      INNER JOIN USERS u
        ON u.USER_ID = t.requested_by
      WHERE t.id = @categoryTransferId
    `);

  return result.recordset;
}

export async function getCategoryPoLinkRequesterRepo(categoryPoLinkId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("categoryPoLinkId", sql.BigInt, categoryPoLinkId)
    .query(`
      SELECT TOP 1
        u.USER_ID,
        u.USER_NAME,
        u.email
      FROM BS_category_po_links pl
      INNER JOIN USERS u
        ON u.USER_ID = pl.requested_by
      WHERE pl.id = @categoryPoLinkId
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

      INNER JOIN USERS u
        ON u.USER_ID = bur.user_id

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

export async function getPOLinkRequesterRepo(poLinkId) {
  const pool = await poolPromise;

  const result = await pool.request().input("poLinkId", sql.BigInt, poLinkId)
    .query(`
      SELECT TOP 1
        U.USER_ID,
        U.USER_NAME,
        U.email
      FROM BS_PO_LINKS PL
      INNER JOIN USERS U
        ON U.USER_ID = PL.REQUESTED_BY
      WHERE PL.ID = @poLinkId
    `);

  return result.recordset;
}
