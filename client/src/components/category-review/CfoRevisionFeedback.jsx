import { useEffect, useRef, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import { AlertTriangle, ArrowRight, MessageSquareText, X } from "lucide-react";
import { buildCfoRevisionFeedback, normalizeCfoReason, cfoReturnSummary } from "./cfoRevisionFeedback.utils.js";

export function CfoRevisionBadge({ compact = false }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 font-bold text-amber-800 ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}>
      <AlertTriangle className="h-3 w-3 shrink-0" /> Needs revision
    </span>
  );
}

/** Readable, portaled CFO instruction popover for tables and full-screen drawers.
 * Hover = transient; click = stays open until closed or outside click.
 */
export function CfoFeedbackNote({ note, shared = false, label, trigger = "note" }) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const anchorRef = useRef(null);
  const full = String(note ?? "").trim();
  const open = hoverOpen || pinnedOpen;

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPinnedOpen(false);
        setHoverOpen(false);
      }
    };
    const handleOutside = (event) => {
      if (!pinnedOpen) return;
      if (anchorRef.current?.contains(event.target)) return;
      if (event.target.closest?.("[data-cfo-feedback-popover]")) return;
      setPinnedOpen(false);
      setHoverOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("pointerdown", handleOutside);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handleOutside);
    };
  }, [open, pinnedOpen]);

  if (!full) return trigger === "revision-badge"
    ? <CfoRevisionBadge compact />
    : <span className="text-xs font-medium text-amber-700">No CFO note recorded</span>;
  const close = () => { setPinnedOpen(false); setHoverOpen(false); };

  return (
    <Tooltip
      arrow placement="top" enterDelay={250}
      open={open}
      onOpen={() => setHoverOpen(true)}
      onClose={() => setHoverOpen(false)}
      title={
        <div data-cfo-feedback-popover className="w-[min(460px,calc(100vw-48px))] min-w-0 p-1 sm:p-2">
          <div className="flex items-start justify-between gap-3 border-b border-amber-200 pb-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-800">
                <MessageSquareText className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-black leading-5 text-amber-950">{shared ? "Shared CFO Instruction" : "CFO Modification Reason"}</p>
                <p className="mt-1 text-xs font-medium text-amber-800">Complete instruction from CFO</p>
              </div>
            </div>
            <button type="button" onClick={(event) => { event.stopPropagation(); close(); }}
              aria-label="Close CFO instruction" className="rounded-lg p-1.5 text-amber-700 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[min(65vh,580px)] overflow-y-auto py-3 pr-1">
            <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">{full}</p>
          </div>
        </div>
      }
      slotProps={{
        popper: { sx: { zIndex: 100001 } },
        tooltip: {
          sx: {
            bgcolor: "#fffdf5", color: "#1e293b",
            border: "1px solid #f6c86b", borderRadius: "16px",
            boxShadow: "0 18px 45px rgba(120,53,15,.18)",
            maxWidth: "none", p: 1.5,
          },
        },
        arrow: { sx: { color: "#fffdf5" } },
      }}
    >
      <button ref={anchorRef} type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (pinnedOpen) close();
          else setPinnedOpen(true);
        }}
        aria-expanded={open}
        aria-label={trigger === "revision-badge" ? `Needs revision. CFO instruction: ${full}` : `CFO instruction: ${full}`}
        className={trigger === "revision-badge"
          ? "inline-flex shrink-0 whitespace-nowrap rounded-full transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          : "inline-flex max-w-[270px] items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-xs font-semibold text-amber-800 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"}
      >
        {trigger === "revision-badge" ? (
          <CfoRevisionBadge compact />
        ) : (
          <>
            <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            <span className="truncate">{label || (shared ? "Shared instruction" : full)}</span>
          </>
        )}
      </button>
    </Tooltip>
  );
}

export function CfoRevisionNotice({ categoryName, items = [], returnReason, onReviewAffected, compact = false }) {
  const feedback = buildCfoRevisionFeedback(items);
  const main = feedback.mainReason || cfoReturnSummary(categoryName, feedback.affectedCount);
  return (
    <section className={`rounded-xl border border-amber-200 bg-amber-50/70 ${compact ? "px-3 py-3" : "px-4 py-4"}`} aria-label="CFO revision required">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">CFO Revision Required</p>
            <p className="mt-0.5 text-xs font-semibold text-amber-800">{categoryName || "Category"} · {feedback.affectedCount} affected item{feedback.affectedCount === 1 ? "" : "s"}</p>
            <p className="mt-2 line-clamp-2 break-words text-sm text-slate-700"><span className="font-bold">CFO instruction:</span> {main}{feedback.otherReasonCount ? ` · ${feedback.otherReasonCount} more distinct instruction${feedback.otherReasonCount === 1 ? "" : "s"}` : ""}</p>
          </div>
        </div>
        {onReviewAffected ? <button type="button" onClick={onReviewAffected} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500">Review affected items <ArrowRight className="h-3.5 w-3.5" /></button> : null}
      </div>
      {returnReason ? (
        <div className="mt-2 border-t border-amber-200/70 pt-2">
          <CfoFeedbackNote note={returnReason} label="View original package return note" />
        </div>
      ) : null}
    </section>
  );
}
