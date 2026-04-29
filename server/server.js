import "./config/env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import authRoutes from "./routes/auth.routes.js";
import adminUserRolesRoutes from "./routes/adminUserRoles.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { logger } from "./utils/logger.js";
import { ApiError } from "./utils/apiError.js";

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: ["http://your-frontend-url"],
  }),
);
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    logger.info({
      message: "HTTP Request",
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      user: req.user?.userName || "Guest",
    });
  });

  next();
});

app.get("/", (req, res) => {
  res.json({ message: "API running (ES6)" });
});
app.use("/api/auth", authRoutes);
app.use("/api/admin/user-roles", adminUserRolesRoutes);
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found", "NOT_FOUND"));
});
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
