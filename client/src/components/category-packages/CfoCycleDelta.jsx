import Tooltip from '@mui/material/Tooltip';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

const money = value => value == null ? '—' : `SAR ${Number(value).toLocaleString(undefined, {maximumFractionDigits:2})}`;
const number = value => value == null ? '—' : Number(value).toLocaleString(undefined,{maximumFractionDigits:2});
const signed = value => value == null ? 'New' : `${value > 0 ? '+' : ''}${number(value)}%`;

export default function CfoCycleDelta({ comparison, mode = 'total', compact = false }) {
  if (!comparison) return null;
  const single = comparison.models?.length === 1 ? comparison.models[0] : null;
  const before = mode === 'price' ? single?.previous_price : comparison.previous_total;
  const after = mode === 'price' ? single?.current_price : comparison.current_total;
  const pct = mode === 'price' ? single?.price_percent : comparison.change_percent;
  if (mode === 'price' && !single) return null; // Never average unrelated models.
  const delta = before == null ? 0 : (Number(after) - Number(before));
  const changed = before == null || Math.abs(delta) > .00001;
  const tone = changed ? (delta > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200') : 'text-slate-600 bg-slate-50 border-slate-200';
  const icon = !changed ? <Minus size={12}/> : delta > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>;
  const detail = <div className="max-w-sm space-y-2 p-1 text-left text-xs">
    <div className="font-bold">Compared with the previous CFO return</div>
    <div>Previous total: {money(comparison.previous_total)}</div>
    <div>Current total: {money(comparison.current_total)}</div>
    <div>Approved quantity: {number(comparison.previous_quantity)} → {number(comparison.current_quantity)} ({signed(comparison.quantity_percent)})</div>
    {comparison.models?.map(model => <div key={model.id} className="border-t border-slate-300 pt-1">
      <div className="font-bold">{model.name}{model.removed ? ' (removed)' : ''}</div>
      <div>Quantity: {number(model.previous_quantity)} → {number(model.current_quantity)}</div>
      <div>Price: {money(model.previous_price)} → {money(model.current_price)} ({signed(model.price_percent)})</div>
      {model.decision === 'REJECTED' ? <div>Purchasing rejected — not eligible</div> : null}
    </div>)}
  </div>;
  return <Tooltip title={detail} arrow enterDelay={250} placement="top">
    <span className={`inline-flex max-w-full flex-col items-start gap-0.5 ${compact ? 'text-[11px]' : 'text-xs'}`} tabIndex={0} aria-label={`Previous ${money(before)}. Current ${money(after)}. Change ${signed(pct)}`}>
      {before != null && changed ? <span className="text-slate-400 line-through tabular-nums">{money(before)}</span> : null}
      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold ${tone}`}>{icon}{!changed ? 'Unchanged' : pct == null ? 'New' : signed(pct)}</span>
      {mode === 'total' && single ? <span className="whitespace-nowrap text-slate-500">Price {single.price_percent === 0 ? 'same' : signed(single.price_percent)} · Qty {single.quantity_percent === 0 ? 'same' : signed(single.quantity_percent)}</span> : null}
      {mode === 'total' && changed ? <span className="text-slate-500 tabular-nums">{delta > 0 ? '+' : '−'}{money(Math.abs(delta))}</span> : null}
    </span>
  </Tooltip>;
}
