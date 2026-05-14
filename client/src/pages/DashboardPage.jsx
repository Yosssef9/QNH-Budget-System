import {
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Users,
  BarChart3,
  Building2,
  FileSpreadsheet,
  Link2,
  Repeat2,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can, getUserRoleLabel } from "../helpers/permissions";

function getStats(budgetAccess) {
  return [
    {
      title: "Current Financial Year",
      value: "2027",
      description: "Open for budget entry",
      icon: CalendarDays,
      show: true,
    },
    {
      title:
        can(budgetAccess, "can_approve_budget") ||
        can(budgetAccess, "can_manage_users")
          ? "Budget Scope"
          : "My Department",

      value:
        can(budgetAccess, "can_approve_budget") ||
        can(budgetAccess, "can_manage_users")
          ? "All Departments"
          : budgetAccess?.department?.name || "My Department",

      description:
        can(budgetAccess, "can_approve_budget") ||
        can(budgetAccess, "can_manage_users")
          ? "You can view budgets for all departments"
          : "You can view only your department budget",

      icon: Building2,
      show: true,
    },
    {
      title: "Draft / Returned Budgets",
      value: "0",
      description: "Budgets that need editing or resubmission",
      icon: Wallet,
      show: can(budgetAccess, "can_edit_budget"),
    },
    {
      title: "Pending Budget Approvals",
      value: "0",
      description: "Budgets waiting for your decision",
      icon: Clock3,
      show: can(budgetAccess, "can_approve_budget"),
    },
    {
      title: "Pending Transfer Approvals",
      value: "0",
      description: "Transfer requests waiting review",
      icon: Repeat2,
      show: can(budgetAccess, "can_approve_transfer"),
    },
    {
      title: "Approved Budgets",
      value: "0",
      description: "Approved active department budgets",
      icon: CheckCircle2,
      show: can(budgetAccess, "can_view_budget"),
    },
    {
      title: "Exceeded Items",
      value: "0",
      description: "Items with negative remaining balance",
      icon: AlertTriangle,
      show: can(budgetAccess, "can_view_reports"),
    },
    {
      title: "System Users",
      value: "0",
      description: "Users with Budget System access",
      icon: Users,
      show: can(budgetAccess, "can_manage_users"),
    },
  ].filter((item) => item.show);
}

function getQuickActions(budgetAccess) {
  return [
    {
      title: "Manage Financial Years",
      description: "Create and control active budget years.",
      path: "/financial-years",
      icon: CalendarDays,
      show: can(budgetAccess, "can_manage_financial_years"),
    },
    {
      title: "View Budgets",
      description: "Review assigned department budgets.",
      path: "/budgets",
      icon: Wallet,
      show: can(budgetAccess, "can_view_budget"),
    },
    {
      title: "Create / Edit Budget",
      description: "Enter, import, copy, and submit budgets.",
      path: "/budgets",
      icon: FileSpreadsheet,
      show: can(budgetAccess, "can_edit_budget"),
    },
    {
      title: "Link Approved PO",
      description: "Connect approved CareWare PO lines to budget items.",
      path: "/budgets",
      icon: Link2,
      show: can(budgetAccess, "can_link_po"),
    },
    {
      title: "Request Transfer",
      description: "Move balance between existing or new budget items.",
      path: "/budgets",
      icon: Repeat2,
      show: can(budgetAccess, "can_request_transfer"),
    },
    {
      title: "Approve Budgets",
      description: "Approve or return submitted budgets.",
      path: "/budget-approval",
      icon: ShieldCheck,
      show: can(budgetAccess, "can_approve_budget"),
    },
    {
      title: "Approve Transfers",
      description: "Approve or reject transfer requests.",
      path: "/budget-approval",
      icon: Repeat2,
      show: can(budgetAccess, "can_approve_transfer"),
    },
    {
      title: "Manage Users",
      description: "Assign roles and override permissions.",
      path: "/admin/users",
      icon: Users,
      show: can(budgetAccess, "can_manage_users"),
    },
    {
      title: "Manage Categories",
      description: "Control categories, types, and item requests.",
      path: "/admin/categories",
      icon: Tags,
      show: can(budgetAccess, "can_manage_categories"),
    },
    {
      title: "Reports",
      description: "Track usage, variance, transfers, and exceeded items.",
      path: "/reports",
      icon: BarChart3,
      show: can(budgetAccess, "can_view_reports"),
    },
  ].filter((item) => item.show);
}

function getWorkPanels(budgetAccess) {
  return [
    {
      title: "Budget Workspace",
      description: "No draft, returned, or active budgets to show yet.",
      show:
        can(budgetAccess, "can_view_budget") ||
        can(budgetAccess, "can_edit_budget"),
    },
    {
      title: "PO Linking",
      description:
        "Approved CareWare PO lines ready for linking will appear here.",
      show: can(budgetAccess, "can_link_po"),
    },
    {
      title: "My Transfer Requests",
      description:
        "Your pending, approved, and rejected transfer requests will appear here.",
      show: can(budgetAccess, "can_request_transfer"),
    },
    {
      title: "Approval Queue",
      description:
        "Budgets and transfers waiting for your approval will appear here.",
      show:
        can(budgetAccess, "can_approve_budget") ||
        can(budgetAccess, "can_approve_transfer"),
    },
    {
      title: "Admin Overview",
      description:
        "User access, roles, categories, and item requests will appear here.",
      show:
        can(budgetAccess, "can_manage_users") ||
        can(budgetAccess, "can_manage_categories"),
    },
    {
      title: "Reports Overview",
      description:
        "Exceeded items, variance, PO usage, and transfer reports will appear here.",
      show: can(budgetAccess, "can_view_reports"),
    },
  ].filter((item) => item.show);
}

export default function DashboardPage() {
  const { user, budgetAccess } = useAuth();

  const stats = getStats(budgetAccess);
  const quickActions = getQuickActions(budgetAccess);
  const workPanels = getWorkPanels(budgetAccess);
  const roleLabel = getUserRoleLabel(budgetAccess);

  return (
    <div className="space-y-8 font-sans">
      <section className="rounded-panel border border-enterprise-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-wide text-primary-700">
              Budget Dashboard
            </p>

            <h2 className="mt-2 text-2xl font-medium tracking-tight text-enterprise-text">
              Welcome, {user?.userName || "User"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-enterprise-muted">
              Your dashboard changes automatically based on your role and
              department scope.
            </p>
          </div>

          <div className="rounded-2xl border border-enterprise-border bg-enterprise-soft px-5 py-4">
            <p className="text-xs text-enterprise-muted">Current Access</p>
            <p className="mt-1 text-sm font-medium text-enterprise-text">
              {roleLabel}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-card border border-enterprise-border bg-white p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-enterprise-muted">{item.title}</p>

                  <div className="mt-3 text-2xl font-semibold tracking-tight text-enterprise-text">
                    {item.value}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Icon size={22} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-enterprise-muted">
                {item.description}
              </p>
            </div>
          );
        })}
      </section>

      {quickActions.length > 0 && (
        <section className="rounded-card border border-enterprise-border bg-white p-6 shadow-card">
          <h3 className="text-lg font-medium tracking-tight text-enterprise-text">
            Quick Actions
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  to={action.path}
                  className="group rounded-xl border border-enterprise-border bg-enterprise-soft p-5 transition hover:border-primary-200 hover:bg-primary-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-soft">
                      <Icon size={20} />
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-enterprise-text group-hover:text-primary-700">
                        {action.title}
                      </h4>

                      <p className="mt-1 text-sm leading-6 text-enterprise-muted">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        {workPanels.map((panel) => (
          <div
            key={panel.title}
            className="rounded-card border border-enterprise-border bg-white p-6 shadow-card"
          >
            <h3 className="text-lg font-medium tracking-tight text-enterprise-text">
              {panel.title}
            </h3>

            <div className="mt-5 rounded-xl border border-dashed border-enterprise-border bg-enterprise-soft p-8 text-center text-sm text-enterprise-muted">
              {panel.description}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
