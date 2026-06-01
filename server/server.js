import "./config/env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import authRoutes from "./routes/auth.routes.js";
import { poolPromise } from "./config/db.js";
// ✅ Budget Access feature (grouped clearly)
import budgetAccessAssignmentsRoutes from "./routes/budgetAccessAssignments.routes.js";
import budgetAccessUsersRoutes from "./routes/budgetAccessUsers.routes.js";
import budgetAccessDepartmentsRoutes from "./routes/budgetAccessDepartments.routes.js";
import budgetAccessRolesRoutes from "./routes/budgetAccessRoles.routes.js";

// Other features
import financialYearsRoutes from "./routes/financialYears.routes.js";
import budgetsRoutes from "./routes/budgets.routes.js";
import budgetItemsRoutes from "./routes/budgetItems.routes.js";
import budgetApprovalRoutes from "./routes/budgetApproval.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import itemRequestRoutes from "./routes/itemRequest.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { logger } from "./utils/logger.js";
import { ApiError } from "./utils/apiError.js";
import testRoutes from "./routes/test.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import budgetItemRoutes from "./routes/budgetItem.routes.js";

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: ["http://localhost:5173"],
  }),
);
app.use(express.json());

// Logging middleware
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

// Health check
app.get("/", (req, res) => {
  res.json({ message: "API running (ES6)" });
});

// Auth
app.use("/api/auth", authRoutes);

// ✅ Budget Access routes (grouped under one feature)
app.use("/api/admin/budget-access/assignments", budgetAccessAssignmentsRoutes);
app.use("/api/admin/budget-access/users", budgetAccessUsersRoutes);
app.use("/api/admin/budget-access/departments", budgetAccessDepartmentsRoutes);
app.use("/api/admin/budget-access/roles", budgetAccessRolesRoutes);

// Other features
app.use("/api/financial-years", financialYearsRoutes);
app.use("/api/budgets", budgetsRoutes);
app.use("/api/budgets", budgetItemsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budget-approval", budgetApprovalRoutes);
app.use("/api/item-requests", itemRequestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/test", testRoutes);
app.use("/api/budget-items", budgetItemRoutes);
// 404
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found", "NOT_FOUND"));
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
