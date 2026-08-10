import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CircleDollarSign, Download, Eye, FileText, Paperclip, X } from "lucide-react";

import {
  downloadCfoPackageSubItemAttachment,
  getCfoPackageItemDetail,
  getCfoPackageSubItemAttachments,
} from "../../api/cfoPackageReview.api";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CurrencyText from "../CurrencyText";
import PackageSubItemPriceIntelligenceDrawer from "../budgets/price-intelligence/PackageSubItemPriceIntelligenceDrawer";
import {
  downloadBlobAttachment,
  openAttachmentPreviewWindow,
  viewBlobAttachmentInWindow,
} from "../../helpers/attachmentPreview.helper";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

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

function AttachmentList({ subItem }) {
  const attachmentsQuery = useQuery({
    queryKey: ["cfo-package-review", "sub-item-attachments", subItem?.id],
    queryFn: () => getCfoPackageSubItemAttachments(subItem.id),
    enabled: Boolean(subItem?.id),
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

  if (attachmentsQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading attachments...</p>;
  }

  if (attachmentsQuery.isError) {
    return (
      <p className="text-sm font-semibold text-rose-700">
        Could not load attachments.
      </p>
    );
  }

  const attachments = attachmentsQuery.data || [];

  if (!attachments.length) {
    return <p className="text-sm text-slate-500">No attachments.</p>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
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
                {attachment.document_type || "Document"} -{" "}
                {formatFileSize(attachment.file_size_bytes)} -{" "}
                {attachment.uploaded_by_name || "Unknown"} -{" "}
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
  );
}

export default function CfoSplitDetailsDrawer({
  open,
  onClose,
  packageId,
  packageItemId,
  item,
  focusDepartmentItemId = null,
}) {
  const [priceContext, setPriceContext] = useState(null);
  const detailQuery = useQuery({
    queryKey: [
      "cfo-package-review",
      "split-detail",
      packageId,
      packageItemId,
    ],
    queryFn: () => getCfoPackageItemDetail({ packageId, packageItemId }),
    enabled: open && Boolean(packageId) && Boolean(packageItemId),
  });

  const detail = detailQuery.data;
  const packageItem = detail?.package_item || item;
  const subItems = detail?.sub_items || [];
  const departments = useMemo(
    () => detail?.departments || [],
    [detail?.departments],
  );
  const departmentsByItemId = useMemo(
    () =>
      new Map(
        departments.map((department) => [
          Number(department.department_item_id),
          department,
        ]),
      ),
    [departments],
  );

  const drawerTitle = packageItem?.catalog_item_name || "Package item split";

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              CFO split detail
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {drawerTitle}
            </h2>
            {focusDepartmentItemId ? (
              <p className="mt-1 text-sm text-slate-500">
                Focused on the selected department allocation.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close split detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {detailQuery.isLoading ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading split details...
            </section>
          ) : detailQuery.isError ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
              Could not load split details.
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase text-slate-500">
                      Requested
                    </p>
                    <p className="text-base font-black text-slate-950">
                      {packageItem?.requested_quantity ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase text-slate-500">
                      Approved
                    </p>
                    <p className="text-base font-black text-slate-950">
                      {packageItem?.approved_quantity ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase text-slate-500">
                      Allocated
                    </p>
                    <p className="text-base font-black text-slate-950">
                      {packageItem?.allocated_quantity ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase text-blue-600">
                      Estimated value
                    </p>
                    <p className="text-base font-black text-blue-900">
                      <CurrencyText
                        compact
                        value={packageItem?.estimated_total || 0}
                      />
                    </p>
                  </div>
                </div>
              </section>

              {(subItems || []).length ? (
                subItems.map((subItem) => {
                  const allocations = focusDepartmentItemId
                    ? (subItem.allocations || []).filter(
                        (allocation) =>
                          Number(allocation.department_category_budget_item_id) ===
                          Number(focusDepartmentItemId),
                      )
                    : subItem.allocations || [];
                  const visibleQuantity = allocations.length
                    ? allocations.reduce(
                        (sum, allocation) =>
                          sum + toNumber(allocation.allocated_quantity),
                        0,
                      )
                    : toNumber(subItem.quantity);
                  const lineTotal =
                    visibleQuantity * toNumber(subItem.unit_price);

                  return (
                    <section
                      key={subItem.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                            Shared model
                          </p>
                          <h3 className="mt-1 text-xl font-black text-slate-950">
                            {subItem.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {subItem.sub_item_code || "Catalog model"} -{" "}
                            {subItem.unit_of_measure_name || "Unit"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-blue-50 px-3 py-2 text-right">
                          <p className="text-[11px] font-bold uppercase text-blue-600">
                            Line total
                          </p>
                          <p className="text-base font-black text-blue-900">
                            <CurrencyText value={lineTotal} />
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase text-slate-500">
                            Quantity
                          </p>
                          <p className="text-base font-black text-slate-950">
                            {visibleQuantity}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase text-slate-500">
                            Unit price
                          </p>
                          <p className="text-base font-black text-slate-950">
                            <CurrencyText value={subItem.unit_price || 0} />
                          </p>
                          <button
                            type="button"
                            onClick={() => setPriceContext({ subItem, subItems })}
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 hover:bg-blue-100"
                          >
                            <CircleDollarSign className="h-3 w-3" />
                            Price context
                          </button>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase text-slate-500">
                            Package quantity
                          </p>
                          <p className="text-base font-black text-slate-950">
                            {subItem.quantity}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase text-slate-500">
                            Attachments
                          </p>
                          <p className="text-base font-black text-slate-950">
                            {subItem.attachment_count || 0}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Specification
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {subItem.specification ||
                            "No shared specification entered."}
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

                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Department allocations
                        </p>
                        {allocations.length ? (
                          <div className="space-y-2">
                            {allocations.map((allocation) => {
                              const department = departmentsByItemId.get(
                                Number(
                                  allocation.department_category_budget_item_id,
                                ),
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
                                      {department?.department_name ||
                                        "Department"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Approved{" "}
                                      {department?.approved_quantity ?? "-"} -
                                      Requested{" "}
                                      {department?.requested_quantity ?? "-"}
                                    </p>
                                  </div>
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-900">
                                    {allocation.allocated_quantity}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            No allocations are recorded for this model.
                          </p>
                        )}
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Shared attachments
                          </p>
                          <Paperclip className="h-4 w-4 text-slate-400" />
                        </div>
                        <AttachmentList subItem={subItem} />
                      </div>
                    </section>
                  );
                })
              ) : (
                <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No model split has been configured for this item.
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <PackageSubItemPriceIntelligenceDrawer
        open={Boolean(priceContext?.subItem)}
        subItem={priceContext?.subItem}
        subItems={priceContext?.subItems || []}
        onSelectSubItem={(subItem) =>
          setPriceContext((current) => ({
            subItem,
            subItems: current?.subItems || [],
          }))
        }
        onClose={() => setPriceContext(null)}
      />
    </AnimatedDrawer>
  );
}
