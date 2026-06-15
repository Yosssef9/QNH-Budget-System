import { Building2, FileText, PackageSearch, RotateCcw, X } from "lucide-react";

import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CurrencyText from "../CurrencyText";
import LoadingSpinner from "../LoadingSpinner";
import POLinkStatusBadge from "./POLinkStatusBadge";
import { usePOLinkDetails } from "../../hooks/po/usePOLinkDetails";
import { formatDateTime } from "../../utils/dateFormatters";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-bold text-slate-900">
        {value ?? "-"}
      </span>
    </div>
  );
}

function DetailSection({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">{icon}</div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function POLinkDetailsDrawer({
  open,
  requestId,
  onClose,
  onCreateFromRejected,

  canApprove = false,
  onApprove,
  onReject,
}) {
  const {
    data: details,
    isLoading,
    isError,
  } = usePOLinkDetails(open ? requestId : null);

  const rejected = details?.status === "REJECTED" && !canApprove;
  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              PO Link Request {details ? `#${details.id}` : ""}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Full request details, budget item, PO information, and approval
              status.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <LoadingSpinner />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              Failed to load PO link details.
            </div>
          )}

          {!isLoading && !isError && details && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Request Status
                    </p>

                    <div className="mt-2">
                      <POLinkStatusBadge status={details.status} />
                    </div>
                  </div>

                  {rejected && (
                    <button
                      type="button"
                      onClick={() => onCreateFromRejected?.(details)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      <RotateCcw size={16} />
                      Create New Request
                    </button>
                  )}
                </div>
              </section>

              <DetailSection
                title="Request Summary"
                icon={<FileText size={18} />}
              >
                <DetailRow label="Request ID" value={details.id} />

                <DetailRow
                  label="Parent Budget Item"
                  value={details.parent_item_name}
                />

                <DetailRow
                  label="Requested Quantity"
                  value={details.requested_qty}
                />

                <DetailRow
                  label="Request Unit Cost"
                  value={<CurrencyText value={details.unit_cost || 0} />}
                />

                <DetailRow
                  label="Linked Amount"
                  value={<CurrencyText value={details.linked_amount || 0} />}
                />

                <DetailRow
                  label="Requested By"
                  value={details.requested_by_name}
                />

                <DetailRow
                  label="Requested At"
                  value={formatDateTime(details.requested_at)}
                />
              </DetailSection>

              <DetailSection
                title="Budget Information"
                icon={<Building2 size={18} />}
              >
                <DetailRow label="Department" value={details.department_name} />

                <DetailRow
                  label="Financial Year"
                  value={details.financial_year}
                />

                <DetailRow
                  label="Budget Status"
                  value={details.budget_status}
                />

                <DetailRow
                  label="Budget Type"
                  value={details.budget_type_name}
                />

                <DetailRow label="Expense Type" value={details.expense_type} />

                <DetailRow label="Budget ID" value={details.budget_id} />

                <DetailRow
                  label="Budget Item ID"
                  value={details.budget_item_id}
                />
              </DetailSection>
              <DetailSection
                title="Budget Allocation"
                icon={<Building2 size={18} />}
              >
                <DetailRow
                  label="Approved Quantity"
                  value={details.budget_item_quantity}
                />

                <DetailRow
                  label="Budget Unit Price"
                  value={
                    <CurrencyText value={details.budget_item_unit_price || 0} />
                  }
                />

                <DetailRow
                  label="Budget Total Amount"
                  value={
                    <CurrencyText
                      value={details.budget_item_total_amount || 0}
                    />
                  }
                />
              </DetailSection>
              <DetailSection
                title="Purchase Order Information"
                icon={<PackageSearch size={18} />}
              >
                <DetailRow label="Invoice Number" value={details.invoice_no} />

                <DetailRow
                  label="Purchase Invoice Line ID"
                  value={details.purchase_invoice_line_id}
                />

                <DetailRow label="Order ID" value={details.order_id} />

                <DetailRow label="Supplier" value={details.supplier_name} />

                <DetailRow label="Item Code" value={details.item_code} />

                <DetailRow
                  label="Item Description"
                  value={details.item_description}
                />

                <DetailRow label="PO Quantity" value={details.po_qty} />

                <DetailRow
                  label="PO Unit Cost"
                  value={<CurrencyText value={details.po_unit_cost || 0} />}
                />

                <DetailRow
                  label="PO Net Amount"
                  value={<CurrencyText value={details.po_net_amount || 0} />}
                />
              </DetailSection>
              {details.status === "APPROVED" && (
                <DetailSection
                  title="Approval Information"
                  icon={<FileText size={18} />}
                >
                  <DetailRow
                    label="Approved By"
                    value={details.approved_by_name}
                  />

                  <DetailRow
                    label="Approved At"
                    value={formatDateTime(details.approved_at)}
                  />
                </DetailSection>
              )}

              {details.status === "REJECTED" && (
                <DetailSection
                  title="Rejection Information"
                  icon={<FileText size={18} />}
                >
                  <DetailRow
                    label="Rejected By"
                    value={details.rejected_by_name}
                  />

                  <DetailRow
                    label="Rejected At"
                    value={formatDateTime(details.rejected_at)}
                  />

                  <DetailRow
                    label="Rejection Reason"
                    value={details.rejection_reason}
                  />
                </DetailSection>
              )}
              <DetailSection
                title="Audit Information"
                icon={<FileText size={18} />}
              >
                <DetailRow
                  label="Created At"
                  value={formatDateTime(details.created_at)}
                />

                <DetailRow
                  label="Last Updated"
                  value={formatDateTime(details.updated_at)}
                />
              </DetailSection>
            </div>
          )}
        </div>
        {canApprove && details?.status === "PENDING" && (
          <div className="border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onReject?.(details)}
                className="
          inline-flex
          items-center
          justify-center
          rounded-xl
          bg-red-600
          px-5
          py-2.5
          text-sm
          font-bold
          text-white
          transition
          hover:bg-red-700
        "
              >
                Reject Request
              </button>

              <button
                type="button"
                onClick={() => onApprove?.(details)}
                className="
          inline-flex
          items-center
          justify-center
          rounded-xl
          bg-green-600
          px-5
          py-2.5
          text-sm
          font-bold
          text-white
          transition
          hover:bg-green-700
        "
              >
                Approve Request
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatedDrawer>
  );
}
