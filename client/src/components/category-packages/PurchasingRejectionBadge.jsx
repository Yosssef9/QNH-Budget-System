import { useEffect, useRef, useState } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { MessageSquareText, ShieldX, X } from 'lucide-react';

function formattedDecisionDate(value) {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not recorded' :
    date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Uses the same portaled hover / click-to-pin tooltip UX as CFO feedback. */
export default function PurchasingRejectionBadge({ models = [], totalModels = null }) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const anchorRef = useRef(null);
  const open = hoverOpen || pinnedOpen;
  const close = () => { setHoverOpen(false); setPinnedOpen(false); };

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = event => {
      if (event.key === 'Escape') { setHoverOpen(false); setPinnedOpen(false); }
    };
    const handleOutside = event => {
      if (!pinnedOpen || anchorRef.current?.contains(event.target) ||
          event.target.closest?.('[data-purchasing-rejection-popover]')) return;
      setHoverOpen(false);
      setPinnedOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, [open, pinnedOpen]);

  if (!models.length) return null;

  return <Tooltip
    arrow placement="top" enterDelay={250}
    open={open}
    onOpen={() => setHoverOpen(true)}
    onClose={() => setHoverOpen(false)}
    title={<div data-purchasing-rejection-popover className="w-[min(460px,calc(100vw-48px))] min-w-0 p-1 sm:p-2">
      <div className="flex items-start justify-between gap-3 border-b border-rose-200 pb-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 rounded-lg bg-rose-100 p-2 text-rose-800"><MessageSquareText className="h-4 w-4"/></span>
          <div>
            <p className="text-sm font-black leading-5 text-rose-950">Purchasing rejection reason{models.length === 1 ? '' : 's'}</p>
            <p className="mt-1 text-xs font-medium text-rose-800">{models.length} rejected model{models.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <button type="button" onClick={event => { event.stopPropagation(); close(); }}
          aria-label="Close Purchasing rejection tooltip"
          className="rounded-lg p-1.5 text-rose-700 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[min(60vh,480px)] space-y-3 overflow-y-auto py-3 pr-1">
        {models.map(model => <div key={model.id} className="min-w-0 rounded-lg border border-rose-100 bg-white p-3">
          <p className="break-words text-sm font-black text-slate-900">{model.name}</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">{model.reason || 'No rejection reason recorded'}</p>
          <p className="mt-2 break-words text-xs text-slate-500">
            {model.actorName || 'Reviewer not recorded'}{model.actorCode ? ` · ${model.actorCode}` : ''}
            <span className="mx-1">·</span>{formattedDecisionDate(model.decidedAt)}
          </p>
        </div>)}
      </div>
    </div>}
    slotProps={{
      popper: {
        sx: { zIndex: 100001 },
        modifiers: [
          { name: 'preventOverflow', options: { boundary: 'viewport', padding: 12 } },
          { name: 'flip', options: { fallbackPlacements: ['bottom', 'left', 'right'] } },
        ],
      },
      tooltip: {
        sx: { bgcolor: '#fffafb', color: '#1e293b', border: '1px solid #fecdd3',
          borderRadius: '16px', boxShadow: '0 18px 45px rgba(136,19,55,.16)',
          maxWidth: 'none', p: 1.5 },
      },
      arrow: { sx: { color: '#fffafb' } },
    }}
  >
    <button ref={anchorRef} type="button"
      onClick={event => { event.stopPropagation(); setPinnedOpen(value => !value); }}
      onKeyDown={event => event.stopPropagation()}
      aria-expanded={open}
      aria-label={`Show rejection reasons for ${models.length} Purchasing-rejected model${models.length === 1 ? '' : 's'}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
    ><ShieldX className="h-3 w-3"/>{Number(totalModels) > 0 && models.length >= Number(totalModels)
        ? 'All models rejected'
        : `${models.length}${Number(totalModels) > 0 ? ` of ${totalModels}` : ''} model${models.length === 1 ? '' : 's'} rejected`}</button>
  </Tooltip>;
}
