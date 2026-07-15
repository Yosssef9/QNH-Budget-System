import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { UnsavedChangesProvider } from "../context/UnsavedChangesContext";
import RequireAuth from "../context/RequireAuth";
import RequirePermission from "../context/RequirePermission";
import { PERMISSION_CODES } from "@qnh/permissions";

import DashboardLayout from "../layouts/DashboardLayout";

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
              <RequirePermission permission={PERMISSION_CODES.MANAGE_BUDGET_ACCESS}>
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
              <RequirePermission
                permission={[
                  PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
                  PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
                  PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
                ]}
              >
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
              <RequirePermission
                permission={PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS}
              >
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
              <RequirePermission
                permission={[
                  PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
                  PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
                  PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
                ]}
              >
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "budgets/all",
        async lazy() {
          const module = await import("../pages/budget/AllBudgetsPage");

          return {
            Component: () => (
              <RequirePermission
                permission={PERMISSION_CODES.VIEW_BUDGET_REPORTS}
              >
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
              <RequirePermission
                permission={[
                  PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
                  PERMISSION_CODES.VIEW_BUDGET_REPORTS,
                  PERMISSION_CODES.MANAGE_BUDGET_ACCESS,
                ]}
              >
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "projects",
        async lazy() {
          const module = await import("../pages/projects/ProjectsPage");

          return {
            Component: () => (
              <RequirePermission
                permission={[
                  PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
                  PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
                  PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
                ]}
              >
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "projects/:budgetItemId",
        async lazy() {
          const module = await import("../pages/projects/ProjectDetailsPage");

          return {
            Component: () => (
              <RequirePermission
                permission={[
                  PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
                  PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
                  PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
                ]}
              >
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
              <RequirePermission
                permission={PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE}
              >
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "category-review",
        async lazy() {
          const module =
            await import("../pages/category-review/CategoryReviewPage");

          return {
            Component: () => (
              <RequirePermission
                permission={PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS}
              >
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "cfo-review",
        async lazy() {
          const module =
            await import("../pages/cfo-package-review/CfoPackageReviewPage");

          return {
            Component: () => (
              <RequirePermission
                permission={PERMISSION_CODES.VIEW_BUDGET_REPORTS}
              >
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
              <RequirePermission permission={PERMISSION_CODES.MANAGE_BUDGET_CATALOG}>
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "admin/po-item-mappings",
        async lazy() {
          const module = await import("../pages/POItemMappingsPage");

          return {
            Component: () => (
              <RequirePermission permission={PERMISSION_CODES.MANAGE_PO_ITEM_MAPPINGS}>
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
              <RequirePermission permission={PERMISSION_CODES.VIEW_AUDIT_LOGS}>
                <module.default />
              </RequirePermission>
            ),
          };
        },
      },

      {
        path: "admin/system-health",
        async lazy() {
          const module = await import("../pages/SystemHealthPage");

          return {
            Component: () => (
              <RequirePermission permission={PERMISSION_CODES.VIEW_SYSTEM_HEALTH}>
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
              <RequirePermission permission={PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS}>
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
              <RequirePermission permission={PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS}>
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
              <RequirePermission permission={PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS}>
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
              <RequirePermission permission={PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS}>
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
              <RequirePermission
                permission={PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES}
              >
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
              <RequirePermission permission={PERMISSION_CODES.VIEW_BUDGET_REPORTS}>
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
  {
  path: "/budget-access-denied",

  async lazy() {
    const module = await import(
      "../pages/BudgetAccessDeniedPage"
    );

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
