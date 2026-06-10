import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Search,
  XCircle,
  Filter,
} from "lucide-react";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import Breadcrumbs from "../components/Breadcrumbs";
import LoadingSpinner from "../components/LoadingSpinner";
import CollapsibleSection from "../components/CollapsibleSection";
import ConfirmModal from "../components/ConfirmModal";
import {
  getTransfers,
  getTransferById,
  approveTransfer,
  rejectTransfer,
} from "../api/transfer.api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import TransferApprovalTable from "../components/transfers/TransferApprovalTable";
import TransferDetailsDrawer from "../components/transfers/TransferDetailsDrawer";
import EnterpriseSearch from "../components/EnterpriseSearch";
import { useFinancialYears } from "../hooks/financial-years/useFinancialYears";

const statusOptions = [
  {
    value: "PENDING_APPROVAL",
    label: "Pending",
  },
  {
    value: "APPROVED",
    label: "Approved",
  },
  {
    value: "REJECTED",
    label: "Rejected",
  },
  {
    value: "ALL",
    label: "All",
  },
];
export default function TransferApprovalPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [approveItem, setApproveItem] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL");
  const [financialYearFilter, setFinancialYearFilter] = useState(null);
  const { data: financialYears = [] } = useFinancialYears();
  useEffect(() => {
    if (!financialYears.length) return;

    const sortedYears = [...financialYears].sort(
      (a, b) => Number(b.year) - Number(a.year),
    );

    const latestYear = sortedYears[0];

    if (!financialYearFilter && latestYear) {
      setFinancialYearFilter(latestYear.id);
      setStatusFilter("PENDING_APPROVAL");
    }
  }, [financialYears, financialYearFilter]);
  const [rejectionNote, setRejectionNote] = useState("");
  ("CURRENT");
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers", statusFilter, financialYearFilter],

    queryFn: () => getTransfers(statusFilter, financialYearFilter),

    enabled: !!financialYearFilter,
  });
  const departments = useMemo(() => {
    return [
      ...new Map(
        transfers
          .filter((x) => x.department_id)
          .map((x) => [
            x.department_id,
            {
              id: x.department_id,
              name: x.department_name,
            },
          ]),
      ).values(),
    ];
  }, [transfers]);
  const departmentOptions = [
    {
      value: "ALL",
      label: "All Departments",
    },
    ...departments.map((d) => ({
      value: d.id,
      label: d.name,
    })),
  ];
  const financialYearOptions = financialYears
    .sort((a, b) => Number(b.year) - Number(a.year))
    .map((year) => ({
      value: year.id,
      label: `FY ${year.year}`,
    }));
  const filteredTransfers = useMemo(() => {
    let result = transfers;
    if (departmentFilter !== "ALL") {
      result = result.filter((x) => x.department_id === departmentFilter);
    }

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter((item) => {
        const searchableText = [
          item.id,
          item.department_name,
          item.from_item_name,
          item.to_item_name,
          item.reason,
          item.status,
          item.requested_by_name,
          item.approved_by_name,
          item.financial_year,
          item.amount,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(q);
      });
    }

    return result;
  }, [transfers, search, departmentFilter]);

  const approveMutation = useMutation({
    mutationFn: approveTransfer,

    onMutate: () => {
      toast.loading("Approving transfer...", {
        id: "approve-transfer",
      });
    },

    onSuccess: () => {
      toast.success("Transfer approved successfully", {
        id: "approve-transfer",
      });

      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["my-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-items"] });

      setApproveItem(null);
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to approve transfer",
        {
          id: "approve-transfer",
        },
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }) => rejectTransfer(id, note),

    onMutate: () => {
      toast.loading("Rejecting transfer...", {
        id: "reject-transfer",
      });
    },

    onSuccess: () => {
      toast.success("Transfer rejected successfully", {
        id: "reject-transfer",
      });

      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["my-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-items"] });

      setRejectItem(null);
      setRejectionNote("");
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to reject transfer",
        {
          id: "reject-transfer",
        },
      );
    },
  });

  function handleView(row) {
    const params = new URLSearchParams();

    params.set("transferId", row.id);
    params.set("financialYear", row.financial_year);
    params.set("departmentIds", String(row.department_id));

    const typeIds = [row.from_type_id, row.to_type_id]
      .filter(Boolean)
      .map(String);

    if (typeIds.length > 0) {
      params.set("typeIds", typeIds.join(","));
    }

    navigate(`/budget-analytics?${params.toString()}`);
  }
  const totalValue = filteredTransfers.reduce(
    (sum, x) => sum + Number(x.amount || 0),
    0,
  );

  const largestTransfer =
    filteredTransfers.length > 0
      ? Math.max(...filteredTransfers.map((x) => Number(x.amount || 0)))
      : 0;

  const averageTransfer =
    filteredTransfers.length > 0 ? totalValue / filteredTransfers.length : 0;

  const selectedStatusLabel =
    statusOptions.find((x) => x.value === statusFilter)?.label || "Pending";

  if (isLoading) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading Transfer Approvals"
        subtitle="Retrieving transfer requests..."
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
              Budget Transfers
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Transfer Approvals
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review, approve and track budget transfer requests.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="w-full lg:w-80">
              <EnterpriseSearch
                value={search}
                onChange={setSearch}
                placeholder="Search transfers..."
                showClear={true}
              />
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="w-full sm:w-60">
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  value={financialYearFilter}
                  options={financialYearOptions}
                  onChange={(e) => {
                    const selectedYearId = Number(e.target.value);

                    setFinancialYearFilter(selectedYearId);

                    const latestYear = [...financialYears].sort(
                      (a, b) => Number(b.year) - Number(a.year),
                    )[0];

                    if (selectedYearId === latestYear?.id) {
                      setStatusFilter("PENDING_APPROVAL");
                    } else {
                      setStatusFilter("ALL");
                    }
                  }}
                  placeholder="Financial Year"
                />
              </div>

              <div className="w-full sm:w-72">
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  value={departmentFilter}
                  options={departmentOptions}
                  onChange={(e) => setDepartmentFilter(e.target.value || "ALL")}
                  placeholder="Department"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Clock3 className="text-amber-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">
            {selectedStatusLabel} Requests
          </div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {filteredTransfers.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ArrowRightLeft className="text-blue-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">Total Value</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {totalValue.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <CheckCircle2 className="text-emerald-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">Largest Transfer</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {largestTransfer.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <XCircle className="text-red-600" size={22} />
          <div className="mt-3 text-sm text-slate-500">Average Transfer</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {Math.round(averageTransfer).toLocaleString()}
          </div>
        </div>
      </div>

      <CollapsibleSection
        title="Transfer Requests"
        description={`${filteredTransfers.length} request(s) found`}
        icon={<ArrowRightLeft size={22} />}
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
              onChange={(e) =>
                setStatusFilter(e.target.value || "PENDING_APPROVAL")
              }
              placeholder="Status"
            />
          </div>
        </div>

        <TransferApprovalTable
          transfers={filteredTransfers}
          statusFilter={statusFilter}
          onView={handleView}
          onApprove={setApproveItem}
          onReject={setRejectItem}
        />
      </CollapsibleSection>

      <TransferDetailsDrawer
        transfer={selectedTransfer}
        open={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
      />
      <ConfirmModal
        open={!!approveItem}
        title={
          approveItem?.is_new_item
            ? "Approve New Budget Item"
            : "Approve Transfer"
        }
        message={
          approveItem?.is_new_item
            ? "This approval will create a new budget item and allocate the requested amount."
            : "Are you sure you want to approve this transfer request?"
        }
        confirmText="Approve Transfer"
        loading={approveMutation.isPending}
        onCancel={() => setApproveItem(null)}
        onConfirm={() => {
          if (!approveItem) return;
          approveMutation.mutate(approveItem.id);
        }}
      >
        {approveItem && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-700">
              Department:
            </div>

            <div className="mb-3 text-sm text-slate-900">
              {approveItem.department_name || "-"}
            </div>
            <div className="text-sm font-semibold text-slate-700">From:</div>

            <div className="mb-3 text-sm text-slate-900">
              {approveItem.from_item_name}
            </div>

            <div className="text-sm font-semibold text-slate-700">To:</div>

            {approveItem.is_new_item ? (
              <div className="mb-3">
                <div className="font-semibold text-purple-700">
                  {approveItem.new_item_type_name}
                </div>

                <div className="mt-1 inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">
                  🆕 New Budget Item
                </div>

                <div className="mt-3 grid gap-1 text-sm">
                  <div>Category: {approveItem.category_name}</div>

                  <div>Quantity: {approveItem.new_item_quantity}</div>

                  <div>
                    Unit Price:{" "}
                    {Number(
                      approveItem.new_item_unit_price || 0,
                    ).toLocaleString()}
                  </div>

                  <div className="font-bold text-purple-700">
                    Total Amount:{" "}
                    {Number(
                      approveItem.new_item_total_amount || 0,
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 text-sm text-slate-900">
                {approveItem.to_item_name}
              </div>
            )}

            <div className="text-sm font-semibold text-slate-700">Amount:</div>

            <div className="text-base font-bold text-blue-700">
              {Number(approveItem.amount || 0).toLocaleString()}
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

          if (!rejectItem) return;

          rejectMutation.mutate({
            id: rejectItem.id,
            note: rejectionNote,
          });
        }}
      >
        <textarea
          value={rejectionNote}
          onChange={(e) => setRejectionNote(e.target.value)}
          rows={4}
          placeholder="Enter rejection reason..."
          className="w-full rounded-xl border border-slate-300 p-3"
        />
      </ConfirmModal>
    </div>
  );
}
