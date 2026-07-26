import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MessageSquareText,
  XCircle,
} from "lucide-react";

import {
  approveAdjustmentRequest,
  getCategoryAdjustmentRequests,
  rejectAdjustmentRequest,
} from "../../api/adjustmentRequests.api";
import CollapsibleSection from "../CollapsibleSection";
import ConfirmModal from "../ConfirmModal";
import EnterpriseSearch from "../EnterpriseSearch";
import Input from "../Input";
import AdjustmentRequestDetailsDrawer from "./AdjustmentRequestDetailsDrawer";
import { formatDateTime } from "../../utils/dateFormatters";

function StatusBadge({ status }) {
  const styles = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED_FOR_ACTION: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
    PARTIALLY_FULFILLED: "border-blue-200 bg-blue-50 text-blue-700",
    FULFILLED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        styles[status] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {String(status || "").replaceAll("_", " ")}
    </span>
  );
}

function FilterCard({ active, count, icon: Icon, iconClass, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
        active ? "border-blue-500 bg-blue-50" : "bg-white hover:bg-slate-50"
      }`}
    >
      <Icon size={18} className={iconClass} />
      <div className="mt-2 text-2xl font-bold">{count}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </button>
  );
}

function AdjustmentRequestCard({ request, onApprove, onReject, onView }) {
  const isPending = request.status === "PENDING";
  const changeType =
    request.item?.change_type === "ADD_ITEM"
      ? "Add new category item"
      : "Increase existing item";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="grid gap-0 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} />
            <span className="text-xs font-semibold text-slate-400">
              Request #{request.id}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
              {request.category?.name || "Category"}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            {request.item?.catalog_item_name || "-"}
          </h3>

          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {request.department?.name || "-"}
            </span>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">
              {changeType}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-1 text-xs font-black uppercase text-slate-500">
              HOD Reason
            </div>
            <p className="text-sm leading-6 text-slate-700">
              {request.reason || "-"}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
            <span>
              Submitted:{" "}
              {request.submitted_at
                ? formatDateTime(request.submitted_at)
                : "-"}
            </span>
            {request.category_note ? (
              <span>Category note: {request.category_note}</span>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
          <div className="grid gap-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-500">
                Requested Quantity
              </div>
              <div className="text-lg font-bold text-slate-900">
                {request.item?.requested_quantity ?? "-"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => onView(request)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Eye size={17} />
              View Details
            </button>
          </div>

          {isPending ? (
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => onApprove(request)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={17} />
                Approve for Action
              </button>
              <button
                type="button"
                onClick={() => onReject(request)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
              >
                <XCircle size={17} />
                Reject
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function AdjustmentRequestsReviewPanel() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["adjustment-requests", "category", "ALL"],
    queryFn: () => getCategoryAdjustmentRequests("ALL"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const statusFiltered =
      status === "ALL"
        ? requests
        : requests.filter((item) => item.status === status);

    if (!q) return statusFiltered;

    return statusFiltered.filter((item) =>
      [
        item.item?.catalog_item_name,
        item.department?.name,
        item.reason,
        item.category_note,
        item.category?.name,
        item.item?.change_type,
      ].some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [requests, search, status]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((item) => item.status === "PENDING").length,
      approved: requests.filter((item) => item.status === "APPROVED_FOR_ACTION")
        .length,
      rejected: requests.filter((item) => item.status === "REJECTED").length,
    }),
    [requests],
  );

  const approveMutation = useMutation({
    mutationFn: approveAdjustmentRequest,
    onSuccess: () => {
      toast.success("Adjustment request approved for action");
      queryClient.invalidateQueries({ queryKey: ["adjustment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDecision(null);
      setDecisionNote("");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to approve request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectAdjustmentRequest,
    onSuccess: () => {
      toast.success("Adjustment request rejected");
      queryClient.invalidateQueries({ queryKey: ["adjustment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDecision(null);
      setDecisionNote("");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to reject request");
    },
  });

  function confirmDecision() {
    if (!decision) return;

    if (decision.type === "REJECT" && !decisionNote.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    const payload = {
      requestId: decision.request.id,
      note: decisionNote.trim() || null,
    };

    if (decision.type === "APPROVE") {
      approveMutation.mutate(payload);
    } else {
      rejectMutation.mutate(payload);
    }
  }

  return (
    <CollapsibleSection
      title="Department Adjustment Requests"
      description={`${counts.pending} pending request(s) from departments in your assigned category`}
      icon={<MessageSquareText size={22} />}
      defaultOpen={counts.pending > 0}
      openText="Hide Requests"
      closedText="Show Requests"
      className="bg-white"
      headerClassName="bg-white"
      bodyClassName="space-y-6 bg-slate-50"
      iconClassName="bg-blue-50 text-blue-700"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Category Manager Decision Queue
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Review post-pre-closing HOD requests. Approval records intent only;
            transfers fulfill the request later.
          </p>
        </div>

        <EnterpriseSearch
          value={search}
          onChange={setSearch}
          placeholder="Search adjustment requests..."
          showClear
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <FilterCard
          active={status === "ALL"}
          count={counts.all}
          icon={FileText}
          iconClass="text-blue-600"
          label="All Requests"
          onClick={() => setStatus("ALL")}
        />
        <FilterCard
          active={status === "PENDING"}
          count={counts.pending}
          icon={Clock3}
          iconClass="text-amber-600"
          label="Pending"
          onClick={() => setStatus("PENDING")}
        />
        <FilterCard
          active={status === "APPROVED_FOR_ACTION"}
          count={counts.approved}
          icon={CheckCircle2}
          iconClass="text-emerald-600"
          label="Approved"
          onClick={() => setStatus("APPROVED_FOR_ACTION")}
        />
        <FilterCard
          active={status === "REJECTED"}
          count={counts.rejected}
          icon={XCircle}
          iconClass="text-red-600"
          label="Rejected"
          onClick={() => setStatus("REJECTED")}
        />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
          Loading adjustment requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
          No adjustment requests found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((request) => (
            <AdjustmentRequestCard
              key={request.id}
              request={request}
              onApprove={(item) => {
                setDecision({ type: "APPROVE", request: item });
                setDecisionNote("");
              }}
              onReject={(item) => {
                setDecision({ type: "REJECT", request: item });
                setDecisionNote("");
              }}
              onView={setSelectedRequest}
            />
          ))}
        </div>
      )}

      <AdjustmentRequestDetailsDrawer
        request={selectedRequest}
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        onApprove={(request) => {
          setSelectedRequest(null);
          setDecision({ type: "APPROVE", request });
          setDecisionNote("");
        }}
        onReject={(request) => {
          setSelectedRequest(null);
          setDecision({ type: "REJECT", request });
          setDecisionNote("");
        }}
      />

      <ConfirmModal
        open={Boolean(decision)}
        title={
          decision?.type === "APPROVE"
            ? "Approve Adjustment Request?"
            : "Reject Adjustment Request?"
        }
        message={
          decision?.type === "APPROVE"
            ? "This records that you will work on the request. It does not change budget balances."
            : "Rejecting requires a reason so the HOD understands the decision."
        }
        confirmText={decision?.type === "APPROVE" ? "Approve" : "Reject"}
        danger={decision?.type === "REJECT"}
        loading={approveMutation.isPending || rejectMutation.isPending}
        onCancel={() => setDecision(null)}
        onConfirm={confirmDecision}
      >
        <Input
          multiline
          rows={4}
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          placeholder={
            decision?.type === "APPROVE"
              ? "Optional note"
              : "Reason for rejection"
          }
          className="px-4 py-3 text-sm font-semibold focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </ConfirmModal>
    </CollapsibleSection>
  );
}
