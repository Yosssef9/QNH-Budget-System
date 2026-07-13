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
  const adjustmentRequests = dashboardData.dashboardAdjustmentRequests || [];

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
  const pendingAdjustmentCount = adjustmentRequests.filter(
    (item) => item.status === "PENDING",
  ).length;
  function getDashboardColumns(count) {
    if (count <= 5) return count;

    if (count <= 10) {
      return Math.ceil(count / 2);
    }

    return 4;
  }
  return (
    <div className="space-y-8 font-sans">
      {/* <section className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm ">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
              Qassim National Hospital
            </span>

            <span className="hidden text-slate-300 sm:inline">/</span>

            <span>Budget Management System</span>
          </div>
        </div>

        <div className="px-6 py-8">
          <p className="text-sm font-semibold tracking-wide text-blue-700">
            Enterprise Budget Workspace
          </p>

          <h1 className="mt-3 text-4xl font-light tracking-tight text-slate-500">
            Welcome,
          </h1>

          <div className="mt-1">
            <span
              className="text-6xl tracking-tight text-slate-600"
              style={{
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {user?.userName || "User"}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-8 w-[3px] rounded-full bg-blue-600" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Current Role
              </p>

              <p className="text-base font-semibold text-slate-800">
                {roleLabel}
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
            Manage hospital budgeting, approvals, transfers, procurement
            linking, and financial oversight from a controlled internal
            workspace.
          </p>
        </div>
        {/* <div className="px-6 py-10 text-center">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-blue-700">
            Enterprise Budget Workspace
          </p>

          <h1 className="mt-5 text-4xl font-light tracking-tight text-slate-500">
            Welcome
          </h1>

          <div className="mt-2">
            <span
              className="text-6xl tracking-tight text-slate-700"
              style={{
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {user?.userName || "User"}
            </span>
          </div>

          <div className="mt-5 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-blue-600" />

              <span className="text-sm font-semibold text-blue-700">
                {roleLabel}
              </span>
            </div>
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600">
            Manage hospital budgeting, approvals, transfers, procurement
            linking, and financial oversight from a centralized internal
            workspace.
          </p>
        </div> 
      </section> */}
      {/* <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white
  shadow-sm"
      >
        <div className="grid gap-0 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          <div
            className="border-b border-slate-200 bg-slate-50 px-6 py-6 lg:border-b-0
      lg:border-r"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Qassim National Hospital
            </p>

            <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-950">
              Budget Management System
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Internal hospital finance workspace
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-center px-6 py-7 text-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-slate-500">
                Enterprise Budget Dashboard
              </p>

              <h1
                className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-
          3xl"
              >
                Welcome, {user?.userName || "User"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                A controlled workspace for hospital budgeting, approvals,
                transfers, procurement linking, and financial governance.
              </p>
            </div>
          </div>

          <div
            className="border-t border-slate-200 bg-slate-50 px-6 py-6 lg:border-l
      lg:border-t-0"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Current Access
            </p>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-950">{roleLabel}</p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dashboard visibility is based on assigned role and permissions.
              </p>
            </div>
          </div>
        </div>
      </section> */}
      <section
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(${getDashboardColumns(stats.length)}, minmax(0, 1fr))`,
        }}
      >
        {stats.map((item) => (
          <DashboardStatCard key={item.title} item={item} />
        ))}
      </section>

      {quickActions.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            Quick Actions
          </h3>

          <div
            className="
    mt-5
    grid
    gap-4
    grid-cols-[repeat(auto-fit,minmax(260px,1fr))]
  "
          >
            {" "}
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
          const isAdjustmentPanel = panel.title.includes(
            "Adjustment Requests",
          );
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
                ) : isAdjustmentPanel && pendingAdjustmentCount > 0 ? (
                  <PendingBadge
                    count={pendingAdjustmentCount}
                    label="Pending Adjustment"
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
              ) : isAdjustmentPanel ? (
                <div className="enterprise-scrollbar max-h-[420px] space-y-3 overflow-y-auto scroll-smooth pr-2">
                  {adjustmentRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                      No adjustment requests found.
                    </div>
                  ) : (
                    adjustmentRequests.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate("/transfers/requests")}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.item?.catalog_item_name || "-"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {item.item?.change_type === "ADD_ITEM"
                                ? "Add new item"
                                : "Increase existing item"}{" "}
                              · {item.category?.name || "-"}
                            </p>

                            {item.department?.name && (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Department: {item.department.name}
                              </p>
                            )}

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Quantity:{" "}
                              {item.item?.requested_quantity ?? "-"} · Amount:{" "}
                              {item.item?.requested_amount
                                ? `SAR ${Number(
                                    item.item.requested_amount,
                                  ).toLocaleString()}`
                                : "-"}
                            </p>

                            {item.category_note && (
                              <p className="mt-2 rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-600">
                                {item.category_note}
                              </p>
                            )}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : item.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {String(item.status || "").replaceAll("_", " ")}
                          </span>
                        </div>
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
