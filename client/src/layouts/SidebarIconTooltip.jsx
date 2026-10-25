import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const HOVER_DELAY_MS = 240;
const EDGE_GAP = 8;
const ANCHOR_GAP = 12;

/**
 * Accessible, portal-backed tooltips for the collapsed application sidebar.
 * The portal keeps the popup outside the sidebar's scroll/overflow container.
 * Children retain their original click handlers, focus behavior and styling.
 */
export default function SidebarIconTooltip({
  children,
  label,
  disabled = false,
  className = "block w-full",
}) {
  const anchorRef = useRef(null);
  const popupRef = useRef(null);
  const timerRef = useRef(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  const clearDelay = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearDelay();
    setOpen(false);
  }, [clearDelay]);

  const showOnHover = () => {
    if (disabled) return;
    clearDelay();
    timerRef.current = setTimeout(() => {
      setOpen(true);
      timerRef.current = null;
    }, HOVER_DELAY_MS);
  };

  const showOnFocus = () => {
    if (disabled) return;
    clearDelay();
    setOpen(true);
  };

  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !popupRef.current) return;

    const anchor = anchorRef.current.getBoundingClientRect();
    const popup = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const fitsRight = anchor.right + ANCHOR_GAP + popup.width + EDGE_GAP <= viewportWidth;
    const left = fitsRight
      ? anchor.right + ANCHOR_GAP
      : Math.max(EDGE_GAP, anchor.left - ANCHOR_GAP - popup.width);
    const top = Math.min(
      Math.max(EDGE_GAP, anchor.top + anchor.height / 2 - popup.height / 2),
      Math.max(EDGE_GAP, viewportHeight - popup.height - EDGE_GAP),
    );

    setPosition((previous) =>
      previous?.left === left && previous?.top === top && previous?.rightSide === fitsRight
        ? previous
        : { left, top, rightSide: fitsRight },
    );
  }, []);

  useLayoutEffect(() => {
    if (open && !disabled) updatePosition();
  }, [open, disabled, label, updatePosition]);

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  useEffect(() => {
    if (!open || disabled) return undefined;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, disabled, updatePosition]);

  useEffect(() => () => clearDelay(), [clearDelay]);

  return (
    <span
      ref={anchorRef}
      className={className}
      onMouseEnter={showOnHover}
      onMouseLeave={hide}
      onFocusCapture={showOnFocus}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hide();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      {isValidElement(children)
        ? cloneElement(children, {
            "aria-describedby": open && !disabled ? tooltipId : undefined,
          })
        : children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && !disabled && (
              <motion.div
                ref={popupRef}
                id={tooltipId}
                role="tooltip"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="pointer-events-none fixed z-[1100] max-w-[min(18rem,calc(100vw-16px))] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium leading-5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.22)]"
                style={{
                  left: position?.left ?? -9999,
                  top: position?.top ?? -9999,
                  visibility: position ? "visible" : "hidden",
                }}
              >
                {label}
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-slate-700 bg-slate-900 ${
                    position?.rightSide === false
                      ? "-right-[5px] border-r border-t"
                      : "-left-[5px] border-b border-l"
                  }`}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
