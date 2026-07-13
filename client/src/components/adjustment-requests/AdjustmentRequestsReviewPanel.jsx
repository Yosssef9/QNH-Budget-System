import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCircle2, Clock3, FileText, XCircle } from "lucide-react";

import {
  approveAdjustmentRequest,
  getCategoryAdjustmentRequests,
  rejectAdjustmentRequest,
} from "../../api/adjustmentRequests.api";
import ConfirmModal from "../ConfirmModal";
import EnterpriseSearch from "../EnterpriseSearch";
import CurrencyText from "../CurrencyText";
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

export default function AdjustmentRequestsReviewPanel() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["adjustment-requests", "category", status],
    queryFn: () => getCategoryAdjustmentRequests(status),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;

    return data.filter((item) =>
      [
        item.item?.catalog_item_name,
        item.department?.name,
        item.reason,
        item.category_note,
      ].some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [data, search]);

  const counts = useMemo(
    () => ({
      all: data.length,
      pending: data.filter((item) => item.status === "PENDING").length,
      approved: data.filter((item) => item.status === "APPROVED_FOR_ACTION")
        .length,
      rejected: data.filter((item) => item.status === "REJECTED").length,
    }),
    [data],
  );
  const filterCards = [
    {
      value: "ALL",
      label: "All Requests",
      count: counts.all,
      Icon: FileText,
      activeClass: "border-blue-500 bg-blue-50",
      iconClass: "text-blue-600",
    },
    {
      value: "PENDING",
      label: "Pending",
      count: counts.pending,
      Icon: Clock3,
      activeClass: "border-amber-500 bg-amber-50",
      iconClass: "text-amber-600",
    },
    {
      value: "APPROVED_FOR_ACTION",
      label: "Approved",
      count: counts.approved,
      Icon: CheckCircle2,
      activeClass: "border-emerald-500 bg-emerald-50",
      iconClass: "text-emerald-600",
    },
    {
      value: "REJECTED",
      label: "Rejected",
      count: counts.rejected,
      Icon: XCircle,
      activeClass: "border-red-500 bg-red-50",
      iconClass: "text-red-600",
    },
  ];

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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Department Adjustment Requests
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review post-pre-closing HOD requests for your assigned category.
            Approval records intent only; transfers fulfill the request later.
          </p>
        </div>

        <EnterpriseSearch
          value={search}
          onChange={setSearch}
          placeholder="Search adjustment requests..."
          showClear
        />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        {filterCards.map(({ value, label, count, Icon, activeClass, iconClass }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
              status === value ? activeClass : "bg-white"
            }`}
          >
            <Icon size={18} className={iconClass} />
            <div className="mt-2 text-2xl font-bold">{count}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
          Loading adjustment requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
          No adjustment requests found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((request) => (
            <article
              key={request.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    <span className="text-xs text-slate-400">
                      Request #{request.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {request.item?.catalog_item_name || "-"}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {request.item?.change_type === "ADD_ITEM"
                      ? "Add new item"
                      : "Increase existing item"}{" "}
                    · {request.department?.name || "-"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {request.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span>
                      Submitted:{" "}
                      {request.submitted_at
                        ? formatDateTime(request.submitted_at)
                        : "-"}
                    </span>
                    <span>Category: {request.category?.name || "-"}</span>
                  </div>
                </div>

                <div className="grid gap-3 text-right sm:grid-cols-2 lg:min-w-[260px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">Quantity</div>
                    <div className="text-lg font-bold text-slate-900">
                      {request.item?.requested_quantity ?? "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">Amount</div>
                    <div className="text-lg font-bold text-slate-900">
                      {request.item?.requested_amount ? (
                        <CurrencyText value={request.item.requested_amount} />
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {request.status === "PENDING" && (
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDecision({ type: "REJECT", request });
                      setDecisionNote("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                  >
                    <XCircle size={17} />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecision({ type: "APPROVE", request });
                      setDecisionNote("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={17} />
                    Approve for Action
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

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
        <textarea
          rows={4}
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          placeholder={
            decision?.type === "APPROVE"
              ? "Optional note"
              : "Reason for rejection"
          }
          className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </ConfirmModal>
    </section>
  );
}
