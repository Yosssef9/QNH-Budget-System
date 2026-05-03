import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/DashboardPage";
import LoginRequiredPage from "../pages/LoginRequiredPage";
import RequireAuth from "../context/RequireAuth";
import BudgetAccessManagementPage from "../pages/BudgetAccessManagementPage";
import CreateBudgetManualPage from "../pages/CreateBudgetManualPage";
import BudgetsPage from "../pages/BudgetsPage";
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
        element: <BudgetAccessManagementPage />,
      },
     {
  path: "budgets",
  element: <BudgetsPage />,
},
{
  path: "budgets/create",
  element: <CreateBudgetManualPage />,
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
