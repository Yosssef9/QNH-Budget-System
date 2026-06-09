import sql from "mssql";

export function createRequest(pool, transaction = null) {
  return transaction ? new sql.Request(transaction) : pool.request();
}
