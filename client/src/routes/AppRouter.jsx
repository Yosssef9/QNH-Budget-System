import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { UnsavedChangesProvider } from "../context/UnsavedChangesContext";
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
    ],
  },
  {
    path: "/login-required",
    element: <LoginRequiredPage />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
