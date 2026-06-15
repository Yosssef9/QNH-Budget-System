import { useAuth } from "../context/AuthContext";
import { getUserRoleLabel } from "../helpers/permissions";
import { useDashboardData } from "../hooks/dashboard/useDashboardData";
import {
  getDashboardStatsCards,
  getQuickActions,
  getWorkPanels,
} from "../config/dashboard";
import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import DashboardQuickActionCard from "../components/dashboard/DashboardQuickActionCard";
import CollapsibleSection from "../components/CollapsibleSection";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/dateFormatters";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
  getPOLinkStatusLabel,
  getPOLinkStatusStyle,
} from "../theme/statusStyles";
import PendingBadge from "../components/dashboard/PendingBadge";
import CurrencyText from "../components/CurrencyText";
export default function DashboardPage() {
  const { user, budgetAccess } = useAuth();
  const navigate = useNavigate();
  const roleLabel = getUserRoleLabel(budgetAccess);

  const dashboardData = useDashboardData();
  const stats = getDashboardStatsCards(budgetAccess, dashboardData);
  const quickActions = getQuickActions(budgetAccess);
  const workPanels = getWorkPanels(budgetAccess);

  const itemRequestPanel = dashboardData.dashboardItemRequests;
  const transferPanel = dashboardData.dashboardTransfers;
  const poPanel = dashboardData.dashboardPOLinks;

  const transferRequests = transferPanel?.requests || [];
  const poRequests = poPanel?.requests || [];

  const pendingTransferCount = transferRequests.filter(
    (item) => item.status === "PENDING_APPROVAL",
  ).length;
  const pendingPOCount = poRequests.filter(
    (item) => item.status === "PENDING",
  ).length;
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

          const isTransferPanel = panel.title.includes("Transfer Requests");
          const isPOPanel = panel.title.includes("PO Link Requests");

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
                  <PendingBadge count={pendingCount} label="Pending Request" />
                ) : isTransferPanel && pendingTransferCount > 0 ? (
                  <PendingBadge
                    count={pendingTransferCount}
                    label="Pending Transfer"
                  />
                ) : isPOPanel && pendingPOCount > 0 ? (
                  <PendingBadge count={pendingPOCount} label="Pending PO" />
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
              ) : isTransferPanel ? (
                <div className="enterprise-scrollbar max-h-[420px] space-y-3 overflow-y-auto scroll-smooth pr-2">
                  {transferRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                      {transferPanel?.mode === "APPROVER_PENDING"
                        ? "No pending transfer requests."
                        : "No transfer requests found."}
                    </div>
                  ) : (
                    transferRequests.map((item) => (
                      <div
                        key={item.id}
                        onClick={() =>
                          navigate(
                            transferPanel?.mode === "APPROVER_PENDING"
                              ? "/transfers/approvals"
                              : "/transfers/requests",
                          )
                        }
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.from_item_name}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              -&gt; {item.to_item_name}
                            </p>

                            {item.department_name && (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Department: {item.department_name}
                              </p>
                            )}

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Amount: SAR{" "}
                              {Number(item.amount || 0).toLocaleString()}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Requested At:{" "}
                              {item.requested_at
                                ? formatDate(item.requested_at)
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
                      </div>
                    ))
                  )}
                </div>
              ) : isPOPanel ? (
                <div className="enterprise-scrollbar max-h-[420px] space-y-3 overflow-y-auto scroll-smooth pr-2">
                  {poRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                      {poPanel?.mode === "APPROVER_PENDING"
                        ? "No pending PO link requests."
                        : "No PO link requests found."}
                    </div>
                  ) : (
                    poRequests.map((item) => (
                      <div
                        key={item.id}
                        onClick={() =>
                          navigate(
                            poPanel?.mode === "APPROVER_PENDING"
                              ? "/po-approvals"
                              : "/po-linking",
                          )
                        }
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.budget_type_name || "-"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              PO Item: {item.item_description || "-"}
                            </p>

                            {item.department_name && (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Department: {item.department_name}
                              </p>
                            )}

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Requested Qty: {item.requested_qty || 0}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Linked Amount:{" "}
                              <CurrencyText value={item.linked_amount || 0} />
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Requested At:{" "}
                              {item.requested_at
                                ? formatDate(item.requested_at)
                                : "-"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              getPOLinkStatusStyle(item.status).badge
                            }`}
                          >
                            {getPOLinkStatusLabel(item.status)}
                          </span>
                        </div>
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
