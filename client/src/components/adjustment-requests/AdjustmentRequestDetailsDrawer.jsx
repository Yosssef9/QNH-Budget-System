import { ArrowRight, X } from "lucide-react";

import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import { formatDateTime } from "../../utils/dateFormatters";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function quantityDelta(request) {
  const current = Number(request?.item?.current_requested_quantity || 0);
  const requested = Number(request?.item?.requested_quantity || 0);
  return requested - current;
}

function InfoTile({ label, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-black uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">
        {children || "-"}
      </div>
    </div>
  );
}

export default function AdjustmentRequestDetailsDrawer({
  request,
  open,
  onClose,
  onApprove,
  onReject,
}) {
  if (!open || !request) return null;

  const isPending = request.status === "PENDING";
  const isIncrease = request.item?.change_type === "INCREASE_QUANTITY";
  const currentQuantity = request.item?.current_requested_quantity ?? 0;
  const requestedQuantity = request.item?.requested_quantity ?? 0;
  const delta = quantityDelta(request);

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-blue-600">
                Department Adjustment Request
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Request #{request.id}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {request.department?.name || "Department"} -{" "}
                {request.category?.name || "Category"} -{" "}
                {request.financial_year?.year || "FY"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close adjustment request details"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-slate-500">
                    Requested Item
                  </div>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    {request.item?.catalog_item_name || "-"}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                      {isIncrease ? "Increase existing item" : "Add new item"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      {request.item?.expense_type || "Item"}
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      {request.status}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-black uppercase text-slate-500">
                  Current approved quantity
                </div>
                <div className="mt-2 text-4xl font-black text-slate-950">
                  {isIncrease ? formatQuantity(currentQuantity) : "0"}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Baseline from the completed category review.
                </p>
              </div>

              <div className="flex justify-center">
                <span className="rounded-full bg-blue-600 p-3 text-white shadow">
                  <ArrowRight size={22} />
                </span>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="text-xs font-black uppercase text-emerald-700">
                  HOD requested quantity
                </div>
                <div className="mt-2 text-4xl font-black text-slate-950">
                  {formatQuantity(requestedQuantity)}
                </div>
                <p className="mt-2 text-sm font-black text-emerald-700">
                  {isIncrease
                    ? `Increase: +${formatQuantity(Math.max(delta, 0))}`
                    : "New item request"}
                </p>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <InfoTile label="Submitted by">
                {request.submitted_by_name || "-"}
              </InfoTile>
              <InfoTile label="Submitted at">
                {request.submitted_at
                  ? formatDateTime(request.submitted_at)
                  : "-"}
              </InfoTile>
              <InfoTile label="Reviewed by">
                {request.category_reviewed_by_name || "-"}
              </InfoTile>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase text-slate-500">
                    HOD reason
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {request.reason || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase text-slate-500">
                    Category Manager decision note
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {request.category_note || "-"}
                  </p>
                </div>
              </div>

              {request.item?.description ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-black uppercase text-slate-500">
                    Additional description
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {request.item.description}
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        {isPending && (onApprove || onReject) ? (
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onReject?.(request)}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove?.(request)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                Approve for Action
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AnimatedDrawer>
  );
}
