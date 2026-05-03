import { poolPromise, sql } from "../config/db.js";

export async function getBudgetAccessUsersRepo({
  search = "",
  page = 1,
  pageSize = 50,
}) {
  const pool = await poolPromise;

  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.min(Math.max(Number(pageSize) || 50, 1), 100);
  const offset = (safePage - 1) * safePageSize;

  const result = await pool
    .request()
    .input("search", sql.NVarChar, `%${search}%`)
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, safePageSize).query(`
      SELECT
        USER_ID AS id,
        USER_CODE AS userCode,
        USER_NAME AS userName
      FROM users
      WHERE
        @search = '%%'
        OR USER_CODE LIKE @search
        OR USER_NAME LIKE @search
      ORDER BY USER_NAME
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY;

      SELECT COUNT(*) AS total
      FROM users
      WHERE
        @search = '%%'
        OR USER_CODE LIKE @search
        OR USER_NAME LIKE @search;
    `);
  const total = result.recordsets[1][0]?.total || 0;

  return {
    users: result.recordsets[0],
    total,
    page: safePage,
    pageSize: safePageSize,
    hasMore: safePage * safePageSize < total,
  };
}
