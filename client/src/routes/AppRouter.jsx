import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "budgets", element: <BudgetListPage /> },
      { path: "budgets/:id", element: <BudgetDetailsPage /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}