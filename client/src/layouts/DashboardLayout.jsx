import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  CheckCircle2,
  Settings,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function getNavItems(budgetAccess) {
  const permissions = budgetAccess?.permissions || {};

  return [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, show: true },
    {
      label: "Financial Years",
      path: "/financial-years",
      icon: CalendarDays,
      show: permissions.can_manage_financial_years,
    },
    {
      label: "Budgets",
      path: "/budgets",
      icon: Wallet,
      show: permissions.can_view_budget,
    },
    {
      label: "Approvals",
      path: "/approvals",
      icon: CheckCircle2,
      show: permissions.can_approve_budget,
    },
    {
      label: "Manage Users",
      path: "/admin/users",
      icon: Settings,
      show: permissions.can_manage_users,
    },
    {
      label: "Reports",
      path: "/reports",
      icon: BarChart3,
      show: permissions.can_view_reports,
    },
  ].filter((item) => item.show);
}

export default function DashboardLayout() {
  const { user, budgetAccess } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = getNavItems(budgetAccess);
  const sidebarWidth = sidebarOpen ? "w-[280px]" : "w-[86px]";
  const contentPadding = sidebarOpen ? "pl-[280px]" : "pl-[86px]";

  return (
    <div className="min-h-screen bg-enterprise-bg font-sans text-enterprise-text">
      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        className={[
          "fixed inset-y-0 left-0 z-30 border-r border-enterprise-border bg-white shadow-sm",
          "transition-all duration-300 ease-in-out",
          sidebarWidth,
        ].join(" ")}
      >
        <div className="flex h-[72px] items-center justify-center border-b border-enterprise-border px-4">
          {sidebarOpen ? (
            <img
              src="/images/fullLogo.png"
              alt="Qassim National Hospital"
              className="h-auto max-h-[54px] w-full object-contain transition-all duration-300"
            />
          ) : (
            <img
              src="/images/logo.png"
              alt="QNH Logo"
              className="h-11 w-11 object-contain transition-all duration-300"
            />
          )}
        </div>

        <nav className="space-y-1.5 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                title={!sidebarOpen ? item.label : undefined}
                className={({ isActive }) =>
                  [
                    "group relative flex items-center rounded-2xl py-3 text-sm font-medium",
                    "transition-all duration-200",
                    sidebarOpen ? "gap-3 px-4" : "justify-center px-0",
                    isActive
                      ? "bg-primary-50 text-primary-700 shadow-soft"
                      : "text-enterprise-muted hover:bg-enterprise-soft hover:text-primary-700",
                  ].join(" ")
                }
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
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div
        className={[
          "min-h-screen transition-all duration-300 ease-in-out",
          contentPadding,
        ].join(" ")}
      >
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-enterprise-border bg-white/90 px-8 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-enterprise-text">
              Budget System
            </h1>

            <p className="mt-0.5 text-xs font-normal text-enterprise-muted">
              Manage yearly department budgets and approvals
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-enterprise-border bg-enterprise-soft px-4 py-2 text-sm font-medium text-enterprise-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              {(user?.userName || "U").charAt(0).toUpperCase()}
            </span>
            {user?.userName || "User"}
          </div>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
