import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Copy,
  Search,
  Eye,
  Edit,
  Send,
  Clock,
  CheckCircle2,
  RotateCcw,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "PENDING_APPROVAL", label: "Pending" },
  { key: "RETURNED", label: "Returned" },
  { key: "APPROVED", label: "Approved" },
  { key: "HISTORY", label: "History" },
];

const dummyBudgets = [
  {
    id: 1,
    department: "Information Technology",
    year: 2026,
    version: 1,
    status: "DRAFT",
    totalAmount: 420000,
    createdBy: "John Doe",
    updatedAt: "May 15, 2025",
    owner: true,
  },
  {
    id: 2,
    department: "Information Technology",
    year: 2025,
    version: 2,
    status: "APPROVED",
    totalAmount: 380000,
    createdBy: "John Doe",
    updatedAt: "Dec 20, 2024",
    owner: true,
  },
  {
    id: 3,
    department: "Finance",
    year: 2026,
    version: 1,
    status: "PENDING_APPROVAL",
    totalAmount: 250000,
    createdBy: "Sarah Ahmed",
    updatedAt: "May 10, 2025",
    owner: false,
  },
  {
    id: 4,
    department: "HR",
    year: 2026,
    version: 1,
    status: "RETURNED",
    totalAmount: 175000,
    createdBy: "Mohamed Ali",
    updatedAt: "May 8, 2025",
    owner: false,
  },
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatSAR(value) {
  return `﷼ ${formatNumber(value)}`;
}

function statusClass(status) {
  if (status === "DRAFT") return "bg-slate-100 text-slate-700";
  if (status === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700";
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "RETURNED") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function statusIcon(status) {
  if (status === "DRAFT") return FileText;
  if (status === "PENDING_APPROVAL") return Clock;
  if (status === "APPROVED") return CheckCircle2;
  if (status === "RETURNED") return RotateCcw;
  return FileText;
}

export default function BudgetsPage() {
  const { budgetAccess } = useAuth();

  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");

  const canCreate = budgetAccess?.can_edit_budget;
  const canViewAll =
    budgetAccess?.can_approve_budget || budgetAccess?.can_manage_users;
  const canSubmit = budgetAccess?.can_edit_budget;

  const visibleBudgets = useMemo(() => {
    const q = search.trim().toLowerCase();

    return dummyBudgets
      .filter((budget) => canViewAll || budget.owner)
      .filter((budget) => {
        if (activeTab === "ALL") return true;
        if (activeTab === "HISTORY") return budget.status === "APPROVED";
        return budget.status === activeTab;
      })
      .filter((budget) => {
        if (!q) return true;

        return (
          budget.department.toLowerCase().includes(q) ||
          String(budget.year).includes(q) ||
          budget.status.toLowerCase().includes(q) ||
          budget.createdBy.toLowerCase().includes(q)
        );
      });
  }, [activeTab, search, canViewAll]);

  const stats = useMemo(() => {
    const base = dummyBudgets.filter((budget) => canViewAll || budget.owner);

    return {
      total: base.length,
      draft: base.filter((b) => b.status === "DRAFT").length,
      pending: base.filter((b) => b.status === "PENDING_APPROVAL").length,
      approved: base.filter((b) => b.status === "APPROVED").length,
    };
  }, [canViewAll]);

  return (
    <div className="space-y-6">
      <section className="rounded-panel border border-enterprise-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-primary-700">
              Department Budgets
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-enterprise-text">
              Budgets
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-enterprise-muted">
              Manage yearly department budgets, review draft and returned
              budgets, and track approved budget versions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canCreate && (
              <Link
                to="/budgets/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
              >
                <Plus size={17} />
                Create Budget
              </Link>
            )}

            {canCreate && (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-enterprise-border bg-white px-4 py-2.5 text-sm font-semibold text-enterprise-text transition hover:bg-enterprise-soft"
              >
                <Copy size={17} />
                Copy From History
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Total Budgets" value={stats.total} />
        <Stat title="Draft" value={stats.draft} />
        <Stat title="Pending Approval" value={stats.pending} />
        <Stat title="Approved" value={stats.approved} />
      </section>

      <section className="rounded-card border border-enterprise-border bg-white shadow-card">
        <div className="border-b border-enterprise-border p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold transition",
                    activeTab === tab.key
                      ? "bg-primary-600 text-white shadow-soft"
                      : "bg-enterprise-soft text-enterprise-muted hover:text-primary-700",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full xl:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-enterprise-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search budgets..."
                className="h-11 w-full rounded-xl border border-enterprise-border bg-enterprise-soft pl-10 pr-3 text-sm outline-none transition focus:border-primary-300 focus:bg-white focus:ring-4 focus:ring-primary-50"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-enterprise-soft text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                <th className="border-b border-enterprise-border px-4 py-3">
                  Budget
                </th>
                <th className="border-b border-enterprise-border px-4 py-3">
                  Year
                </th>
                <th className="border-b border-enterprise-border px-4 py-3">
                  Version
                </th>
                <th className="border-b border-enterprise-border px-4 py-3">
                  Status
                </th>
                <th className="border-b border-enterprise-border px-4 py-3">
                  Total Amount
                </th>
                <th className="border-b border-enterprise-border px-4 py-3">
                  Created By
                </th>
                <th className="border-b border-enterprise-border px-4 py-3">
                  Updated
                </th>
                <th className="border-b border-enterprise-border px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleBudgets.map((budget) => {
                const StatusIcon = statusIcon(budget.status);
                const canEditRow =
                  budgetAccess?.can_edit_budget &&
                  budget.owner &&
                  ["DRAFT", "RETURNED"].includes(budget.status);

                return (
                  <tr
                    key={budget.id}
                    className="text-enterprise-text transition hover:bg-enterprise-soft"
                  >
                    <td className="border-b border-enterprise-border px-4 py-4">
                      <p className="font-semibold">{budget.department}</p>
                      <p className="mt-1 text-xs text-enterprise-muted">
                        Budget #{budget.id}
                      </p>
                    </td>

                    <td className="border-b border-enterprise-border px-4 py-4">
                      {budget.year}
                    </td>

                    <td className="border-b border-enterprise-border px-4 py-4">
                      v{budget.version}
                    </td>

                    <td className="border-b border-enterprise-border px-4 py-4">
                      <span
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                          statusClass(budget.status),
                        ].join(" ")}
                      >
                        <StatusIcon size={14} />
                        {budget.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="border-b border-enterprise-border px-4 py-4 font-semibold text-primary-700">
                      {formatSAR(budget.totalAmount)}
                    </td>

                    <td className="border-b border-enterprise-border px-4 py-4">
                      {budget.createdBy}
                    </td>

                    <td className="border-b border-enterprise-border px-4 py-4">
                      {budget.updatedAt}
                    </td>

                    <td className="border-b border-enterprise-border px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-enterprise-border bg-white px-3 py-2 text-xs font-medium transition hover:bg-enterprise-soft">
                          <Eye size={14} />
                          View
                        </button>

                        {canEditRow && (
                          <button className="inline-flex items-center gap-1.5 rounded-lg border border-enterprise-border bg-white px-3 py-2 text-xs font-medium transition hover:bg-enterprise-soft">
                            <Edit size={14} />
                            Edit
                          </button>
                        )}

                        {canSubmit &&
                          budget.owner &&
                          budget.status === "DRAFT" && (
                            <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-700">
                              <Send size={14} />
                              Submit
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visibleBudgets.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-14 text-center text-sm text-enterprise-muted"
                  >
                    No budgets found for this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-card border border-enterprise-border bg-white p-5 shadow-soft">
      <p className="text-sm text-enterprise-muted">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-enterprise-text">
        {value}
      </p>
    </div>
  );
}
