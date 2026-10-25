import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, XCircle } from 'lucide-react';
import { getBudgetExclusions } from '../../../api/budgetExclusions.api';
import BudgetExcludedItemsView from './exclusions/BudgetExcludedItemsView';
import { groupBudgetExclusions } from './exclusions/budgetExclusionGroups';

/** Reuse the canonical grouped exclusion list and full audit drawer in HOD,
 * Purchasing, CM and CFO. The server still enforces workspace scoping. */
export default function BudgetExclusionsPanel({ financialYearId, type = 'ALL', title = 'Excluded items', inline = false, categoryName }) {
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: ['budget-exclusions', Number(financialYearId)],
    queryFn: () => getBudgetExclusions(financialYearId),
    enabled: Boolean(financialYearId), staleTime: 10000,
  });
  const rows = useMemo(() => (query.data || []).filter(row =>
    (type === 'ALL' || row.exclusion_type === type) &&
    (!categoryName || String(row.category_name).toLowerCase() === String(categoryName).toLowerCase())
  ), [query.data, type, categoryName]);
  const count = useMemo(() => groupBudgetExclusions(rows).length, [rows]);
  const scopedQuery = useMemo(() => ({
    data: rows,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }), [rows, query.isLoading, query.isError, query.refetch]);
  if (!financialYearId) return null;
  const content = <BudgetExcludedItemsView
    financialYearId={financialYearId}
    audience="Read-only"
    query={scopedQuery}
  />;
  if (inline) return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">{content}</section>;
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}
      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50">
      <span className="flex min-w-0 items-center gap-2">
        <XCircle size={18} className="text-rose-600"/>
        <span className="font-bold text-slate-900">{title}</span>
        {!query.isLoading && !query.isError ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{count}</span> : null}
      </span>
      <ChevronDown size={17} className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}/>
    </button>
    {expanded ? <div className="border-t border-slate-200">{content}</div> : null}
  </section>;
}
