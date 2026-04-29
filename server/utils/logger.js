import winston from "winston";
import fs from "fs";
import path from "path";

// ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, errors, json, colorize } =
  winston.format;

// pretty console format
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}] ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ""
  }`;
});

export const logger = winston.createLogger({
  level: "info",

  format: combine(
    timestamp(),
    errors({ stack: true }), // log stack traces
    json()
  ),

  transports: [
    // console (development)
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), consoleFormat),
    }),

    // all logs
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      level: "info",
    }),

    // only errors
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
  ],
});