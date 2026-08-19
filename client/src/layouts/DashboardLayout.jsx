import { useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  CheckCircle2,
  Settings,
  BarChart3,
  ChevronRight,
  Tags,
  History,
  Activity,
  Repeat2,
  Link2,
  BriefcaseBusiness,
  LogOut,
  ChevronDown,
  ClipboardCheck,
  ShoppingCart,
  Building2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUnsavedChanges } from "../context/UnsavedChangesContext";
import { can } from "../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import WorkspaceSelectionDialog from "../components/WorkspaceSelectionDialog";
import { formatWorkspaceSummary } from "../helpers/workspaceLabels";
import toast from "react-hot-toast";
const appBaseUrl = import.meta.env.BASE_URL;
function getSidebarSections(budgetAccess) {
  const canViewDepartmentBudgets = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
  );
  const canManageDepartmentBudgets = can(
    budgetAccess,
    PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
  );
  const canSubmitDepartmentBudgets = can(
    budgetAccess,
    PERMISSION_CODES.SUBMIT_DEPARTMENT_CATEGORY_BUDGETS,
  );
  const canViewCfoPackages = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
  );
  const canApprovePackages = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
  );
  const canViewBudgetReports = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_BUDGET_REPORTS,
  );
  const canViewCategoryRequests = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
  );
  const canCreateTransfers = can(
    budgetAccess,
    PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
  );
  const canApproveTransfers = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS,
  );
  const canRequestPoLinks = can(
    budgetAccess,
    PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS,
  );
  const canApprovePoLinks = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS,
  );
  const canViewPurchasingPrices = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_PURCHASING_PRICE_REVIEWS,
  );

  return [
    {
      title: "MAIN",
      items: [
        { label: "Dashboard", path: "/", icon: LayoutDashboard, show: true },
        {
          label: "Financial Years",
          path: "/financial-years",
          icon: CalendarDays,
          show: can(
            budgetAccess,
            PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
          ),
        },
        {
          label: canViewCategoryRequests ? "Category Budget" : "Budgets",
          path: "/budgets",
          icon: Wallet,
          show:
            (canViewDepartmentBudgets || canViewCategoryRequests) &&
            !canViewCfoPackages &&
            !canApprovePackages,
        },
        {
          label: "All Budgets",
          path: "/budgets/all",
          icon: Wallet,
          show: canViewBudgetReports,
        },
        {
          label: "Budget Analytics",
          path: "/budget-analytics",
          icon: BarChart3,
          show: canViewBudgetReports,
        },
        // {
        //   label: "Projects",
        //   path: "/projects",
        //   icon: BriefcaseBusiness,
        //   show:
        //     canViewDepartmentBudgets ||
        //     canManageDepartmentBudgets ||
        //     canSubmitDepartmentBudgets ||
        //     canViewCfoPackages ||
        //     canApprovePackages,
        // },
        {
          label: "Category Review",
          path: "/category-review",
          icon: ClipboardCheck,
          show: canViewCategoryRequests,
        },
        {
          label: "Purchasing Price Review",
          path: "/purchasing-price-review",
          icon: ShoppingCart,
          show: canViewPurchasingPrices,
        },
        {
          label: "CFO Review",
          path: "/cfo-review",
          icon: CheckCircle2,
          show: canViewCfoPackages || canApprovePackages,
        },
        {
          label: "Transfers",
          path: canApproveTransfers
            ? "/transfers/approvals"
            : "/transfers/requests",
          icon: Repeat2,
          show: canCreateTransfers || canApproveTransfers,
        },
        {
          label: "PO Link Requests",
          path: "/po-linking",
          icon: Link2,
          show: canRequestPoLinks,
        },
        {
          label: "PO Link Approvals",
          path: "/po-approvals",
          icon: CheckCircle2,
          show: canApprovePoLinks,
        },
        {
          label: "Reports",
          path: "/reports",
          icon: BarChart3,
          show: can(budgetAccess, PERMISSION_CODES.VIEW_BUDGET_REPORTS),
        },
      ],
    },
    {
      title: "ADMINISTRATION",
      items: [
        {
          label: "User Access",
          path: "/admin/users",
          icon: Settings,
          show: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_ACCESS),
        },
        {
          label: "Budget Configuration",
          path: "/admin/budget-setup",
          icon: Tags,
          show: can(budgetAccess, PERMISSION_CODES.MANAGE_BUDGET_CATALOG),
        },
        {
          label: "Departments",
          path: "/admin/departments",
          icon: Building2,
          show: can(budgetAccess, PERMISSION_CODES.MANAGE_DEPARTMENTS),
        },
        {
          label: "PO Item Mappings",
          path: "/admin/po-item-mappings",
          icon: Link2,
          show: can(budgetAccess, PERMISSION_CODES.MANAGE_PO_ITEM_MAPPINGS),
        },
        {
          label: "Audit Logs",
          path: "/admin/audit-logs",
          icon: History,
          show: can(budgetAccess, PERMISSION_CODES.VIEW_AUDIT_LOGS),
        },
        {
          label: "System Health",
          path: "/admin/system-health",
          icon: Activity,
          show: can(budgetAccess, PERMISSION_CODES.VIEW_SYSTEM_HEALTH),
        },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.show),
    }))
    .filter((section) => section.items.length > 0);
}

function canAccessPath(pathname, budgetAccess) {
  const checks = [
    { path: "/admin/users", permission: PERMISSION_CODES.MANAGE_BUDGET_ACCESS },
    {
      path: "/budgets/entry",
      permission: PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
    },
    {
      path: "/budgets/my",
      permission: [
        PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
        PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
        PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
      ],
    },
    {
      path: "/budgets/all",
      permission: PERMISSION_CODES.VIEW_BUDGET_REPORTS,
    },
    {
      path: "/budgets/view",
      permission: [
        PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
        PERMISSION_CODES.VIEW_BUDGET_REPORTS,
        PERMISSION_CODES.MANAGE_BUDGET_ACCESS,
      ],
    },
    {
      path: "/projects",
      permission: [
        PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
        PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
        PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
      ],
    },
    {
      path: "/financial-years",
      permission: PERMISSION_CODES.MANAGE_FINANCIAL_YEAR_LIFECYCLE,
    },
    {
      path: "/category-review",
      permission: PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
    },
    {
      path: "/purchasing-price-review",
      permission: PERMISSION_CODES.VIEW_PURCHASING_PRICE_REVIEWS,
    },
    {
      path: "/cfo-review",
      permission: PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
    },
    {
      path: "/admin/budget-setup",
      permission: PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
    },
    {
      path: "/admin/departments",
      permission: PERMISSION_CODES.MANAGE_DEPARTMENTS,
    },
    {
      path: "/admin/po-item-mappings",
      permission: PERMISSION_CODES.MANAGE_PO_ITEM_MAPPINGS,
    },
    { path: "/admin/audit-logs", permission: PERMISSION_CODES.VIEW_AUDIT_LOGS },
    {
      path: "/admin/system-health",
      permission: PERMISSION_CODES.VIEW_SYSTEM_HEALTH,
    },
    {
      path: "/transfers/requests",
      permission: PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
    },
    {
      path: "/transfers/approvals",
      permission: PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS,
    },
    {
      path: "/po-linking",
      permission: PERMISSION_CODES.REQUEST_CATEGORY_PO_LINKS,
    },
    {
      path: "/po-approvals",
      permission: PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS,
    },
    {
      path: "/budget-analytics",
      permission: PERMISSION_CODES.VIEW_BUDGET_REPORTS,
    },
    { path: "/reports", permission: PERMISSION_CODES.VIEW_BUDGET_REPORTS },
  ];
  const matchedCheck = checks.find((check) =>
    pathname === check.path || pathname.startsWith(`${check.path}/`),
  );

  if (!matchedCheck) return true;
  return can(budgetAccess, matchedCheck.permission);
}

export default function DashboardLayout() {
  const {
    user,
    budgetAccess,
    logout,
    availableWorkspaces,
    selectedWorkspaceId,
    switchWorkspace,
    workspaceSwitching,
    workspaceSelectionRequired,
    dismissWorkspaceSelection,
  } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const workspaceButtonRef = useRef(null);
  const queryClient = useQueryClient();
  const location = useLocation();
  const { safeNavigate } = useUnsavedChanges();
  const sidebarSections = getSidebarSections(budgetAccess);
  const sidebarWidth = sidebarOpen ? "w-[280px]" : "w-[86px]";
  const contentPadding = sidebarOpen ? "pl-[280px]" : "pl-[86px]";
  const activeWorkspace =
    budgetAccess?.selectedWorkspace || budgetAccess?.workspace || budgetAccess;
  const workspaceSummary = formatWorkspaceSummary(activeWorkspace);
  const isWorkspaceDialogOpen =
    workspaceDialogOpen || workspaceSelectionRequired;

  async function handleWorkspaceSelect(userRoleId) {
    if (
      Number(userRoleId) === Number(selectedWorkspaceId) &&
      !workspaceSelectionRequired
    ) {
      setWorkspaceDialogOpen(false);
      dismissWorkspaceSelection();
      return;
    }

    try {
      const nextAccess = await switchWorkspace(userRoleId);
      queryClient.clear();

      if (!canAccessPath(location.pathname, nextAccess)) {
        safeNavigate("/");
      }

      setWorkspaceDialogOpen(false);
      dismissWorkspaceSelection();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to switch workspace",
      );
    }
  }

  return (
    <div className="min-h-screen bg-enterprise-bg font-sans text-enterprise-text">
      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        className={[
          "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-blue-200 bg-white shadow-sm",
          "transition-all duration-300 ease-in-out",
          sidebarWidth,
        ].join(" ")}
      >
        <div className="flex h-[90px] items-center justify-center border-b border-enterprise-border px-4">
          {sidebarOpen ? (
            <img
             src={`${appBaseUrl}images/fullLogo.png`}
              alt="Qassim National Hospital"
              className="h-auto max-h-[54px] w-full object-contain transition-all duration-300"
            />
          ) : (
            <img
             src={`${appBaseUrl}images/logo.png`}
              alt="QNH Logo"
              className="h-14 w-14 object-contain transition-all duration-300"
            />
          )}
        </div>

        <nav
          className="
    flex-1
overflow-y-hidden hover:overflow-y-auto
    space-y-6
    p-4
    scrollbar-thin
    scrollbar-thumb-slate-300
    scrollbar-track-transparent
  "
        >
          {" "}
          {sidebarSections.map((section) => (
            <div key={section.title}>
              {sidebarOpen && (
                <div className="mb-2 px-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {section.title}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.path);

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => safeNavigate(item.path)}
                      title={!sidebarOpen ? item.label : undefined}
                      className={[
                        "group relative flex w-full items-center rounded-2xl py-3 text-sm font-medium",
                        "transition-all duration-200",
                        sidebarOpen ? "gap-3 px-4" : "justify-center px-0",
                        isActive
                          ? "bg-primary-50 text-primary-700 shadow-soft"
                          : "text-enterprise-muted hover:bg-enterprise-soft hover:text-primary-700",
                      ].join(" ")}
                    >
                      <Icon
                        size={20}
                        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                      />

                      <span
                        className={[
                          "whitespace-nowrap tracking-normal transition-all duration-300",
                          sidebarOpen
                            ? "w-auto translate-x-0 opacity-100"
                            : "w-0 -translate-x-2 overflow-hidden opacity-0",
                        ].join(" ")}
                      >
                        {item.label}
                      </span>

                      {sidebarOpen && (
                        <ChevronRight
                          size={15}
                          className="ml-auto opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={logout}
            title={!sidebarOpen ? "Logout" : undefined}
            className={[
              "group relative flex w-full items-center rounded-2xl py-3 text-sm font-semibold",
              "bg-red-50 text-red-700 border border-red-200",
              "transition-all duration-200",
              "hover:bg-red-100 hover:border-red-300 hover:text-red-800",
              sidebarOpen ? "gap-3 px-4" : "justify-center px-0",
            ].join(" ")}
          >
            <LogOut
              size={20}
              className="shrink-0 text-red-600 transition-transform duration-200 group-hover:scale-110"
            />

            <span
              className={[
                "whitespace-nowrap tracking-normal transition-all duration-300",
                sidebarOpen
                  ? "w-auto translate-x-0 opacity-100"
                  : "w-0 -translate-x-2 overflow-hidden opacity-0",
              ].join(" ")}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      <div
        className={[
          "min-h-screen transition-all duration-300 ease-in-out",
          contentPadding,
        ].join(" ")}
      >
        <header
          className="
    sticky top-0 z-20
    flex h-[90px] items-center justify-between
    border-b border-blue-300
    bg-white/95
    px-8
    backdrop-blur
    shadow-[0_2px_12px_rgba(15,23,42,0.04)]
  "
        >
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-enterprise-text">
              Budget System
            </h1>

            <p className="mt-0.5 text-xs font-normal text-enterprise-muted">
              Manage yearly department budgets and approvals
            </p>
          </div>

          <button
            ref={workspaceButtonRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isWorkspaceDialogOpen}
            aria-label={`Switch budget workspace. Current workspace: ${workspaceSummary}`}
            onClick={() => setWorkspaceDialogOpen(true)}
            className="
    flex items-center gap-3
    rounded-2xl
    border border-slate-200
    bg-slate-50
    px-4 py-2.5
    shadow-sm
    cursor-pointer
    transition
    hover:border-primary-300 hover:bg-primary-50
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500
  "
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
    border border-blue-400 bg-slate-200 text-sm font-bold text-slate-700"
            >
              {(user?.userName || "U").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-5 text-slate-950">
                {user?.userName || "User"}
              </p>

              <div className="mt-0.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />

                <p className="truncate text-xs font-semibold leading-4 text-slate-500">
                  {workspaceSummary}
                </p>
              </div>
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <ChevronDown
              size={16}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </button>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>

      <WorkspaceSelectionDialog
        open={isWorkspaceDialogOpen}
        workspaces={availableWorkspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        switching={workspaceSwitching}
        requireSelection={workspaceSelectionRequired}
        onSelect={handleWorkspaceSelect}
        onClose={() => {
          setWorkspaceDialogOpen(false);
          dismissWorkspaceSelection();
        }}
        returnFocusRef={workspaceButtonRef}
      />
    </div>
  );
}
