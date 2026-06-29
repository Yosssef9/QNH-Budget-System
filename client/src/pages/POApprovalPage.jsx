import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Filter, Link2, Search, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import CurrencyText from "../components/CurrencyText";
import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import EnterpriseSearch from "../components/EnterpriseSearch";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import Input from "../components/Input";
import POLinkDetailsDrawer from "../components/po/POLinkDetailsDrawer";
import POApprovalTable from "../components/po/POApprovalTable";
import {
  useApproveCategoryPoLink,
  useCategoryPoLinksForApproval,
  useRejectCategoryPoLink,
} from "../hooks/category-po-links/useCategoryPoLinks";
import { formatDateTime } from "../utils/dateFormatters";

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

function ApprovalDetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-2 last:border-b-0">
      <span className="text-xs font-bold uppercase text-slate-500">
        {label}
      </span>
      <span className="max-w-[60%] text-right text-sm font-semibold text-slate-900">
        {value || "-"}
      </span>
    </div>
  );
}

function POApprovalDecisionSummary({ request }) {
  if (!request) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <ApprovalDetailRow label="Category" value={request.category_name} />
      <ApprovalDetailRow
        label="Financial Year"
        value={request.financial_year ? `FY ${request.financial_year}` : "-"}
      />
      <ApprovalDetailRow label="Budget Type" value={request.budget_type_name} />
      <ApprovalDetailRow
        label="Sub Item"
        value={request.sub_item_name_snapshot}
      />
      <ApprovalDetailRow label="PO Item" value={request.item_description} />
      <ApprovalDetailRow label="Supplier" value={request.supplier_name} />
      <ApprovalDetailRow
        label="Requested Quantity"
        value={request.requested_qty}
      />
      <ApprovalDetailRow
        label="Unit Cost"
        value={<CurrencyText value={request.unit_cost || 0} />}
      />
      <ApprovalDetailRow
        label="Linked Amount"
        value={<CurrencyText value={request.linked_amount || 0} />}
      />
      <ApprovalDetailRow
        label="Requested By"
        value={request.requested_by_name}
      />
      <ApprovalDetailRow
        label="Requested Date"
        value={formatDateTime(request.requested_at)}
      />
    </div>
  );
}

export default function POApprovalPage() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveItem, setApproveItem] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const queryParams = useMemo(
    () => ({
      status: statusFilter,
    }),
    [statusFilter],
  );

  const {
    data: poApprovalRequests = [],
    isLoading,
    isFetching,
  } = useCategoryPoLinksForApproval(queryParams);

  const approveMutation = useApproveCategoryPoLink();
  const rejectMutation = useRejectCategoryPoLink();

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return poApprovalRequests.filter((request) => {
      const matchesSearch =
        !query ||
        [
          request.id,
          request.category_name,
          request.budget_type_name,
          request.sub_item_name_snapshot,
          request.item_description,
          request.item_code,
          request.order_id,
          request.supplier_name,
          request.requested_by_name,
        ]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(query));

      return matchesSearch;
    });
  }, [poApprovalRequests, search]);

  const pendingCount = poApprovalRequests.filter(
    (request) => request.status === "PENDING",
  ).length;
  const approvedCount = poApprovalRequests.filter(
    (request) => request.status === "APPROVED",
  ).length;
  const rejectedCount = poApprovalRequests.filter(
    (request) => request.status === "REJECTED",
  ).length;

  async function confirmApprove() {
    if (!approveItem) return;

    try {
      await approveMutation.mutateAsync({ poLinkId: approveItem.id });
      setApproveItem(null);
      toast.success("PO link approved successfully");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to approve PO link",
      );
    }
  }

  async function confirmReject() {
    if (!rejectItem) return;

    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        poLinkId: rejectItem.id,
        payload: { reason: rejectReason.trim() },
      });

      setRejectItem(null);
      setRejectReason("");
      toast.success("PO link rejected successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject PO link");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Dashboard", path: "/" }, { label: "PO Approvals" }]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Link2 size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                PO Approvals
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review, approve, or reject PO links against approved sub-item
                lines.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {isFetching ? "Refreshing requests..." : "Approval queue ready"}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          item={{
            title: "Pending Requests",
            value: pendingCount,
            description: "Waiting for approval",
            icon: Clock3,
            highlight: pendingCount > 0 ? "pending" : undefined,
          }}
        />
        <DashboardStatCard
          item={{
            title: "Approved",
            value: approvedCount,
            description: "Approved in current list",
            icon: CheckCircle2,
          }}
        />
        <DashboardStatCard
          item={{
            title: "Rejected",
            value: rejectedCount,
            description: "Rejected in current list",
            icon: XCircle,
          }}
        />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Filter size={18} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Filters</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <EnterpriseSearch
            value={search}
            onChange={setSearch}
            icon={Search}
            placeholder="Search by request, category, sub-item, PO item..."
          />

          <SearchableMultiSelect
            multiple={false}
            value={statusFilter}
            options={statusOptions}
            disableClear
            onChange={(event) => setStatusFilter(event.target.value)}
            placeholder="Status"
          />
        </div>
      </section>

      <POApprovalTable
        requests={filteredRequests}
        loading={isLoading}
        onView={setSelectedRequest}
        onApprove={setApproveItem}
        onReject={setRejectItem}
      />

      <POLinkDetailsDrawer
        open={Boolean(selectedRequest)}
        requestId={selectedRequest?.id}
        onClose={() => setSelectedRequest(null)}
        canApprove
        onApprove={(request) => {
          setSelectedRequest(null);
          setApproveItem(request);
        }}
        onReject={(request) => {
          setSelectedRequest(null);
          setRejectItem(request);
        }}
      />

      <ConfirmModal
        open={Boolean(approveItem)}
        title="Approve PO Link"
        message="Review the PO link request details before approval."
        confirmText="Approve"
        loading={approveMutation.isPending}
        onCancel={() => setApproveItem(null)}
        onConfirm={confirmApprove}
      >
        <POApprovalDecisionSummary request={approveItem} />
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(rejectItem)}
        title="Reject PO Link"
        message="Please provide a rejection reason."
        danger
        confirmText="Reject Request"
        loading={rejectMutation.isPending}
        onCancel={() => {
          setRejectItem(null);
          setRejectReason("");
        }}
        onConfirm={confirmReject}
      >
        <POApprovalDecisionSummary request={rejectItem} />

        <div className="mt-4">
          <Input
            label="Rejection Reason"
            required
            multiline
            rows={4}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Enter rejection reason..."
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
