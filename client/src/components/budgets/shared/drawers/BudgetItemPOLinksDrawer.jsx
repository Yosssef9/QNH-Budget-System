import {
  CheckCircle2,
  FileText,
  PackageSearch,
  ReceiptText,
  X,
} from "lucide-react";

import AnimatedDrawer from "./AnimatedDrawer";
import CurrencyText from "../../../CurrencyText";
import LoadingSpinner from "../../../LoadingSpinner";
import POLinkStatusBadge from "../../../po/POLinkStatusBadge";
import useBudgetItemPOLinks from "../../../../hooks/budgets/useBudgetItemPOLinks";
import { formatDateTime, formatDate } from "../../../../utils/dateFormatters";
import { formatQty } from "../../../../utils/numberFormatter";

function SummaryMetric({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={20} />
        </div>
      </div>

      {description && (
        <p className="mt-3 text-sm font-medium text-slate-500">{description}</p>
      )}
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-bold text-slate-900">
        {value ?? "-"}
      </span>
    </div>
  );
}

function POApprovedLinkCard({ link }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <POLinkStatusBadge status={link.status} />
          <h3 className="mt-3 text-lg font-bold text-slate-900">
            {link.supplier_name || "-"}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase text-slate-400">
            Linked Amount
          </p>
          <div className="mt-1 text-lg font-bold text-blue-700">
            <CurrencyText value={link.linked_amount || 0} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase text-slate-700">
            <PackageSearch size={16} className="text-blue-600" />
            PO Information
          </h4>

          <DetailLine label="Item Description" value={link.item_description} />
          <DetailLine label="Invoice Number" value={link.invoice_no} />
          <DetailLine
            label="Invoice Due Date"
            value={formatDate(link.invoice_due_date)}
          />
          <DetailLine label="Order ID" value={link.order_id} />
          <DetailLine label="Item Code" value={link.item_code} />
          <DetailLine label="PO Quantity" value={formatQty(link.po_qty)} />
          <DetailLine
            label="PO Unit Cost"
            value={<CurrencyText value={link.po_unit_cost || 0} />}
          />
          <DetailLine
            label="PO Net Amount"
            value={<CurrencyText value={link.po_net_amount || 0} />}
          />
        </section>

        <section className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase text-slate-700">
            <ReceiptText size={16} className="text-blue-600" />
            Link Information
          </h4>

          <DetailLine
            label="Requested Quantity"
            value={formatQty(link.requested_qty)}
          />
          <DetailLine
            label="Unit Cost"
            value={<CurrencyText value={link.unit_cost || 0} />}
          />
          <DetailLine
            label="Linked Amount"
            value={<CurrencyText value={link.linked_amount || 0} />}
          />
          <DetailLine label="Requested By" value={link.requested_by_name} />
          <DetailLine
            label="Requested At"
            value={formatDateTime(link.requested_at)}
          />
          <DetailLine label="Approved By" value={link.approved_by_name} />
          <DetailLine
            label="Approved At"
            value={formatDateTime(link.approved_at)}
          />
        </section>
      </div>
    </article>
  );
}

export default function BudgetItemPOLinksDrawer({
  open,
  budgetItemId,
  onClose,
}) {
  const { data, isLoading, isError } = useBudgetItemPOLinks(
    open ? budgetItemId : null,
  );

  const budgetItem = data?.budgetItem;
  const summary = data?.summary || {};
  const links = data?.links || [];

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Linked Approved POs
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Approved PO link records that make up the PO Used amount.
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
              Failed to load linked PO records.
            </div>
          )}

          {!isLoading && !isError && (
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailLine
                    label="Budget Type"
                    value={budgetItem?.budget_type_name}
                  />
                  <DetailLine
                    label="Department"
                    value={budgetItem?.department_name}
                  />
                  <DetailLine
                    label="Financial Year"
                    value={
                      budgetItem?.financial_year
                        ? `${budgetItem.financial_year}`
                        : "-"
                    }
                  />
                  <DetailLine
                    label="Budget Quantity"
                    value={formatQty(budgetItem?.budget_quantity)}
                  />
                  <DetailLine
                    label="Budget Total Amount"
                    value={
                      <CurrencyText
                        value={budgetItem?.budget_total_amount || 0}
                      />
                    }
                  />
                  <DetailLine
                    label="Total PO Used"
                    value={<CurrencyText value={summary.totalPOUsed || 0} />}
                  />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <SummaryMetric
                  title="Approved PO Links"
                  value={summary.approvedLinkCount || 0}
                  description="Approved records included in PO Used"
                  icon={CheckCircle2}
                />
                <SummaryMetric
                  title="Total PO Used"
                  value={<CurrencyText value={summary.totalPOUsed || 0} />}
                  description="Single source from approved PO link totals"
                  icon={ReceiptText}
                />
                <SummaryMetric
                  title="Total Linked Quantity"
                  value={formatQty(summary.totalLinkedQuantity || 0)}
                  description="Quantity linked through approved PO requests"
                  icon={FileText}
                />
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Approved PO Link Records
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Only approved links are shown because only approved links
                    contribute to PO Used.
                  </p>
                </div>

                {links.map((link) => (
                  <POApprovedLinkCard key={link.id} link={link} />
                ))}

                {links.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                    No approved PO links found for this budget item.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </AnimatedDrawer>
  );
}
