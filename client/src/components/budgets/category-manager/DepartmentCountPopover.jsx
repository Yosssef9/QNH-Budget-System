import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import useEscapeKey from "../../../hooks/useEscapeKey";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export default function DepartmentCountPopover({ itemName, departments }) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({
    position: "fixed",
    zIndex: 999999999,
    visibility: "hidden",
  });

  const totals = useMemo(
    () =>
      departments.reduce(
        (summary, department) => {
          summary.requested += Number(department.requestedQuantity || 0);
          summary.approved += Number(department.approvedQuantity || 0);
          return summary;
        },
        { requested: 0, approved: 0 },
      ),
    [departments],
  );

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const closePopover = useCallback(() => {
    clearCloseTimer();
    setPinned(false);
    setOpen(false);
  }, [clearCloseTimer]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const width = Math.max(220, Math.min(390, window.innerWidth - 24));
    const measuredHeight = Math.min(
      popoverRef.current?.offsetHeight || 340,
      Math.max(220, window.innerHeight - 24),
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < measuredHeight + gap && spaceAbove > spaceBelow;
    const top = openUp
      ? Math.max(viewportPadding, rect.top - measuredHeight - gap)
      : Math.min(
          window.innerHeight - measuredHeight - viewportPadding,
          rect.bottom + gap,
        );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );

    setPopoverStyle({
      position: "fixed",
      top: Math.max(viewportPadding, top),
      left,
      width,
      zIndex: 999999999,
      visibility: "visible",
    });
  }, []);

  const showPreview = useCallback(() => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const schedulePreviewClose = useCallback(() => {
    clearCloseTimer();
    if (pinned) return;

    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 160);
  }, [clearCloseTimer, pinned]);

  const handleTriggerClick = useCallback(() => {
    clearCloseTimer();

    if (pinned) {
      closePopover();
      return;
    }

    updatePosition();
    setOpen(true);
    setPinned(true);
  }, [clearCloseTimer, closePopover, pinned, updatePosition]);

  useEscapeKey(closePopover, open);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (triggerRef.current?.contains(event.target)) return;
      if (popoverRef.current?.contains(event.target)) return;
      closePopover();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [closePopover, open]);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [clearCloseTimer],
  );

  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={schedulePreviewClose}
            className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-blue-100"
            role="dialog"
            aria-label={`Departments requesting ${itemName}`}
          >
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                    Requesting Departments
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">
                    {itemName}
                  </p>
                </div>

                {pinned && (
                  <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                    Pinned
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {departments.map((department) => (
                <div
                  key={department.departmentId}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {department.departmentName}
                    </p>
                    {department.departmentCode ? (
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {department.departmentCode}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Requested
                    </p>
                    <p className="text-sm font-black text-slate-800">
                      {formatQuantity(department.requestedQuantity)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Approved
                    </p>
                    <p className="text-sm font-black text-blue-700">
                      {formatQuantity(department.approvedQuantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-black text-slate-700">Total</span>
                <div className="flex gap-4">
                  <span className="font-black text-slate-900">
                    Req {formatQuantity(totals.requested)}
                  </span>
                  <span className="font-black text-blue-700">
                    App {formatQuantity(totals.approved)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-500">
                {pinned
                  ? "Pinned · click outside, press Esc, or click the department count again to close."
                  : "Click the department count to keep this open."}
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        className="inline-flex"
        onMouseEnter={showPreview}
        onMouseLeave={schedulePreviewClose}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          aria-expanded={open}
          aria-haspopup="dialog"
          title="Hover to preview departments. Click to keep the list open."
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
            pinned
              ? "border-blue-300 bg-blue-100 text-blue-800 shadow-sm"
              : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
          ].join(" ")}
        >
          {departments.length}{" "}
          {departments.length === 1 ? "Department" : "Departments"}
          <ChevronDown
            size={14}
            className={`transition-transform ${pinned ? "rotate-180" : ""}`}
          />
        </button>
      </span>

      {popover}
    </>
  );
}
