import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
}