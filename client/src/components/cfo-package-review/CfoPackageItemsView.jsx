import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileText,
  MessageSquareWarning,
  Paperclip,
  X,
} from "lucide-react";
import CurrencyText from "../CurrencyText";
import CfoReviewStatusBadge from "./CfoReviewStatusBadge";
import CollapsiblePanelToggle from "../layout/CollapsiblePanelToggle";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import {
  downloadCfoPackageSubItemAttachment,
  getCfoPackageSubItemAttachments,
} from "../../api/cfoPackageReview.api";

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadBlob({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function CfoSubItemDrawer({ subItem, departments = [], open, onClose }) {
  const departmentsByItemId = new Map(
    departments.map((department) => [
      Number(department.department_item_id),
      department,
    ]),
  );
  const attachmentsQuery = useQuery({
    queryKey: ["cfo-package-review", "sub-item-attachments", subItem?.id],
    queryFn: () => getCfoPackageSubItemAttachments(subItem.id),
    enabled: open && Boolean(subItem?.id),
  });

  async function handleDownload(attachment) {
    const result = await downloadCfoPackageSubItemAttachment({
      packageSubItemId: subItem.id,
      attachmentId: attachment.id,
    });
    downloadBlob(result);
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      {!subItem ? null : (
        <div className="flex h-full flex-col bg-slate-50">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                CFO model detail
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {subItem.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close model detail"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Shared model
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {subItem.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {subItem.sub_item_code || "Catalog model"} ·{" "}
                    {subItem.unit_of_measure_name || "Unit"}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2 text-right">
                  <p className="text-[11px] font-bold uppercase text-blue-600">
                    Model total
                  </p>
                  <p className="text-base font-black text-blue-900">
                    <CurrencyText value={subItem.line_total || 0} />
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500">
                    Quantity
                  </p>
                  <p className="mt-0.5 text-base font-black text-slate-950">
                    {subItem.quantity}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500">
                    Unit price
                  </p>
                  <p className="mt-0.5 text-base font-black text-slate-950">
                    <CurrencyText value={subItem.unit_price || 0} />
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500">
                    Attachments
                  </p>
                  <p className="mt-0.5 text-base font-black text-slate-950">
                    {subItem.attachment_count || 0}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Specification
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {subItem.specification || "No shared specification entered."}
                </p>
              </div>

              {subItem.note ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Category Manager note
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {subItem.note}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-black text-slate-950">
                Allocated departments
              </h4>
              <div className="mt-3 space-y-2">
                {(subItem.allocations || []).length ? (
                  subItem.allocations.map((allocation) => {
                    const department = departmentsByItemId.get(
                      Number(allocation.department_category_budget_item_id),
                    );
                      console.log("Allocation department:", {
        departmentCategoryBudgetItemId:
          allocation.department_category_budget_item_id,
        department,
        allocation,
      });
                    return (
                      <div
                        key={
                          allocation.id ||
                          allocation.department_category_budget_item_id
                        }
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {department?.department_name || "Department"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Approved {department?.approved_quantity ?? "—"} ·
                            Requested {department?.requested_quantity ?? "—"}
                          </p>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-900">
                          {allocation.allocated_quantity}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No departments are allocated to this model.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-slate-950">
                  Shared attachments
                </h4>
                <Paperclip className="h-4 w-4 text-slate-400" />
              </div>

              {attachmentsQuery.isLoading ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  Loading attachments...
                </p>
              ) : attachmentsQuery.isError ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-4 text-sm font-semibold text-rose-700">
                  Could not load attachments.
                </p>
              ) : (attachmentsQuery.data || []).length ? (
                <div className="mt-3 space-y-2">
                  {attachmentsQuery.data.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {attachment.original_file_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {attachment.document_type || "Document"} ·{" "}
                            {formatFileSize(attachment.file_size_bytes)} ·{" "}
                            {attachment.uploaded_by_name || "Unknown"} ·{" "}
                            {formatDateTime(attachment.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(attachment)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No attachments were added for this model.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </AnimatedDrawer>
  );
}

export default function CfoPackageItemsView({
  items,
  selectedItemId,
  itemDetail,
  loadingDetail,
  canDecide,
  onSelectItem,
  onAccept,
  onNeedsModification,
}) {
  const selectedItem = itemDetail?.package_item;
  const [isItemListOpen, setIsItemListOpen] = useState(true);
  const [selectedSubItem, setSelectedSubItem] = useState(null);

  return (
    <div
      className={[
        "grid min-h-[560px] gap-4 transition-all duration-300 ease-in-out",
        isItemListOpen
          ? "lg:grid-cols-[360px_minmax(0,1fr)]"
          : "lg:grid-cols-[0px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <div
        className={[
          "overflow-hidden rounded-2xl border border-slate-200 bg-white",
          isItemListOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!isItemListOpen}
      >
        <div className="border-b border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Package items</h3>
          <p className="mt-1 text-xs text-slate-500">
            Review shared models, totals, department demand, and CFO decision
            state.
          </p>
        </div>
        <div className="max-h-[620px] overflow-y-auto p-2">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className={`mb-2 w-full rounded-xl border p-4 text-left ${
                Number(selectedItemId) === Number(item.id)
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">
                    {item.catalog_item_name}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {item.catalog_item_code}
                  </div>
                </div>
                <CfoReviewStatusBadge status={item.cfo_review_status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Requested</span>
                  <div className="font-bold">{item.requested_quantity}</div>
                </div>
                <div>
                  <span className="text-slate-500">Approved</span>
                  <div className="font-bold">{item.approved_quantity}</div>
                </div>
                <div>
                  <span className="text-slate-500">Value</span>
                  <div className="font-bold">
                    <CurrencyText compact value={item.estimated_total} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <CollapsiblePanelToggle
            isOpen={isItemListOpen}
            onToggle={() => setIsItemListOpen((prev) => !prev)}
            openLabel="Show Package Items"
            closeLabel="Hide Package Items"
          />
        </div>
        {!selectedItemId ? (
          <div className="p-8 text-sm text-slate-500">
            Select a package item to review.
          </div>
        ) : loadingDetail ? (
          <div className="p-8 text-sm text-slate-500">
            Loading item detail...
          </div>
        ) : (
          <div>
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    {selectedItem?.catalog_item_name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Requested {selectedItem?.requested_quantity} · Approved{" "}
                    {selectedItem?.approved_quantity} · Allocated{" "}
                    {selectedItem?.allocated_quantity}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    Item total:{" "}
                    <CurrencyText value={selectedItem?.estimated_total || 0} />
                  </p>
                </div>
                <CfoReviewStatusBadge
                  status={selectedItem?.cfo_review_status}
                />
              </div>

              {canDecide && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onAccept(selectedItem)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={16} />
                    Accept item
                  </button>
                  <button
                    type="button"
                    onClick={() => onNeedsModification(selectedItem)}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100"
                  >
                    <MessageSquareWarning size={16} />
                    Needs modification
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4 p-5 xl:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Shared models and pricing
                </h3>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Model</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(itemDetail?.sub_items || []).map((subItem) => (
                        <tr
                          key={subItem.id}
                          className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/60"
                          onClick={() => setSelectedSubItem(subItem)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedSubItem(subItem);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">
                              {subItem.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {subItem.unit_of_measure_name || "Unit"} ·{" "}
                              {subItem.attachment_count || 0} attachments
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold">
                            {subItem.quantity}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <CurrencyText compact value={subItem.unit_price} />
                          </td>
                          <td className="px-3 py-3 text-right font-bold">
                            <CurrencyText compact value={subItem.line_total} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Department demand breakdown
                </h3>
                <div className="mt-3 space-y-2">
                  {(itemDetail?.departments || []).map((department) => (
                    <div
                      key={department.department_item_id}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">
                            {department.department_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Requested {department.requested_quantity} · Approved{" "}
                            {department.approved_quantity}
                          </div>
                        </div>
                        <CfoReviewStatusBadge
                          status={department.reconciliation_status}
                        />
                      </div>
                      <div className="mt-3 text-xs text-slate-600">
                        {(department.allocations || []).length
                          ? department.allocations
                              .map(
                                (allocation) =>
                                  `${allocation.package_sub_item_name}: ${allocation.allocated_quantity}`,
                              )
                              .join(" · ")
                          : "No model split configured."}
                      </div>
                      {department.review_note && (
                        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                          Category Manager note: {department.review_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      <CfoSubItemDrawer
        open={Boolean(selectedSubItem)}
        subItem={selectedSubItem}
        departments={itemDetail?.departments || []}
        onClose={() => setSelectedSubItem(null)}
      />
    </div>
  );
}
