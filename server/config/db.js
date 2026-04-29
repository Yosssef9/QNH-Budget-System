import sql from "mssql";
import { logger } from "../utils/logger.js";

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 1433),
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

export { sql, poolPromise };
