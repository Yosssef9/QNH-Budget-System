import { ArrowRight, X } from "lucide-react";

import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CurrencyText from "../CurrencyText";
import { formatDateTime } from "../../utils/dateFormatters";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function amount(quantity, unitPrice) {
  return Number(quantity || 0) * Number(unitPrice || 0);
}

function InfoTile({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-black uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">
        {children || value || "-"}
      </div>
    </div>
  );
}

function ModelSummary({
  tone,
  title,
  itemName,
  modelName,
  expenseType,
  unitPrice,
  quantity,
  baseQuantity,
  remainingBefore,
  remainingAfter,
}) {
  const isSource = tone === "source";
  const colors = isSource
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-3xl border p-5 ${colors}`}>
      <div className="text-xs font-black uppercase">{title}</div>
      <div className="mt-2 text-xl font-black text-slate-950">
        {itemName || "-"}
      </div>
      <div className="mt-1 text-sm font-black">
        {modelName || "Package model"}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-white px-2 py-1 text-slate-700">
          {expenseType || "Item"}
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-slate-700">
          Transfer {formatQuantity(quantity)} units
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoTile label="Unit price">
          <CurrencyText value={unitPrice || 0} />
        </InfoTile>
        <InfoTile label="Base quantity">{formatQuantity(baseQuantity)}</InfoTile>
        <InfoTile label="Transfer value">
          <CurrencyText value={amount(quantity, unitPrice)} />
        </InfoTile>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <InfoTile label="Remaining before">
          <div className="space-y-1">
            <div>{formatQuantity(remainingBefore)} units</div>
            <div className="text-xs font-black text-slate-500">
              <CurrencyText value={amount(remainingBefore, unitPrice)} />
            </div>
          </div>
        </InfoTile>
        <InfoTile label="Remaining after">
          <div className="space-y-1">
            <div>{formatQuantity(remainingAfter)} units</div>
            <div className="text-xs font-black text-slate-500">
              <CurrencyText value={amount(remainingAfter, unitPrice)} />
            </div>
          </div>
        </InfoTile>
      </div>
    </div>
  );
}

export default function TransferDetailsDrawer({
  transfer,
  open,
  onClose,
  onApprove,
  onReject,
}) {
  if (!open || !transfer) return null;

  const isPending = transfer.status === "PENDING_APPROVAL";
  const sourceUnitPrice =
    transfer.source_unit_price_snapshot || transfer.from_unit_price || 0;
  const destinationUnitPrice =
    transfer.destination_unit_price_snapshot || transfer.to_unit_price || 0;
  const sourceBefore =
    transfer.from_remaining_before_transfer ?? transfer.from_base_quantity ?? 0;
  const sourceAfter =
    transfer.from_remaining_after_transfer ??
    Number(sourceBefore || 0) - Number(transfer.source_quantity || 0);
  const destinationBefore =
    transfer.to_remaining_before_transfer ?? transfer.to_base_quantity ?? 0;
  const destinationAfter =
    transfer.to_remaining_after_transfer ??
    Number(destinationBefore || 0) + Number(transfer.destination_quantity || 0);

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-blue-600">
                Category Package Transfer
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Request #{transfer.id}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {transfer.category_name || "Category"} - FY{" "}
                {transfer.financial_year || "-"} - {transfer.status}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close transfer details"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <ModelSummary
                tone="source"
                title="Source package model"
                itemName={transfer.from_item_name}
                modelName={transfer.from_sub_item_name}
                expenseType={transfer.from_expense_type}
                unitPrice={sourceUnitPrice}
                quantity={transfer.source_quantity}
                baseQuantity={transfer.from_base_quantity}
                remainingBefore={sourceBefore}
                remainingAfter={sourceAfter}
              />

              <div className="flex justify-center">
                <span className="rounded-full bg-blue-600 p-3 text-white shadow">
                  <ArrowRight size={22} />
                </span>
              </div>

              <ModelSummary
                tone="destination"
                title="Destination package model"
                itemName={transfer.to_item_name}
                modelName={transfer.to_sub_item_name}
                expenseType={transfer.to_expense_type}
                unitPrice={destinationUnitPrice}
                quantity={transfer.destination_quantity}
                baseQuantity={transfer.to_base_quantity}
                remainingBefore={destinationBefore}
                remainingAfter={destinationAfter}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <InfoTile label="Transfer amount">
                <CurrencyText value={transfer.amount || 0} />
              </InfoTile>
              <InfoTile label="Source remaining value after">
                <CurrencyText value={amount(sourceAfter, sourceUnitPrice)} />
              </InfoTile>
              <InfoTile label="Destination value after">
                <CurrencyText
                  value={amount(destinationAfter, destinationUnitPrice)}
                />
              </InfoTile>
              <InfoTile label="Requested by">
                {transfer.requested_by_name || "-"}
              </InfoTile>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoTile label="Requested at">
                  {transfer.requested_at
                    ? formatDateTime(transfer.requested_at)
                    : "-"}
                </InfoTile>
                <InfoTile label="Approved by">
                  {transfer.approved_by_name || "-"}
                </InfoTile>
                <InfoTile label="Rejected by">
                  {transfer.rejected_by_name || "-"}
                </InfoTile>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-black uppercase text-slate-500">
                  Business reason
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {transfer.reason || "-"}
                </p>
              </div>

              {transfer.rejection_note ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="text-xs font-black uppercase text-red-600">
                    Rejection reason
                  </div>
                  <p className="mt-2 text-sm leading-6 text-red-800">
                    {transfer.rejection_note}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isPending ? (
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onReject?.(transfer)}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove?.(transfer)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                Approve
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AnimatedDrawer>
  );
}
