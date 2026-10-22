import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { getCfoTooltipPosition } from './cfoActionTooltipPosition';

const THEMES = {
  success: {
    surface: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: 'text-emerald-700',
    arrow: 'border-emerald-200 bg-emerald-50',
  },
  warning: {
    surface: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'text-amber-700',
    arrow: 'border-amber-200 bg-amber-50',
  },
  violet: {
    surface: 'border-violet-200 bg-violet-50 text-violet-950',
    icon: 'text-violet-700',
    arrow: 'border-violet-200 bg-violet-50',
  },
  info: {
    surface: 'border-blue-200 bg-blue-50 text-blue-950',
    icon: 'text-blue-700',
    arrow: 'border-blue-200 bg-blue-50',
  },
  danger: {
    surface: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'text-rose-700',
    arrow: 'border-rose-200 bg-rose-50',
  },
};

/**
 * Portal tooltip shared by CFO table actions. Unlike native `title` attributes,
 * it is styleable, reachable by keyboard, and not clipped by table overflow.
 * Children remain the original button, preserving the existing click handlers.
 */
export default function CfoActionTooltip({
  children,
  label,
  Icon,
  variant = 'info',
  disabled = false,
  disabledReason = '',
  description: information = '',
  wide = false,
}) {
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const theme = THEMES[variant] || THEMES.info;
  const description = disabled ? disabledReason : information;

  const clearDelay = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearDelay();
    setOpen(false);
    setPosition(null);
  }, [clearDelay]);

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current || !tooltipRef.current) return;
    const anchor = wrapperRef.current.getBoundingClientRect();
    const popup = tooltipRef.current.getBoundingClientRect();
    const next = getCfoTooltipPosition({
      anchor,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      width: popup.width,
      height: popup.height,
    });
    setPosition(previous => previous && Object.keys(next).every(key => previous[key] === next[key]) ? previous : next);
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, label, description, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => () => clearDelay(), [clearDelay]);

  function showDelayed() {
    clearDelay();
    timerRef.current = setTimeout(() => {
      setOpen(true);
      timerRef.current = null;
    }, 220);
  }

  function showNow() {
    clearDelay();
    setOpen(true);
  }

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex shrink-0 align-middle ${disabled ? 'rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500' : ''}`}
      onMouseEnter={showDelayed}
      onMouseLeave={hide}
      onFocusCapture={showNow}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hide();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') hide();
      }}
      {...(disabled ? {
        tabIndex: 0,
        role: 'group',
        'aria-label': `${label}. Unavailable: ${description || 'This action is not available.'}`,
        'aria-describedby': open ? tooltipId : undefined,
      } : {})}
    >
      {isValidElement(children)
        ? cloneElement(children, {'aria-describedby': open && !disabled ? tooltipId : undefined})
        : children}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'fixed',
            left: position?.centerX ?? -9999,
            top: position?.top ?? -9999,
            transform: 'translateX(-50%)',
            visibility: position ? 'visible' : 'hidden',
            zIndex: 999999,
          }}
          className={`pointer-events-none w-max ${wide ? "max-w-[min(28rem,calc(100vw-24px))]" : "max-w-[min(18rem,calc(100vw-24px))]"}`}
        >
          <motion.div
            initial={{opacity: 0, y: 5, scale: 0.98}}
            animate={{opacity: 1, y: 0, scale: 1}}
            transition={{duration: 0.16, ease: 'easeOut'}}
            className={`relative rounded-lg border px-3 py-2 shadow-[0_14px_36px_-14px_rgba(15,23,42,0.35)] ${theme.surface}`}
          >
            <span className="flex items-start gap-2">
              {Icon && <Icon size={15} className={`mt-0.5 shrink-0 ${theme.icon}`} aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block text-xs font-bold leading-4">{label}</span>
                {description && <span className={`mt-1 block whitespace-pre-wrap break-words text-[11px] font-medium leading-4 opacity-90 ${wide ? "max-w-96" : "max-w-60"}`}>{description}</span>}
              </span>
            </span>
            <span
            aria-hidden="true"
            className={`absolute h-2.5 w-2.5 rotate-45 border ${theme.arrow} ${position?.below ? '-top-[6px] border-b-0 border-r-0' : '-bottom-[6px] border-l-0 border-t-0'}`}
              style={{left: position ? position.arrowX - 5 : '50%'}}
            />
          </motion.div>
        </div>,
        document.body,
      )}
    </span>
  );
}
