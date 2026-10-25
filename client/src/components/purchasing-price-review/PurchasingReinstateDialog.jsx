import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";

/** A new reason is mandatory: the old rejection reason must never stand in for a reversal explanation. */
export default function PurchasingReinstateDialog({ item, busy, onClose, onConfirm, afterCfo = false }) {
  const [reason, setReason] = useState("");
  useEffect(() => { setReason(""); }, [item?.id]);
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="purchasing-reinstate-title" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex gap-3"><span className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><RotateCcw size={21}/></span>
            <div><h2 id="purchasing-reinstate-title" className="text-lg font-bold text-slate-900">Reinstate rejected model</h2>
              <p className="text-sm text-slate-500">{item.generic_item_name} · {item.name}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {afterCfo ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This package was already sent to CFO. Purchasing can reopen it only before CFO has made any decisions. The corrected package must be submitted to CFO again.
          </p> : null}
          {item.rejection_reason ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">Original rejection: {item.rejection_reason}</p> : null}
          <label htmlFor="purchasing-reinstate-reason" className="block text-sm font-semibold text-slate-700">Reason for reversing rejection <span className="text-rose-700">*</span></label>
          <textarea id="purchasing-reinstate-reason" rows={3} maxLength={1000} value={reason}
            onChange={(event) => setReason(event.target.value)} placeholder="Explain what changed and why Purchasing is reversing its earlier decision"
            className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          <p className="text-xs text-slate-500">The old rejection remains permanently visible in the decision history. Reinstatement returns General to Purchasing review, not automatic approval.</p>
        </div>
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Cancel</button>
          <button type="button" disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim())}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40">{busy ? "Saving..." : "Reinstate for Purchasing review"}</button>
        </div>
      </div>
    </div>
  );
}
