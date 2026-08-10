import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import ConfirmModal from "../ConfirmModal";
import Input from "../Input";
import LoadingSpinner from "../LoadingSpinner";
import {
  useDeletePurchasingAttachment,
  useDownloadPurchasingAttachment,
  usePurchasingAttachments,
  useUploadPurchasingAttachment,
} from "../../hooks/purchasing-price-review/usePurchasingPriceReview";
import {
  downloadBlobAttachment,
  viewBlobAttachment,
} from "../../helpers/attachmentPreview.helper";

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentGroup({
  title,
  description,
  attachments,
  editable,
  onDownload,
  onView,
  onRemove,
  busy,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-violet-600" />
          <h3 className="font-black text-slate-950">{title}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">
            {attachments.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {attachments.length === 0 ? (
          <div className="p-6 text-center text-sm font-semibold text-slate-500">
            No attachments in this group.
          </div>
        ) : (
          attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900" title={attachment.original_file_name}>
                  {attachment.original_file_name}
                </p>
                {attachment.description ? (
                  <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2 text-xs font-medium leading-5 text-violet-900">
                    {attachment.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {formatFileSize(attachment.file_size_bytes)} | {attachment.uploaded_by_name || "Unknown user"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" title="View attachment" onClick={() => onView(attachment)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                  <Eye size={17} />
                </button>
                <button type="button" title="Download attachment" onClick={() => onDownload(attachment)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                  <Download size={17} />
                </button>
                {editable ? (
                  <button type="button" title="Remove attachment" disabled={busy} onClick={() => onRemove(attachment)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">
                    <Trash2 size={17} />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function PurchasingAttachmentsDrawer({ open, onClose, packageId, subItem, editable }) {
  const fileRef = useRef(null);
  const [description, setDescription] = useState("");
  const [removeCandidate, setRemoveCandidate] = useState(null);
  const query = usePurchasingAttachments(packageId, subItem?.id, open);
  const uploadMutation = useUploadPurchasingAttachment();
  const deleteMutation = useDeletePurchasingAttachment();
  const downloadMutation = useDownloadPurchasingAttachment();
  const attachments = query.data || [];
  const managerAttachments = attachments.filter((item) => item.attachment_source === "CATEGORY_MANAGER");
  const purchasingAttachments = attachments.filter((item) => item.attachment_source === "PURCHASING");

  async function getAttachmentResponse(attachment) {
    return downloadMutation.mutateAsync({
      packageId,
      packageSubItemId: subItem.id,
      attachmentId: attachment.id,
    });
  }

  async function handleDownload(attachment) {
    try {
      const response = await getAttachmentResponse(attachment);
      downloadBlobAttachment({ blob: response.data, fileName: attachment.original_file_name });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download attachment");
    }
  }

  async function handleView(attachment) {
    try {
      const response = await getAttachmentResponse(attachment);
      viewBlobAttachment({ blob: response.data, fileName: attachment.original_file_name });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to view attachment");
    }
  }

  async function handleFile(file) {
    if (!file) return;
    try {
      await uploadMutation.mutateAsync({
        packageId,
        packageSubItemId: subItem.id,
        file,
        description,
      });
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Purchasing attachment uploaded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload attachment");
    }
  }

  return (
    <>
      <AnimatedDrawer open={open} onClose={onClose} fullScreen>
        <div className="flex h-full flex-col bg-slate-50">
          <header className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <p className="text-xs font-black uppercase text-violet-600">Shared model evidence</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{subItem?.name || "Attachments"}</h2>
              <p className="mt-1 text-sm text-slate-500">Category Manager and Purchasing evidence are preserved as separate groups.</p>
            </div>
            <button type="button" title="Close attachments" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X size={20} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {editable ? (
              <div className="mb-5 grid gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
                <Input label="Purchasing attachment note" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional context for this evidence" />
                <div>
                  <input ref={fileRef} type="file" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending} className="inline-flex h-12 items-center gap-2 rounded-lg bg-violet-700 px-5 font-black text-white hover:bg-violet-800 disabled:opacity-50">
                    {uploadMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                    Upload file
                  </button>
                </div>
              </div>
            ) : null}

            {query.isLoading ? (
              <LoadingSpinner fill />
            ) : query.isError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
                {query.error?.response?.data?.message || "Failed to load attachments"}
              </div>
            ) : (
              <div className="space-y-5">
                <AttachmentGroup title="Category Manager Attachments" description="Model selection, specification, and category preparation evidence." attachments={managerAttachments} editable={false} onDownload={handleDownload} onView={handleView} busy={downloadMutation.isPending} />
                <AttachmentGroup title="Purchasing Attachments" description="Price quotations and Purchasing review evidence." attachments={purchasingAttachments} editable={editable} onDownload={handleDownload} onView={handleView} onRemove={setRemoveCandidate} busy={deleteMutation.isPending || downloadMutation.isPending} />
              </div>
            )}
          </div>
        </div>
      </AnimatedDrawer>

      <ConfirmModal
        open={Boolean(removeCandidate)}
        title="Remove Purchasing attachment?"
        message={`Remove ${removeCandidate?.original_file_name || "this attachment"}?`}
        confirmText="Remove"
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setRemoveCandidate(null)}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync({
              packageId,
              packageSubItemId: subItem.id,
              attachmentId: removeCandidate.id,
              payload: { row_version: removeCandidate.row_version },
            });
            setRemoveCandidate(null);
            toast.success("Purchasing attachment removed");
          } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to remove attachment");
          }
        }}
      />
    </>
  );
}
