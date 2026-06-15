import { CheckCircle2, Eye, XCircle } from "lucide-react";

import CurrencyText from "../CurrencyText";
import POLinkStatusBadge from "./POLinkStatusBadge";

export default function POApprovalTable({
  requests = [],
  loading = false,
  onView,
  onApprove,
  onReject,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="border border-slate-200 px-4 py-4 text-left">
                Request ID
              </th>

              <th className="border border-slate-200 px-4 py-4 text-left">
                Department
              </th>

              <th className="border border-slate-200 px-4 py-4 text-left">
                Financial Year
              </th>

              <th className="border border-slate-200 px-4 py-4 text-left">
                Requested By
              </th>

              <th className="border border-slate-200 px-4 py-4 text-left">
                Budget Type
              </th>

              <th className="border border-slate-200 px-4 py-4 text-left">
                Purchase Invoice Line
              </th>

              <th className="border border-slate-200 px-4 py-4 text-center">
                Requested Qty
              </th>

              <th className="border border-slate-200 px-4 py-4 text-center">
                Linked Amount
              </th>

              <th className="border border-slate-200 px-4 py-4 text-center">
                Status
              </th>

              <th className="border border-slate-200 px-4 py-4 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={10}
                  className="border border-slate-200 px-4 py-12 text-center text-slate-500"
                >
                  Loading PO approval requests...
                </td>
              </tr>
            )}

            {!loading && requests.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="border border-slate-200 px-4 py-12 text-center text-slate-500"
                >
                  No PO approval requests found.
                </td>
              </tr>
            )}

            {!loading &&
              requests.map((request) => {
                const isPending = request.status === "PENDING";

                return (
                  <tr key={request.id} className="transition hover:bg-slate-50">
                    <td className="border border-slate-200 px-4 py-4 font-semibold text-slate-800">
                      #{request.id}
                    </td>

                    <td className="border border-slate-200 px-4 py-4">
                      {request.department_name || "-"}
                    </td>

                    <td className="border border-slate-200 px-4 py-4">
                      {request.financial_year || "-"}
                    </td>

                    <td className="border border-slate-200 px-4 py-4">
                      {request.requested_by_name || "-"}
                    </td>

                    <td className="border border-slate-200 px-4 py-4">
                      {request.budget_type_name || "-"}
                    </td>

                    <td className="border border-slate-200 px-4 py-4">
                      #{request.purchase_invoice_line_id}
                    </td>

                    <td className="border border-slate-200 px-4 py-4 text-center font-semibold">
                      {request.requested_qty}
                    </td>

                    <td className="border border-slate-200 px-4 py-4 text-center font-semibold">
                      <CurrencyText value={request.linked_amount || 0} />
                    </td>

                    <td className="border border-slate-200 px-4 py-4 text-center">
                      <POLinkStatusBadge status={request.status} />
                    </td>

                    <td className="border border-slate-200 px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onView?.(request)}
                          className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => onApprove?.(request)}
                              className="inline-flex items-center justify-center rounded-lg bg-green-600 p-2 text-white transition hover:bg-green-700"
                              title="Approve"
                            >
                              <CheckCircle2 size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => onReject?.(request)}
                              className="inline-flex items-center justify-center rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
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
