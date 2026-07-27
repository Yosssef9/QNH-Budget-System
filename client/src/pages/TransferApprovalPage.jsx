import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  PackageCheck,
  XCircle,
} from "lucide-react";

import Breadcrumbs from "../components/Breadcrumbs";
import LoadingSpinner from "../components/LoadingSpinner";
import CollapsibleSection from "../components/CollapsibleSection";
import ConfirmModal from "../components/ConfirmModal";
import Input from "../components/Input";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import EnterpriseSearch from "../components/EnterpriseSearch";
import TransferApprovalTable from "../components/transfers/TransferApprovalTable";
import TransferDetailsDrawer from "../components/transfers/TransferDetailsDrawer";
import CurrencyText from "../components/CurrencyText";
import { useAuth } from "../context/AuthContext";
import { can } from "../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import {
  approveTransfer,
  getTransferById,
  getTransfers,
  rejectTransfer,
} from "../api/transfer.api";
import { useFinancialYears } from "../hooks/financial-years/useFinancialYears";

const statusOptions = [
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

function MetricCard({ icon: Icon, label, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="text-blue-600" size={22} />
      <div className="mt-3 text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-1 min-w-0 break-words text-3xl font-black text-slate-950">
        {children}
      </div>
    </div>
  );
}

export default function TransferApprovalPage() {
  const queryClient = useQueryClient();
  const { budgetAccess } = useAuth();
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [approveItem, setApproveItem] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL");
  const [financialYearFilter, setFinancialYearFilter] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");

  const { data: financialYears = [] } = useFinancialYears();
  const canApproveTransfers = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS,
  );

  const latestFinancialYearId = useMemo(() => {
    if (!financialYears.length) return null;

    return [...financialYears].sort(
      (a, b) => Number(b.year) - Number(a.year),
    )[0]?.id ?? null;
  }, [financialYears]);
  const effectiveFinancialYearFilter =
    financialYearFilter ?? latestFinancialYearId;

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers", statusFilter, effectiveFinancialYearFilter],
    queryFn: () => getTransfers(statusFilter, effectiveFinancialYearFilter),
    enabled: !!effectiveFinancialYearFilter,
  });

  const financialYearOptions = [...financialYears]
    .sort((a, b) => Number(b.year) - Number(a.year))
    .map((year) => ({
      value: year.id,
      label: `FY ${year.year}`,
    }));

  const categoryOptions = useMemo(() => {
    const categories = [
      ...new Map(
        transfers
          .filter((transfer) => transfer.budget_category_id)
          .map((transfer) => [
            transfer.budget_category_id,
            {
              id: transfer.budget_category_id,
              name: transfer.category_name,
            },
          ]),
      ).values(),
    ];

    return [
      { value: "ALL", label: "All Categories" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ];
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transfers.filter((transfer) => {
      const categoryMatch =
        categoryFilter === "ALL" ||
        Number(transfer.budget_category_id) === Number(categoryFilter);

      const searchMatch =
        !q ||
        [
          transfer.id,
          transfer.category_name,
          transfer.from_item_name,
          transfer.from_sub_item_name,
          transfer.to_item_name,
          transfer.to_sub_item_name,
          transfer.reason,
          transfer.status,
          transfer.requested_by_name,
          transfer.financial_year,
          transfer.amount,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      return categoryMatch && searchMatch;
    });
  }, [transfers, search, categoryFilter]);

  const totalValue = filteredTransfers.reduce(
    (sum, transfer) => sum + Number(transfer.amount || 0),
    0,
  );
  const largestTransfer =
    filteredTransfers.length > 0
      ? Math.max(...filteredTransfers.map((transfer) => Number(transfer.amount || 0)))
      : 0;
  const averageTransfer =
    filteredTransfers.length > 0 ? totalValue / filteredTransfers.length : 0;
  const selectedStatusLabel =
    statusOptions.find((option) => option.value === statusFilter)?.label ||
    "Pending";

  const approveMutation = useMutation({
    mutationFn: approveTransfer,
    onMutate: () => {
      toast.loading("Approving transfer...", { id: "approve-transfer" });
    },
    onSuccess: () => {
      toast.success("Transfer approved successfully", {
        id: "approve-transfer",
      });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["my-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-items"] });
      setApproveItem(null);
      setSelectedTransfer(null);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to approve transfer",
        { id: "approve-transfer" },
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }) => rejectTransfer(id, note),
    onMutate: () => {
      toast.loading("Rejecting transfer...", { id: "reject-transfer" });
    },
    onSuccess: () => {
      toast.success("Transfer rejected successfully", { id: "reject-transfer" });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["my-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-items"] });
      setRejectItem(null);
      setSelectedTransfer(null);
      setRejectionNote("");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to reject transfer",
        { id: "reject-transfer" },
      );
    },
  });

  async function handleView(row) {
    try {
      const detail = await getTransferById(row.id);
      setSelectedTransfer(detail);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load transfer details",
      );
    }
  }

  if (isLoading) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading Transfer Approvals"
        subtitle="Retrieving category package transfer requests..."
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <ArrowRightLeft size={16} />
              Category Package Transfers
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Transfer Approvals
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Review source and destination package models, quantities, prices,
              and transfer reasons.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="w-full lg:w-80">
              <EnterpriseSearch
                value={search}
                onChange={setSearch}
                placeholder="Search package transfers..."
                showClear
              />
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="w-full sm:w-60">
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  value={effectiveFinancialYearFilter}
                  options={financialYearOptions}
                  onChange={(event) => {
                    setFinancialYearFilter(Number(event.target.value));
                    setStatusFilter("ALL");
                  }}
                  placeholder="Financial Year"
                />
              </div>
              <div className="w-full sm:w-72">
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  value={categoryFilter}
                  options={categoryOptions}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value || "ALL")
                  }
                  placeholder="Category"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Clock3} label={`${selectedStatusLabel} Requests`}>
          {filteredTransfers.length}
        </MetricCard>
        <MetricCard icon={ArrowRightLeft} label="Total Value">
          <CurrencyText compact value={totalValue} />
        </MetricCard>
        <MetricCard icon={CheckCircle2} label="Largest Transfer">
          <CurrencyText compact value={largestTransfer} />
        </MetricCard>
        <MetricCard icon={XCircle} label="Average Transfer">
          <CurrencyText compact value={averageTransfer} />
        </MetricCard>
      </div>

      <CollapsibleSection
        title="Transfer Requests"
        description={`${filteredTransfers.length} request(s) found`}
        icon={<PackageCheck size={22} />}
        defaultOpen
        openText="Hide Requests"
        closedText="Show Requests"
        className="bg-white"
        headerClassName="bg-white"
        bodyClassName="space-y-5 bg-slate-50"
        iconClassName="bg-slate-100 text-slate-700"
      >
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">
              Approval Status
            </div>
            <p className="text-xs font-medium text-slate-500">
              Filter requests by pending, approved, rejected, or all.
            </p>
          </div>
          <div className="w-full sm:w-72">
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

        <TransferApprovalTable
          transfers={filteredTransfers}
          onView={handleView}
          onApprove={setApproveItem}
          onReject={setRejectItem}
        />
      </CollapsibleSection>

      <TransferDetailsDrawer
        transfer={selectedTransfer}
        open={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        onApprove={setApproveItem}
        onReject={setRejectItem}
        canApprove={canApproveTransfers}
      />

      <ConfirmModal
        open={!!approveItem}
        title="Approve Transfer"
        message="Approve this category package transfer request?"
        confirmText="Approve Transfer"
        loading={approveMutation.isPending}
        onCancel={() => setApproveItem(null)}
        onConfirm={() => {
          if (approveItem) approveMutation.mutate(approveItem.id);
        }}
      >
        {approveItem ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 text-sm">
              <div>
                <div className="font-semibold text-slate-700">Category</div>
                <div className="text-slate-900">
                  {approveItem.category_name || "-"}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">From</div>
                <div className="text-slate-900">
                  {approveItem.from_item_name} ·{" "}
                  {approveItem.from_sub_item_name}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">To</div>
                <div className="text-slate-900">
                  {approveItem.to_item_name} · {approveItem.to_sub_item_name}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700">Amount</div>
                <div className="text-base font-bold text-blue-700">
                  <CurrencyText value={approveItem.amount || 0} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        open={!!rejectItem}
        title="Reject Transfer"
        message="Please provide a rejection reason."
        danger
        confirmText="Reject Transfer"
        loading={rejectMutation.isPending}
        onCancel={() => {
          setRejectItem(null);
          setRejectionNote("");
        }}
        onConfirm={() => {
          if (!rejectionNote.trim()) {
            toast.error("Rejection reason is required");
            return;
          }
          if (rejectItem) {
            rejectMutation.mutate({
              id: rejectItem.id,
              note: rejectionNote,
            });
          }
        }}
      >
        <Input
          multiline
          value={rejectionNote}
          onChange={(event) => setRejectionNote(event.target.value)}
          rows={4}
          placeholder="Enter rejection reason..."
          className="rounded-xl border-slate-300"
        />
      </ConfirmModal>
    </div>
  );
}
