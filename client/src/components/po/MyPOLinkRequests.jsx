import { useMemo, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";

import CurrencyText from "../CurrencyText";
import POLinkStatusBadge from "./POLinkStatusBadge";
import { formatDateTime } from "../../utils/dateFormatters";

const TABS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function MyPOLinkRequests({
  requests = [],
  onView,
  onCreateFromRejected,
}) {
  const [activeTab, setActiveTab] = useState("ALL");

  const filteredRequests = useMemo(() => {
    if (activeTab === "ALL") {
      return requests;
    }

    return requests.filter((request) => request.status === activeTab);
  }, [requests, activeTab]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">
          My PO Link Requests
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review your request history.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3">Request ID</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Budget Type</th>
              <th className="px-4 py-3">Sub Item</th>
              <th className="px-4 py-3">PO Item</th>
              <th className="px-4 py-3">Requested Qty</th>
              <th className="px-4 py-3">Linked Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-500">
                  No requests found.
                </td>
              </tr>
            )}

            {filteredRequests.map((request) => {
              return (
                <tr key={request.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{request.id}</td>

                  <td className="px-4 py-3">{request.category_name}</td>

                  <td className="px-4 py-3">{request.budget_type_name}</td>

                  <td className="px-4 py-3">
                    {request.sub_item_name_snapshot}
                  </td>

                  <td className="px-4 py-3">{request.item_description}</td>

                  <td className="px-4 py-3">{request.requested_qty}</td>

                  <td className="px-4 py-3">
                    <CurrencyText value={request.linked_amount || 0} />
                  </td>

                  <td className="px-4 py-3">
                    <POLinkStatusBadge status={request.status} />
                  </td>

                  <td className="px-4 py-3">
                    {request.created_at
                      ? formatDateTime(request.created_at)
                      : ""}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onView?.(request)}
                        className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
                      >
                        <Eye size={16} />
                      </button>

                      {request.status === "REJECTED" && (
                        <button
                          type="button"
                          onClick={() => onCreateFromRejected?.(request)}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-700"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
