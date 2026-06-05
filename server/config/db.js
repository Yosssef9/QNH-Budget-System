import "dotenv/config";
import sql from "mssql";
import { logger } from "../utils/logger.js";

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 1433),

  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000,
  },

  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    logger.info("SQL Server connected");
    return pool;
  })
  .catch((err) => {
    logger.error({
      message: "DB connection failed",
      error: err.message,
      stack: err.stack,
    });

    throw err;
  });
setInterval(async () => {
  try {
    const pool = await poolPromise;

    if (pool.pool) {
    }
  } catch (err) {
    console.error("POOL ERROR:", err);
  }
}, 5000);
export { sql, poolPromise };
