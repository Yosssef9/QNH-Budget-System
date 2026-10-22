import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye, FileText, History, MessageSquareWarning, Paperclip, X } from "lucide-react";
import CurrencyText from "../CurrencyText";
import CfoReviewStatusBadge from "./CfoReviewStatusBadge";
import CfoPackageItemComparisonDrawer from "./CfoPackageItemComparisonDrawer";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import { useCategoryBackOverlay } from "../category-review/CategoryBackNavigation";
import PackageSubItemPriceIntelligenceDrawer from "../budgets/price-intelligence/PackageSubItemPriceIntelligenceDrawer";
import { downloadCfoPackageSubItemAttachment, getCfoPackageSubItemAttachments } from "../../api/cfoPackageReview.api";
import { downloadBlobAttachment, openAttachmentPreviewWindow, viewBlobAttachmentInWindow } from "../../helpers/attachmentPreview.helper";

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

  async function loadAttachment(attachment) {
    const result = await downloadCfoPackageSubItemAttachment({
      packageSubItemId: subItem.id,
      attachmentId: attachment.id,
    });
    return result;
  }

  async function handleDownload(attachment) {
    try {
      downloadBlobAttachment(await loadAttachment(attachment));
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to download attachment",
      );
    }
  }

  async function handleView(attachment) {
    const previewWindow = openAttachmentPreviewWindow(
      attachment.original_file_name,
    );

    try {
      viewBlobAttachmentInWindow({
        ...(await loadAttachment(attachment)),
        targetWindow: previewWindow,
      });
    } catch (error) {
      previewWindow?.close();
      toast.error(
        error?.response?.data?.message || "Failed to open attachment",
      );
    }
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
                Receiving departments
              </h4>
              <div className="mt-3 space-y-2">
                {(subItem.allocations || []).length ? (
                  subItem.allocations.map((allocation) => {
                    const department = departmentsByItemId.get(
                      Number(allocation.department_category_budget_item_id),
                    );
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
                    No receiving departments for this model.
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
                          {attachment.description ? (
                            <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2 text-xs font-medium leading-5 text-violet-900">
                              {attachment.description}
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-xs text-slate-500">
                            {attachment.document_type || "Document"} ·{" "}
                            {formatFileSize(attachment.file_size_bytes)} ·{" "}
                            {attachment.uploaded_by_name || "Unknown"} ·{" "}
                            {formatDateTime(attachment.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(attachment)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(attachment)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      </div>
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


export default function CfoItemReviewDrawer({ selectedRow, visibleRows = [], itemDetail, loadingDetail, detailError, canDecide, accepting = false, onSelectItem, onCloseItem, onAccept, onNeedsModification, onViewDistribution, packageReturnNote, onOpenDepartment }) {
  const [detailTab, setDetailTab] = useState("MODELS");
  const [selectedSubItem, setSelectedSubItem] = useState(null);
  const [priceContext, setPriceContext] = useState(null);
  const [comparisonItem, setComparisonItem] = useState(null);
  // Register nested layers separately. Back from Model, Intelligence or Changes
  // returns to Item Details instead of leaving the CFO page.
  useCategoryBackOverlay(Boolean(selectedSubItem), () => setSelectedSubItem(null));
  useCategoryBackOverlay(Boolean(priceContext?.subItem), () => setPriceContext(null));
  useCategoryBackOverlay(Boolean(comparisonItem), () => setComparisonItem(null));
  const activeItem = selectedRow;
  const validDetail = activeItem && Number(itemDetail?.package_item?.id) === Number(activeItem.id) ? itemDetail : null;
  const subItems = validDetail?.sub_items || [];
  const departments = validDetail?.departments || [];
  const itemIndex = activeItem ? visibleRows.findIndex(item => Number(item.id) === Number(activeItem.id) && Number(item.package_id) === Number(activeItem.package_id)) : -1;
  const prevItem = itemIndex > 0 ? visibleRows[itemIndex - 1] : null;
  const nextItem = itemIndex >= 0 && itemIndex + 1 < visibleRows.length ? visibleRows[itemIndex + 1] : null;
  useEffect(() => {
    setDetailTab("MODELS");
    setSelectedSubItem(null);
    setPriceContext(null);
    setComparisonItem(null);
  }, [selectedRow?.id, selectedRow?.package_id]);
  return (
    <>
      {/* The detail workspace is opened only when the CFO chooses an item. */}
      <AnimatedDrawer open={Boolean(activeItem)} onClose={onCloseItem} fullScreen>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
          <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">CFO · Item review</p>
                <h2 className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">{activeItem?.catalog_item_name || "Package item"}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{activeItem?.category_name} · Requested {activeItem?.requested_quantity || 0} · Approved {activeItem?.approved_quantity || 0}</span>
                  {activeItem ? <CfoReviewStatusBadge status={activeItem.cfo_review_status} note={activeItem.cfo_review_note}/> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={!prevItem} onClick={() => prevItem && onSelectItem(prevItem)}
                  title="Previous item" aria-label="Previous item" className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={18}/></button>
                <button type="button" disabled={!nextItem} onClick={() => nextItem && onSelectItem(nextItem)}
                  title="Next item" aria-label="Next item" className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={18}/></button>
                <button type="button" onClick={onCloseItem} aria-label="Close item review" className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"><X size={20}/></button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Item review tabs">
              {[
                { id: "MODELS", label: "Models & prices" },
                { id: "DEPARTMENTS", label: "Department demand" },
                { id: "ATTACHMENTS", label: "Attachments" },
                { id: "HISTORY", label: "History & notes" },
              ].map((entry) => <button key={entry.id} type="button" role="tab" aria-selected={detailTab === entry.id}
                onClick={() => setDetailTab(entry.id)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${detailTab === entry.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>
                {entry.label}</button>)}
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            {detailError ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800">
                Could not load this item. Close the drawer and try again, or refresh the CFO workspace.
              </div>
            ) : loadingDetail || !validDetail ? (
              <p className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500" role="status">Loading item details…</p>
            ) : (
              <div className="w-full min-w-0 space-y-5">
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Item summary">
                  {[
                    ["Approved units", activeItem?.approved_quantity || 0],
                    ["Package models", subItems.length],
                    ["Departments", departments.length],
                    ["Purchasing value", <CurrencyText compact value={activeItem?.estimated_total || 0}/>],
                  ].map(([label,value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
                    <div className="mt-2 text-xl font-black tabular-nums text-slate-950">{value}</div>
                  </div>)}
                </section>

                {detailTab === "MODELS" ? (
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                      <div><h3 className="font-black text-slate-950">Shared models & price comparison</h3>
                        <p className="mt-1 text-xs text-slate-500">The Purchasing-approved amount is the effective CFO price. View changes for the complete review history.</p></div>
                      <button type="button" onClick={() => setComparisonItem(activeItem)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><History size={15}/> View changes</button>
                    </div>
                    <div className="overflow-x-auto"><table className="min-w-[960px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                        <th className="w-[38%] px-5 py-3">Model / specification</th><th className="px-3 py-3 text-right">Quantity</th>
                        <th className="px-3 py-3 text-right">CM proposal</th><th className="px-3 py-3 text-right">Purchasing price</th>
                        <th className="px-5 py-3 text-right">Model value</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">{subItems.map((model) => <tr key={model.id}>
                        <td className="px-5 py-4"><button type="button" onClick={() => setSelectedSubItem(model)} className="text-left font-black text-blue-700 hover:underline">{model.name}</button>
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500" title={model.specification || ""}>{model.specification || model.unit_of_measure_name || "Shared model"}</p></td>
                        <td className="px-3 py-4 text-right tabular-nums">{model.quantity}</td>
                        <td className="px-3 py-4 text-right tabular-nums">{model.category_manager_unit_price == null ? "—" : <CurrencyText compact value={model.category_manager_unit_price}/>}</td>
                        <td className="px-3 py-4 text-right font-bold tabular-nums"><CurrencyText compact value={model.unit_price}/></td>
                        <td className="px-5 py-4 text-right font-black tabular-nums"><CurrencyText compact value={model.line_total}/></td>
                      </tr>)}
                      {!subItems.length ? <tr><td colSpan={5} className="px-5 py-8 text-sm text-slate-500">No models available.</td></tr> : null}
                      </tbody></table></div>
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
                      {subItems.length ? <button type="button" onClick={() => setPriceContext({subItem:subItems[0],subItems})}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Price intelligence</button> : null}
                      <button type="button" onClick={() => onViewDistribution?.(activeItem)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><CalendarDays size={14}/> View distribution</button>
                    </div>
                  </section>
                ) : detailTab === "DEPARTMENTS" ? (
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-black text-slate-950">Department demand breakdown</h3>
                      <p className="mt-1 text-xs text-slate-500">The source of this item's approved quantity and department allocations.</p></div>
                    <div className="overflow-x-auto"><table className="min-w-[1060px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                        <th className="w-[17%] px-5 py-3">Department</th><th className="px-3 py-3 text-right">Requested</th>
                        <th className="px-3 py-3 text-right">Approved</th><th className="w-[24%] px-5 py-3">Review note</th><th className="w-[31%] px-5 py-3">Models allocated</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">{departments.map((dep) => <tr key={dep.department_item_id}
                        role="button" tabIndex={0} aria-label={`Open ${dep.department_name} department requests`}
                        onClick={() => onOpenDepartment?.(dep.department_id, activeItem.category_code)}
                        onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpenDepartment?.(dep.department_id, activeItem.category_code); } }}
                        className="group cursor-pointer transition hover:bg-blue-50/60 focus-visible:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500">
                        <td className="px-5 py-3 font-black text-slate-900">{dep.department_name}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{dep.requested_quantity}</td>
                        <td className="px-3 py-3 text-right font-black tabular-nums">{dep.approved_quantity}</td>
                        <td className="whitespace-pre-wrap break-words px-5 py-3 align-top text-xs leading-5 text-slate-600">{dep.review_note || "—"}</td>
                        <td className="break-words px-5 py-3 align-top text-xs leading-5 text-slate-600">{(dep.allocations || []).length ? (dep.allocations || []).map(a => <div key={a.id ?? a.category_budget_package_sub_item_id} className="py-0.5">{subItems.find(m => Number(m.id) === Number(a.category_budget_package_sub_item_id))?.name || "Model"}: <span className="font-bold text-slate-900">{a.allocated_quantity}</span></div>) : "—"}</td>
                        <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-xs font-black text-blue-700 group-hover:underline">View items <ArrowRight size={13}/></span></td>
                      </tr>)}
                      {!departments.length ? <tr><td colSpan={6} className="px-5 py-8 text-sm text-slate-500">No reviewed department demand.</td></tr> : null}
                      </tbody></table></div>
                  </section>
                ) : detailTab === "ATTACHMENTS" ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-black text-slate-900">Supporting documents</h3>
                    <p className="mt-1 text-xs text-slate-500">Attachments belong to package models. Open a model to preview and download its supporting files.</p>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {subItems.map(model => <div key={model.id} className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-slate-900">{model.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{model.attachment_count || 0} attachment(s)</p>
                        </div>
                        <button type="button" onClick={() => setSelectedSubItem(model)} className="self-start rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Open model documents</button>
                      </div>)}
                    </div>
                    {!subItems.length && <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No models available.</p>}
                  </section>
                ) : (
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    {(packageReturnNote || activeItem?.cfo_review_note) ? <div className="min-w-0 space-y-4">
                      {packageReturnNote ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <p className="text-xs font-black uppercase text-amber-800">Previous package return reason</p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-amber-950">{packageReturnNote}</p>
                      </section> : null}
                      {activeItem?.cfo_review_note ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <p className="text-xs font-black uppercase text-amber-800">Last CFO note</p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-amber-950">{activeItem.cfo_review_note}</p>
                      </section> : null}
                    </div> : null}
                    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-5 ${!(packageReturnNote || activeItem?.cfo_review_note) ? "xl:col-span-2" : ""}`}>
                      <h3 className="text-sm font-black text-slate-950">Review history</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Inspect prior Category Manager and Purchasing values, CFO decisions, and changes from previous review rounds.</p>
                      <button type="button" onClick={() => setComparisonItem(activeItem)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><History size={16}/> Open comparison history</button>
                    </section>
                  </div>
                )}
              </div>
            )}
          </main>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
            <span className="text-xs font-medium text-slate-500">{itemIndex < 0 ? "" : `Item ${itemIndex + 1} of ${visibleRows.length} in filtered list`}</span>
            <div className="flex flex-wrap gap-2">
              {canDecide && activeItem ? <>
                <button type="button" disabled={accepting} onClick={() => onNeedsModification(activeItem)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"><MessageSquareWarning size={16}/> Needs modification</button>
                <button type="button" disabled={accepting || activeItem.cfo_review_status === 'CFO_ACCEPTED'} onClick={() => onAccept(activeItem)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={16}/> {accepting ? 'Accepting…' : 'Accept item'}</button>
              </> : null}
              <button type="button" onClick={onCloseItem} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
            </div>
          </footer>
        </div>
      </AnimatedDrawer>

      <CfoSubItemDrawer open={Boolean(selectedSubItem)} subItem={selectedSubItem}
        departments={validDetail?.departments || []} onClose={() => setSelectedSubItem(null)}/>
      <PackageSubItemPriceIntelligenceDrawer open={Boolean(priceContext?.subItem)}
        subItem={priceContext?.subItem} subItems={priceContext?.subItems || []}
        onSelectSubItem={(subItem) => setPriceContext((current) => ({subItem, subItems:current?.subItems || []}))}
        onClose={() => setPriceContext(null)}/>
      <CfoPackageItemComparisonDrawer open={Boolean(comparisonItem)} onClose={() => setComparisonItem(null)}
        packageId={activeItem?.package_id} packageItem={comparisonItem}/>
    </>
  );
}
