import { formatDateTime } from "../../utils/dateFormatters";

export default function TransferDetailsDrawer({ transfer, open, onClose }) {
  if (!open || !transfer) return null;

  return (
    <div className="space-y-5">
      {transfer.is_new_item ? (
        <div className="rounded-3xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-purple-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-2xl">
              🆕
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Request Type
              </div>

              <div className="text-lg font-bold text-slate-900">
                New Budget Item Request
              </div>

              <div className="text-sm text-slate-600">
                Approval will create a brand new budget item.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
              🔄
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Request Type
              </div>

              <div className="text-lg font-bold text-slate-900">
                Transfer Between Existing Items
              </div>

              <div className="text-sm text-slate-600">
                Funds will move between two existing budget items.
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-slate-500">Status</div>
        <div className="font-medium">{transfer.status}</div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Amount</div>
        <div className="font-medium">
          {Number(transfer.amount || 0).toLocaleString()}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Reason</div>
        <div>{transfer.reason}</div>
      </div>

      <hr />

      <div className="font-medium">{transfer.from_item_name}</div>

      <div>
        <div className="text-xs text-slate-500">To Budget Item</div>

        {transfer.is_new_item ? (
          <div className="font-medium">🆕 New Budget Item</div>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div className="font-medium">{transfer.to_item_name}</div>

            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                transfer.to_expense_type === "CAPEX"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {transfer.to_expense_type}
            </span>
          </div>
        )}
      </div>

      {transfer.is_new_item && (
        <>
          <hr />

          <div className="rounded-3xl border border-purple-200 bg-purple-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">📦</span>

              <div className="font-bold text-purple-900">New Item Details</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">Item Type</div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="font-medium">
                    {transfer.new_item_type_name || "-"}
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      transfer.new_item_expense_type === "CAPEX"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {transfer.new_item_expense_type}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Category</div>

                <div className="font-medium">
                  {transfer.category_name || "-"}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Quantity</div>

                <div className="font-medium">
                  {transfer.new_item_quantity || "-"}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Unit Price</div>

                <div className="font-medium">
                  {Number(transfer.new_item_unit_price || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-purple-100 bg-white p-4">
              <div className="text-xs uppercase text-purple-500">
                Total New Budget
              </div>

              <div className="mt-2 text-2xl font-bold text-purple-700">
                {Number(transfer.amount || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}

      <hr />

      <div>
        <div className="text-xs text-slate-500">Requested By</div>
        <div>{transfer.requested_by_name}</div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Requested At</div>
        <div>
          {transfer.requested_at ? formatDateTime(transfer.requested_at) : "-"}
        </div>
      </div>

      <hr />

      <div>
        <div className="text-xs text-slate-500">Approved By</div>
        <div>{transfer.approved_by_name || "-"}</div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Approved At</div>
        <div>
          {transfer.approved_at ? formatDateTime(transfer.approved_at) : "-"}
        </div>
      </div>

      <hr />

      <div>
        <div className="text-xs text-slate-500">Rejected By</div>
        <div>{transfer.rejected_by_name || "-"}</div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Rejected At</div>
        <div>
          {transfer.rejected_at ? formatDateTime(transfer.rejected_at) : "-"}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Rejection Note</div>

        <div>{transfer.rejection_note || "-"}</div>
      </div>
    </div>
  );
}
