import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { UnsavedChangesProvider } from "../context/UnsavedChangesContext";
import ErrorPage from "../pages/ErrorPage";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/DashboardPage";
import LoginRequiredPage from "../pages/LoginRequiredPage";
import RequireAuth from "../context/RequireAuth";
import RequirePermission from "../context/RequirePermission";
import BudgetAccessManagementPage from "../pages/BudgetAccessManagementPage";
import BudgetEnteryPage from "../pages/budget/BudgetEnteryPage";
import BudgetsPage from "../pages/BudgetsPage";
import FinancialYearsPage from "../pages/FinancialYearsPage";
import BudgetApprovalPage from "../pages/budget-approval/BudgetApprovalPage";
import BudgetSetupPage from "../pages/BudgetSetupPage";
import AuditLogsPage from "../pages/AuditLogsPage";
import ReportsPage from "../pages/ReportsPage";
import TransferPage from "../pages/TransferPage";
import MyBudgetsPage from "../pages/budget/MyBudgetsPage";
import BudgetViewPage from "../pages/budget/BudgetViewPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <UnsavedChangesProvider>
          <DashboardLayout />
        </UnsavedChangesProvider>
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "admin/users",
        element: (
          <RequirePermission permission="can_manage_users">
            <BudgetAccessManagementPage />
          </RequirePermission>
        ),
      },
      {
        path: "budgets",
        element: (
          <RequirePermission permission="can_view_budget">
            <BudgetsPage />
          </RequirePermission>
        ),
      },
      {
        path: "budgets/entry",
        element: (
          <RequirePermission permission="can_edit_budget">
            <BudgetEnteryPage />
          </RequirePermission>
        ),
      },
      {
        path: "budgets/my",
        element: (
          <RequirePermission permission="can_edit_budget">
            <MyBudgetsPage />
          </RequirePermission>
        ),
      },
      {
        path: "budgets/view/:budgetId",
        element: (
          <RequirePermission permission="can_view_budget">
            <BudgetViewPage />
          </RequirePermission>
        ),
      },
      {
        path: "financial-years",
        element: (
          <RequirePermission permission="can_manage_financial_years">
            <FinancialYearsPage />
          </RequirePermission>
        ),
      },
      {
        path: "budget-approval",
        element: (
          <RequirePermission permission="can_approve_budget">
            <BudgetApprovalPage />
          </RequirePermission>
        ),
      },
      {
        path: "admin/budget-setup",
        element: (
          <RequirePermission permission="can_manage_categories">
            <BudgetSetupPage />
          </RequirePermission>
        ),
      },
      {
        path: "admin/audit-logs",
        element: (
          <RequirePermission permission="can_manage_users">
            <AuditLogsPage />
          </RequirePermission>
        ),
      },
      {
        path: "transfers",
        element: (
          <RequirePermission permission="can_request_transfer">
            <TransferPage />
          </RequirePermission>
        ),
      },
      {
        path: "reports",
        element: (
          <RequirePermission permission="can_view_reports">
            <ReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
    ],
  },
  {
    path: "/login-required",
    element: <LoginRequiredPage />,
    errorElement: <ErrorPage />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
