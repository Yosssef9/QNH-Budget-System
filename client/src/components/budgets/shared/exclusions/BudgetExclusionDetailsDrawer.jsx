import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Building2, CalendarClock, ClipboardList, History, Layers3, ShieldX, X } from 'lucide-react';
import AnimatedDrawer from '../drawers/AnimatedDrawer';
import CurrencyText from '../../../CurrencyText';

const isPurchasing = group => group?.exclusionType === 'PURCHASING_REJECTED';

export function formatExclusionQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function formatExclusionDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function DecisionBadge({ group }) {
  const purchasing = isPurchasing(group);
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${purchasing
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
    {purchasing ? 'Rejected by Purchasing' : 'CM approved 0'}
  </span>;
}

function Metric({ title, children, hint }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
    <div className="mt-2 text-xl font-black text-slate-950">{children}</div>
    {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
  </div>;
}

function DecisionReason({ group }) {
  const { decisions, hasMixedReasons } = group;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Exclusion reasons">
    <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><ClipboardList size={18} className="text-blue-600"/> Decision reason</h3>
    {!hasMixedReasons && decisions.length ? <>
      <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {decisions[0]?.reason?.trim() || 'No reason recorded'}
      </p>
      {decisions.length === 1 ? <div className="mt-3 text-xs leading-5 text-slate-500">
        <span className="font-bold text-slate-700">{decisions[0].actorName || 'Reviewer not recorded'}{decisions[0].actorCode ? ` · ${decisions[0].actorCode}` : ''}</span>
        <span className="mx-2">·</span>{formatExclusionDate(decisions[0].decidedAt)}
      </div> : <p className="mt-2 text-xs text-slate-500">{decisions.length} separate department decisions. Each reviewer and event is listed below.</p>}
    </> : <div className="mt-3 space-y-3">
      {decisions.map(decision => <div key={decision.id} className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold text-blue-700">{decision.departments.join(', ')}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{decision.reason?.trim() || 'No reason recorded'}</p>
        <p className="mt-2 text-xs text-slate-500">{decision.actorName || 'Reviewer not recorded'}{decision.actorCode ? ` · ${decision.actorCode}` : ''} · {formatExclusionDate(decision.decidedAt)}</p>
      </div>)}
      {decisions.length === 0 ? <p className="text-sm text-slate-500">No decision recorded.</p> : null}
    </div>}
  </section>;
}

/** Render every field actually persisted by workflow history; do not fabricate
 * model names or before-values for old events that never recorded them. */
function parseAuditValues(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try { const result = JSON.parse(value); return result && typeof result === 'object' ? result : {}; }
  catch { return {}; }
}

function displayAuditValue(value) {
  if (value === undefined) return 'Not recorded';
  if (value === null) return 'None';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function AuditFieldChanges({ event }) {
  const before = parseAuditValues(event.oldValues);
  const after = parseAuditValues(event.newValues);
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
  if (!fields.length) return <p className="mt-2 text-xs text-slate-500">No field-level values were stored for this historical event.</p>;
  return <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
    <table className="w-full min-w-[300px] text-left text-xs">
      <thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Before</th><th className="px-3 py-2">After</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{fields.map(field => <tr key={field}>
        <th scope="row" className="px-3 py-2 align-top font-semibold text-slate-700">{field.replaceAll('_', ' ')}</th>
        <td className="px-3 py-2 align-top"><pre className="max-w-[250px] whitespace-pre-wrap break-all font-sans">{displayAuditValue(before[field])}</pre></td>
        <td className="px-3 py-2 align-top"><pre className="max-w-[250px] whitespace-pre-wrap break-all font-sans">{displayAuditValue(after[field])}</pre></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function DecisionHistory({ group }) {
  const historyListRef = useRef(null);
  const [fiveEventHeight, setFiveEventHeight] = useState(null);
  // The API history may be empty for older records: show the current decision
  // explicitly, without inventing a workflow event or merging different actors.
  const events = group.history.length ? group.history.map(event => ({
    key: event.key,
    action: event.action?.replaceAll('_', ' ') || 'Workflow decision',
    actorName: event.actor_name,
    actorCode: event.actor_code,
    at: event.decided_at,
    note: event.note,
    departments: event.departmentNames,
    eventId: event.event_id,
    entityId: event.entity_id,
    modelName: parseAuditValues(event.new_values_json).modelName ||
      parseAuditValues(event.old_values_json).modelName || group.modelName,
    reviewRound: parseAuditValues(event.new_values_json).reviewRound ||
      parseAuditValues(event.old_values_json).reviewRound || null,
    oldStatus: event.old_status,
    newStatus: event.new_status,
    oldValues: event.old_values_json,
    newValues: event.new_values_json,
  })) : group.decisions.map(decision => ({
    key: `decision:${decision.id}`,
    action: isPurchasing(group) ? 'Rejected by Purchasing' : 'CM approved 0',
    actorName: decision.actorName,
    actorCode: decision.actorCode,
    at: decision.decidedAt,
    note: decision.reason,
    departments: decision.departments,
  }));

  // Measure the first five *actual* event cards rather than guessing a row
  // height: multiline notes, viewport widths and translations can vary.
  useLayoutEffect(() => {
    if (events.length <= 5 || !historyListRef.current) return undefined;
    const list = historyListRef.current;
    const sixth = list.children[5];
    const first = list.children[0];
    if (!sixth || !first) return undefined;
    const measure = () => {
      const height = Math.ceil(sixth.getBoundingClientRect().top - first.getBoundingClientRect().top);
      if (height > 0) setFiveEventHeight(previous => previous === height ? previous : height);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    Array.from(list.children).slice(0, 6).forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [group.key, events.length]);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Decision history">
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><History size={18} className="text-blue-600"/> Decision history</h3>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{events.length}</span>
    </div>
    <p className="mt-1 text-xs text-slate-500">Recorded workflow events for this exclusion.</p>
    {events.length ? <div
      className={events.length > 5 ? 'mt-5 overflow-y-auto overscroll-contain pr-2' : 'mt-5'}
      style={events.length > 5 ? { maxHeight: `min(${fiveEventHeight || 440}px, 65vh)` } : undefined}
      tabIndex={events.length > 5 ? 0 : undefined}
      role={events.length > 5 ? 'region' : undefined}
      aria-label={events.length > 5 ? 'Scroll decision history events' : undefined}
    ><ol ref={historyListRef} className="space-y-0">
      {events.map((event, index) => <li key={event.key} className="relative flex gap-3 pb-5 last:pb-0">
        {index !== events.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[6px] top-[15px] w-px bg-slate-200"/> : null}
        <span aria-hidden="true" className={`relative mt-1 h-[13px] w-[13px] shrink-0 rounded-full border-[3px] border-white ring-1 ${index === 0 ? 'bg-blue-600 ring-blue-200' : 'bg-slate-400 ring-slate-200'}`}/>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-bold capitalize text-slate-900">{event.action}{event.modelName ? ` · Model: ${event.modelName}` : ''}</p>
          {event.entityId ? <p className="mt-1 text-[11px] text-slate-500">Record #{event.entityId}{event.reviewRound ? ` · Purchasing round ${event.reviewRound}` : ''}</p> : null}
          {(event.oldStatus || event.newStatus) ? <p className="mt-1 text-xs font-semibold text-slate-700">Decision: {event.oldStatus || 'Not recorded'} → {event.newStatus || 'Not recorded'}</p> : null}
          <p className="mt-1 text-xs text-slate-500">{event.actorName || 'Reviewer not recorded'}{event.actorCode ? ` · ${event.actorCode}` : ''}</p>
          <p className="mt-0.5 text-xs text-slate-500">{formatExclusionDate(event.at)}</p>
          {group.decisions.length > 1 && event.departments?.length ? <p className="mt-1 break-words text-xs text-blue-700">{event.departments.join(', ')}</p> : null}
          {event.note ? <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{event.note}</p> : null}
          <AuditFieldChanges event={event}/>
        </div>
      </li>)}
    </ol></div> : <p className="mt-4 text-sm text-slate-500">No decision history recorded.</p>}
  </section>;
}

export default function BudgetExclusionDetailsDrawer({ group, onClose, audience = 'CFO' }) {
  const closeRef = useRef(null);
  const open = Boolean(group);
  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return <AnimatedDrawer open={open} onClose={onClose} fullScreen>
    {group ? <div role="dialog" aria-modal="true" aria-labelledby="budget-exclusion-drawer-title" className="flex h-full min-h-0 flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{audience} · Read-only exclusion details</p>
            <h2 id="budget-exclusion-drawer-title" className="mt-1 break-words text-2xl font-black text-slate-950">{group.itemName}</h2>
            <p className="mt-1 text-sm text-slate-500">{group.categoryName}</p>
            {isPurchasing(group) && group.activeModelCount > 0 ? <p className="mt-2 text-xs font-semibold text-rose-700">{group.itemExclusionScope === 'ALL_MODELS' ? 'All models rejected — item fully excluded' : `${group.rejectedModelCount} of ${group.activeModelCount} models rejected — item partially excluded`}</p> : null}
            {isPurchasing(group) ? <p className="mt-2 text-sm font-bold text-rose-700">Purchasing-rejected model: {group.modelName || `#${group.modelId}`}{group.reviewRound ? ` · Round ${group.reviewRound}` : ''}</p> : <p className="mt-2 text-sm text-slate-600">Department item requests approved at zero by Category Manager</p>}
            <div className="mt-3"><DecisionBadge group={group}/></div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close exclusion details" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><X size={20}/></button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric title="Affected departments" hint="Distinct departments"><span className="flex items-center gap-2"><Building2 size={19} className="text-blue-600"/>{group.departments.length}</span></Metric>
            <Metric title={isPurchasing(group) ? 'Excluded units' : 'Requested · CM approved 0'} hint={isPurchasing(group) ? 'Removed from active Purchasing value' : 'Requested quantity; approved quantity is zero'}>{formatExclusionQuantity(group.excludedQuantity)}</Metric>
            <Metric title="Financial impact" hint={isPurchasing(group) ? 'Excluded from active Purchasing total' : 'No Purchasing model price exists for CM-zero requests'}>{isPurchasing(group) ? <CurrencyText value={group.excludedAmount}/> : <span className="text-base text-slate-500">Not priced</span>}</Metric>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
            <div className="min-w-0 space-y-5">
              <DecisionReason group={group}/>
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Affected departments">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                  <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><Building2 size={18} className="text-blue-600"/> Affected departments</h3>
                  <span className="text-xs font-bold text-slate-500">{group.departments.length} departments</span>
                </div>
                <div className="overflow-x-auto">
                  {/* Five 48px department rows + 44px header + 44px total.
                      Keep both summary rows pinned within the scrollable table. */}
                  <div className={group.departments.length > 5 ? 'max-h-[328px] overflow-y-auto overscroll-contain' : ''}
                    tabIndex={group.departments.length > 5 ? 0 : undefined}
                    role={group.departments.length > 5 ? 'region' : undefined}
                    aria-label={group.departments.length > 5 ? 'Scroll affected departments' : undefined}>
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="sticky top-0 z-10 h-11 bg-slate-50 text-[11px] font-bold uppercase text-slate-500"><tr>
                      <th scope="col" className="px-5 py-3">Department</th>
                      <th scope="col" className="px-5 py-3 text-right">{isPurchasing(group) ? 'Excluded units' : 'Requested units'}</th>
                      <th scope="col" className="px-5 py-3 text-right">{isPurchasing(group) ? 'Excluded value' : 'Approved units'}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.departments.map(department => <tr key={department.key} className="h-12">
                        <td className="px-5 py-3 font-semibold text-slate-800">{department.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">{formatExclusionQuantity(department.excludedQuantity)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">{isPurchasing(group) ? <CurrencyText value={department.excludedAmount}/> : '0'}</td>
                      </tr>)}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 h-11 border-t border-slate-200 bg-slate-50 font-black text-slate-900"><tr>
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatExclusionQuantity(group.excludedQuantity)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{isPurchasing(group) ? <CurrencyText value={group.excludedAmount}/> : '0'}</td>
                    </tr></tfoot>
                  </table>
                  </div>
                </div>
              </section>
            </div>
            <div className="min-w-0 space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><CalendarClock size={18} className="text-blue-600"/> Latest recorded decision</h3>
                <p className="mt-3 text-sm font-bold text-slate-800">{group.latestDecision?.actorName || 'Reviewer not recorded'}{group.latestDecision?.actorCode ? ` · ${group.latestDecision.actorCode}` : ''}</p>
                <p className="mt-1 text-xs text-slate-500">{formatExclusionDate(group.latestDecision?.decidedAt)}</p>
                {group.decisions.length > 1 ? <p className="mt-2 text-xs text-slate-500">{group.decisions.length} distinct decisions are preserved for this grouped item.</p> : null}
              </section>
              <DecisionHistory group={group}/>
            </div>
          </div>
          <p className="pb-4 text-xs text-slate-500"><Layers3 size={13} className="mr-1 inline"/>This view is read-only. Purchasing and Category Manager decisions are not changed here.</p>
        </div>
      </main>
    </div> : null}
  </AnimatedDrawer>;
}
