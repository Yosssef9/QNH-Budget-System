import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/DashboardPage";
import LoginRequiredPage from "../pages/LoginRequiredPage";
import RequireAuth from "../context/RequireAuth";
import RequirePermission from "../context/RequirePermission";
import BudgetAccessManagementPage from "../pages/BudgetAccessManagementPage";
import CreateBudgetManualPage from "../pages/CreateBudgetManualPage";
import BudgetsPage from "../pages/BudgetsPage";
import FinancialYearsPage from "../pages/FinancialYearsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <DashboardLayout />
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
        path: "budgets/create",
        element: (
          <RequirePermission permission="can_edit_budget">
            <CreateBudgetManualPage />
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
