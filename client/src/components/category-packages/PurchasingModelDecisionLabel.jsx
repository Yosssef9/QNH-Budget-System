/** Show only actual decisions; package status already communicates in-progress. */
export default function PurchasingModelDecisionLabel({ model }) {
  const status = model?.purchasing_decision;
  if (status !== 'ACCEPTED' && status !== 'REJECTED') return null;
  const rejected = status === 'REJECTED';
  const tooltip = rejected
    ? `Purchasing rejected ${model.name}. ${model.purchasing_rejection_reason || 'Reason not recorded'}${model.purchasing_decision_round ? ` (Round ${model.purchasing_decision_round})` : ''}`
    : `Purchasing accepted ${model.name}${model.purchasing_decision_round ? ` in Round ${model.purchasing_decision_round}` : ''}`;
  return <span title={tooltip} aria-label={tooltip} className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${rejected
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
    {rejected ? 'Rejected by Purchasing' : 'Accepted by Purchasing'}
  </span>;
}
