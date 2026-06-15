import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { UnsavedChangesProvider } from "../context/UnsavedChangesContext";
import RequireAuth from "../context/RequireAuth";
import RequirePermission from "../context/RequirePermission";

import DashboardLayout from "../layouts/DashboardLayout";
import ErrorPage from "../pages/ErrorPage";

import LoadingSpinner from "../components/LoadingSpinner";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <UnsavedChangesProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <DashboardLayout />
          </Suspense>
        </UnsavedChangesProvider>
      </RequireAuth>
    ),
    // errorElement: <ErrorPage />,

    children: [
      {
        index: true,
        async lazy() {
          const module = await import("../pages/DashboardPage");

          return {
            Component: module.default,
          };
        },
      },

      {
        path: "admin/users",
        async lazy() {
          const module = await import("../pages/BudgetAccessManagementPage");

          return {
            Component: () => (
              <RequirePermission permission="can_manage_users">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "budgets",
        async lazy() {
          const module = await import("../pages/BudgetsPage");

          return {
            Component: () => (
              <RequirePermission permission="can_view_budget">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "budgets/entry",
        async lazy() {
          const module = await import("../pages/budget/BudgetEnteryPage");

          return {
            Component: () => (
              <RequirePermission permission="can_edit_budget">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "budgets/my",
        async lazy() {
          const module = await import("../pages/budget/MyBudgetsPage");

          return {
            Component: () => (
              <RequirePermission permission="can_edit_budget">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "budgets/view/:budgetId",
        async lazy() {
          const module = await import("../pages/budget/BudgetViewPage");

          return {
            Component: () => (
              <RequirePermission permission="can_view_budget">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "financial-years",
        async lazy() {
          const module = await import("../pages/FinancialYearsPage");

          return {
            Component: () => (
              <RequirePermission permission="can_manage_financial_years">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "budget-approval",
        async lazy() {
          const module =
            await import("../pages/budget-approval/BudgetApprovalPage");

          return {
            Component: () => (
              <RequirePermission permission="can_approve_budget">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "admin/budget-setup",
        async lazy() {
          const module = await import("../pages/BudgetSetupPage");

          return {
            Component: () => (
              <RequirePermission permission="can_manage_categories">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "admin/audit-logs",
        async lazy() {
          const module = await import("../pages/AuditLogsPage");

          return {
            Component: () => (
              <RequirePermission permission="can_manage_users">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "transfers/requests",
        async lazy() {
          const module = await import("../pages/TransferPage");

          return {
            Component: () => (
              <RequirePermission permission="can_request_transfer">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "transfers/approvals",
        async lazy() {
          const module = await import("../pages/TransferApprovalPage");

          return {
            Component: () => (
              <RequirePermission permission="can_approve_transfer">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "po-linking",
        async lazy() {
          const module = await import("../pages/POLinkingPage");

          return {
            Component: () => (
              <RequirePermission permission="can_request_po_links">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "po-approvals",
        async lazy() {
          const module = await import("../pages/POApprovalPage");

          return {
            Component: () => (
              <RequirePermission permission="can_approve_po_links">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "budget-analytics",
        async lazy() {
          const module = await import("../pages/BudgetAnalyticsPage");

          return {
            Component: () => (
              <RequirePermission permission="can_approve_budget">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "reports",
        async lazy() {
          const module = await import("../pages/ReportsPage");

          return {
            Component: () => (
              <RequirePermission permission="can_view_reports">
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      // {
      //   path: "*",
      //   element: <ErrorPage />,
      // },
    ],
  },

  {
    path: "/login-required",

    async lazy() {
      const module = await import("../pages/LoginRequiredPage");

      return {
        Component: module.default,
      };
    },

    // errorElement: <ErrorPage />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
