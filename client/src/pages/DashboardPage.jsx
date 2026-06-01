import { useAuth } from "../context/AuthContext";
import { getUserRoleLabel } from "../helpers/permissions";
import { useDashboardData } from "../hooks/dashboard/useDashboardData";
import { getDashboardStatsCards } from "../config/dashboardCards.config";
import {
  getQuickActions,
  getWorkPanels,
} from "../config/dashboardActions.config";
import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import DashboardQuickActionCard from "../components/dashboard/DashboardQuickActionCard";
import CollapsibleSection from "../components/CollapsibleSection";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/dateFormatters";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../theme/statusStyles";
export default function DashboardPage() {
  const { user, budgetAccess } = useAuth();
  const navigate = useNavigate();
  const roleLabel = getUserRoleLabel(budgetAccess);

  const dashboardData = useDashboardData();
  const stats = getDashboardStatsCards(budgetAccess, dashboardData);
  const quickActions = getQuickActions(budgetAccess);
  const workPanels = getWorkPanels(budgetAccess);

  const itemRequestPanel = dashboardData.dashboardItemRequests;
  const itemRequests = itemRequestPanel?.requests || [];
  const pendingCount = itemRequests.filter(
    (item) => item.status === "PENDING",
  ).length;
  return (
    <div className="space-y-8 font-sans">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-blue-700">
              Budget Dashboard
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Welcome, {user?.userName || "User"}
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
              Your dashboard changes automatically based on your role and
              department scope.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold text-slate-500">
              Current Access
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{roleLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <DashboardStatCard key={item.title} item={item} />
        ))}
      </section>

      {quickActions.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            Quick Actions
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <DashboardQuickActionCard key={action.title} action={action} />
            ))}
          </div>
        </section>
      )}

      <section className="grid items-start gap-6 xl:grid-cols-2">
        {workPanels.map((panel) => {
          const isItemRequestPanel = panel.title.includes(
            "Item / Category Requests",
          );

          return (
            <CollapsibleSection
              key={panel.title}
              title={panel.title}
              description={panel.description}
              defaultOpen
              className="rounded-3xl border-slate-200 bg-white shadow-sm"
              headerClassName="bg-white"
              bodyClassName="bg-white"
              titleClassName="text-slate-900"
              descriptionClassName="text-slate-500"
              badgeClassName="bg-slate-50 text-slate-600"
              openText="Hide"
              closedText="Show"
              action={
                isItemRequestPanel && pendingCount > 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />

                    <span className="text-xs font-bold text-amber-700">
                      {pendingCount} Pending Request
                      {pendingCount > 1 ? "s" : ""}
                    </span>
                  </div>
                ) : null
              }
            >
              {isItemRequestPanel ? (
                <div className="enterprise-scrollbar max-h-[420px] space-y-3 overflow-y-auto scroll-smooth pr-2">
                  {itemRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                      {itemRequestPanel?.mode === "ADMIN_PENDING"
                        ? "No pending item/category requests."
                        : "No item/category requests found."}
                    </div>
                  ) : (
                    itemRequests.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (itemRequestPanel?.mode === "ADMIN_PENDING") {
                            navigate("/admin/budget-setup");
                          }
                        }}
                        className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all ${
                          itemRequestPanel?.mode === "ADMIN_PENDING"
                            ? "cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.requested_type_name}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Category:{" "}
                              {item.existing_category_name ||
                                item.requested_category_name ||
                                "-"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Department:{" "}
                              {item.requested_department_name || "-"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Requested By: {item.requested_by_name || "-"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Requested At:{" "}
                              {item.created_at
                                ? formatDate(item.created_at)
                                : "-"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              getBudgetStatusStyle(item.status).badge
                            }`}
                          >
                            {getBudgetStatusLabel(item.status)}
                          </span>
                        </div>

                        {item.admin_note && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-bold text-slate-900">
                              Admin Note
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {item.admin_note}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="enterprise-scrollbar max-h-[420px] overflow-y-auto scroll-smooth pr-2">
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                    {panel.description}
                  </div>
                </div>
              )}
            </CollapsibleSection>
          );
        })}
      </section>
    </div>
  );
}
