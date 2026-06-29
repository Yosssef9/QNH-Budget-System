import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  FileText,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import CurrencyText from "../components/CurrencyText";
import EnterpriseSearch from "../components/EnterpriseSearch";
import LoadingSpinner from "../components/LoadingSpinner";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import BudgetStatusBadge from "../components/budgets/shared/BudgetStatusBadge";
import {
  useApproveCategoryTransfer,
  usePendingCategoryTransfers,
  useRejectCategoryTransfer,
} from "../hooks/category-transfers/useCategoryTransfers";

const statusOptions = [
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

function normalizeStatus(status) {
  return status || "PENDING_APPROVAL";
}

function getTransferSearchText(item) {
  return [
    item.id,
    item.financial_year,
    item.category_name,
    item.from_budget_type_name,
    item.to_budget_type_name,
    item.reason,
    item.status,
    item.requested_by_name,
    item.approved_by_name,
    item.rejected_by_name,
    item.amount,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function TransferApprovalPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL");
  const [approveItem, setApproveItem] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");

  const {
    data: transfers = [],
    isLoading,
    isFetching,
  } = usePendingCategoryTransfers({ status: statusFilter });
  const approveTransferMutation = useApproveCategoryTransfer();
  const rejectTransferMutation = useRejectCategoryTransfer();

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transfers;

    return transfers.filter((item) => getTransferSearchText(item).includes(q));
  }, [transfers, search]);

  const totalValue = filteredTransfers.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const pendingCount = filteredTransfers.filter(
    (item) => item.status === "PENDING_APPROVAL",
  ).length;
  const approvedCount = filteredTransfers.filter(
    (item) => item.status === "APPROVED",
  ).length;
  const rejectedCount = filteredTransfers.filter(
    (item) => item.status === "REJECTED",
  ).length;

  function handleApprove() {
    if (!approveItem) return;

    approveTransferMutation.mutate(
      {
        transferId: approveItem.id,
      },
      {
        onSuccess: () => {
          toast.success("Transfer approved successfully.");
          setApproveItem(null);
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message || "Failed to approve transfer.",
          );
        },
      },
    );
  }

  function handleReject() {
    if (!rejectItem) return;

    if (!rejectionNote.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }

    rejectTransferMutation.mutate(
      {
        transferId: rejectItem.id,
        payload: { note: rejectionNote.trim() },
      },
      {
        onSuccess: () => {
          toast.success("Transfer rejected successfully.");
          setRejectItem(null);
          setRejectionNote("");
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message || "Failed to reject transfer.",
          );
        },
      },
    );
  }

  if (isLoading && !transfers.length) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading Transfer Approvals"
        subtitle="Retrieving category transfer requests..."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/" },
          { label: "Transfer Approvals" },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <ArrowRightLeft size={16} />
              CFO Review
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Transfer Approvals
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Approve or reject category budget transfers created by Category
              Budget Managers during PRE-CLOSING.
            </p>
          </div>

          <div className="w-full xl:w-72">
            <SearchableMultiSelect
              multiple={false}
              disableClear
              value={statusFilter}
              options={statusOptions}
              onChange={(event) =>
                setStatusFilter(event.target.value || "PENDING_APPROVAL")
              }
              placeholder="Status"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Clock3 className="text-amber-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">Pending</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {pendingCount}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <CheckCircle2 className="text-emerald-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">Approved</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {approvedCount}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <XCircle className="text-red-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">Rejected</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {rejectedCount}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ArrowRightLeft className="text-blue-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">Total Value</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            <CurrencyText value={totalValue} />
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Category Transfer Requests
            </h2>
            <p className="text-sm text-slate-500">
              {filteredTransfers.length} request(s) found
              {isFetching ? " - refreshing..." : ""}
            </p>
          </div>

          <div className="w-full lg:w-80">
            <EnterpriseSearch
              value={search}
              onChange={setSearch}
              placeholder="Search transfer requests..."
            />
          </div>
        </div>

        {filteredTransfers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <FileText className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              No transfer requests found.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTransfers.map((item) => {
                  const isPending = item.status === "PENDING_APPROVAL";

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.from_budget_type_name || "-"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          FY {item.financial_year || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.to_budget_type_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.category_name || "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-700">
                        <CurrencyText value={item.amount} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.requested_by_name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <BudgetStatusBadge status={normalizeStatus(item.status)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={!isPending}
                            onClick={() => setApproveItem(item)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={!isPending}
                            onClick={() => setRejectItem(item)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={!!approveItem}
        title="Approve Transfer"
        message="Approving this request will make the transfer effective for the selected category budget items."
        confirmText="Approve Transfer"
        loading={approveTransferMutation.isPending}
        onCancel={() => setApproveItem(null)}
        onConfirm={handleApprove}
      >
        {approveItem && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="font-bold text-slate-700">From</div>
                <div className="mt-1 text-slate-900">
                  {approveItem.from_budget_type_name}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-700">To</div>
                <div className="mt-1 text-slate-900">
                  {approveItem.to_budget_type_name}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-700">Amount</div>
                <div className="mt-1 font-bold text-blue-700">
                  <CurrencyText value={approveItem.amount} />
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-700">Requested By</div>
                <div className="mt-1 text-slate-900">
                  {approveItem.requested_by_name || "-"}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="font-bold text-slate-700">Reason</div>
              <div className="mt-1 text-slate-900">
                {approveItem.reason || "-"}
              </div>
            </div>
          </div>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={!!rejectItem}
        title="Reject Transfer"
        message="Please provide a rejection reason."
        danger
        confirmText="Reject Transfer"
        loading={rejectTransferMutation.isPending}
        onCancel={() => {
          setRejectItem(null);
          setRejectionNote("");
        }}
        onConfirm={handleReject}
      >
        <textarea
          value={rejectionNote}
          onChange={(event) => setRejectionNote(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Enter rejection reason..."
          className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
        />
      </ConfirmModal>
    </div>
  );
}
