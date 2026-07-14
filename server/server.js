import "./config/env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import authRoutes from "./routes/auth.routes.js";
import { poolPromise } from "./config/db.js";
// ✅ Budget Access feature (grouped clearly)
import accessManagementRoutes from "./modules/access-management/access.routes.js";
import masterCatalogRoutes from "./modules/master-catalog/masterCatalog.routes.js";
import {
  poItemMappingsRoutes,
  poLinkingRoutes,
} from "./modules/po-linking/poLinking.routes.js";
import projectsRoutes from "./routes/projects.routes.js";

// Other features
import financialYearsRoutes from "./modules/financial-years/financialYears.routes.js";
import departmentBudgetsRoutes from "./modules/department-budgets/departmentBudgets.routes.js";
import categoryReviewRoutes from "./modules/category-review/categoryReview.routes.js";
import categoryPackagesRoutes from "./modules/category-packages/categoryPackages.routes.js";
import cfoPackageReviewRoutes from "./modules/cfo-package-review/cfoPackageReview.routes.js";
import adjustmentRequestRoutes from "./modules/adjustment-requests/adjustmentRequests.routes.js";
import budgetApprovalRoutes from "./routes/budgetApproval.routes.js";
import itemRequestRoutes from "./modules/item-requests/itemRequests.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { logger } from "./utils/logger.js";
import { ApiError } from "./utils/apiError.js";
import testRoutes from "./routes/test.routes.js";
import transferRoutes from "./modules/transfers/transfers.routes.js";
import budgetItemRoutes from "./routes/budgetItem.routes.js";
import budgetAnalyticsRoutes from "./modules/budget-analytics/budgetAnalytics.routes.js";

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
app.use("/api/admin/budget-access", accessManagementRoutes);
app.use("/api/master-catalog", masterCatalogRoutes);
app.use("/api/admin/po-item-mappings", poItemMappingsRoutes);

// Other features
app.use("/api/financial-years", financialYearsRoutes);
app.use("/api/budgets", departmentBudgetsRoutes);
app.use("/api/category-review", categoryReviewRoutes);
app.use("/api/category-packages", categoryPackagesRoutes);
app.use("/api/cfo-package-review", cfoPackageReviewRoutes);
app.use("/api/adjustment-requests", adjustmentRequestRoutes);
app.use("/api/budget-approval", budgetApprovalRoutes);
app.use("/api/item-requests", itemRequestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/budget-analytics", budgetAnalyticsRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/test", testRoutes);
app.use("/api/budget-items", budgetItemRoutes);
app.use("/api/po-links", poLinkingRoutes);
app.use("/api/projects", projectsRoutes);
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
