import sql from "mssql";
import { poolPromise } from "../config/db.js";

export async function withTransaction(callback) {
  const pool = await poolPromise;

  const trx = new sql.Transaction(pool);

  await trx.begin();

  try {
    const result = await callback(trx);

    await trx.commit();

    return result;
  } catch (error) {
    try {
      await trx.rollback();
    } catch {}

    throw error;
  }
}
