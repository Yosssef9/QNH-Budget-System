import { useEffect, useMemo, useState } from "react";
import { X, XCircle } from "lucide-react";

export default function PurchasingRejectModelsDialog({ open, item, rows = [], busy, onClose, onConfirm }) {
  const candidates = useMemo(() => rows.filter((row) =>
    row.generic_item_id === item?.generic_item_id && row.price_review_status !== "REJECTED" && row.price_review_id && row.cfo_review_status !== "CFO_ACCEPTED"
  ), [rows, item]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open && item) {
      setSelectedIds([item.id]);
      setReason("");
    }
  }, [open, item]);
  if (!open || !item) return null;
  const selected = candidates.filter((row) => selectedIds.includes(row.id));
  const isMultiple = candidates.length > 1;
  return (
    <div role="presentation" className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="purchasing-rejection-title" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-rose-50 p-2.5 text-rose-700"><XCircle size={21} /></span>
            <div><h2 id="purchasing-rejection-title" className="text-lg font-bold text-slate-900">Reject {isMultiple ? "models" : "model"}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{item.generic_item_name}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {isMultiple ? <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">Select models to exclude</legend>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {candidates.map((model) => <label key={model.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 hover:bg-slate-50">
                <input type="checkbox" checked={selectedIds.includes(model.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, model.id] : current.filter((id) => id !== model.id))}
                  className="h-4 w-4 accent-rose-700" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{model.name}</span>
                  <span className="text-xs text-slate-500">{Number(model.quantity || 0).toLocaleString()} units</span></span>
              </label>)}
            </div></fieldset> : <p className="text-sm font-semibold text-slate-700">{item.name}</p>}
          <div><label htmlFor="purchasing-rejection-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">Reason <span className="text-rose-700">*</span></label>
            <textarea id="purchasing-rejection-reason" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why Purchasing is excluding the selected model(s)" className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" /></div>
          <p className="text-xs leading-relaxed text-slate-500">Rejected models stay visible in history and to CFO as read-only exclusions. They will not contribute to the submitted value.</p>
        </div>
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
          <button type="button" disabled={busy || selected.length === 0 || !reason.trim()}
            onClick={() => onConfirm(selected, reason.trim())}
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Saving..." : `Reject ${selected.length} ${selected.length === 1 ? "model" : "models"}`}</button>
        </div>
      </div>
    </div>
  );
}
