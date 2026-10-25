import { useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, ClipboardX, ShieldX, X } from 'lucide-react';
import CurrencyText from '../../../CurrencyText';
import SearchableMultiSelect from '../../../SearchableMultiSelect';
import CfoSearchField from '../../../cfo-package-review/CfoSearchField';
import { getBudgetExclusions } from '../../../../api/budgetExclusions.api';
import BudgetExclusionDetailsDrawer, { formatExclusionDate, formatExclusionQuantity } from './BudgetExclusionDetailsDrawer';
import { filterBudgetExclusionGroups, groupBudgetExclusions } from './budgetExclusionGroups';

const exclusionTypeOptions = [
  { value: 'ALL', label: 'All exclusions' },
  { value: 'PURCHASING_REJECTED', label: 'Purchasing rejected' },
  { value: 'CM_ZERO', label: 'CM approved 0' },
];

const typeInfo = {
  PURCHASING_REJECTED: { label: 'Model rejected by Purchasing', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  CM_ZERO: { label: 'CM approved 0', className: 'border-slate-200 bg-slate-100 text-slate-700' },
};

export default function BudgetExcludedItemsView({ ref, financialYearId, audience = 'CFO', query: providedQuery }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [selectedKey, setSelectedKey] = useState(null);
  const closeDetails = useCallback(() => setSelectedKey(null), []);
  const internalQuery = useQuery({
    queryKey: ['budget-exclusions', Number(financialYearId)],
    queryFn: () => getBudgetExclusions(financialYearId),
    enabled: Boolean(financialYearId) && !providedQuery,
    staleTime: 10000,
  });
  const query = providedQuery || internalQuery;
  const groups = useMemo(() => groupBudgetExclusions(query.data || []), [query.data]);
  const filtered = useMemo(() => filterBudgetExclusionGroups(groups, { search, type }), [groups, search, type]);
  const selectedGroup = groups.find(group => group.key === selectedKey) || null;
  useImperativeHandle(ref, () => ({ getExportRows: () => filtered, getExportFilters: () => ({ search, type }) }), [filtered, search, type]);

  if (!financialYearId) return <p className="p-6 text-sm text-slate-500">Select a financial year to view excluded items.</p>;
  return <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <ClipboardX size={18} className="text-rose-600"/>
        <h2 className="text-sm font-black text-slate-900">Excluded items and models</h2>
        {!query.isLoading && !query.isError ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{groups.length}</span> : null}
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <CfoSearchField
          className="min-w-[170px] flex-[1_1_230px] sm:max-w-xs"
          label="Search excluded items"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search item, model or department"
        />
        <div className="min-w-[195px] flex-[0_1_220px]" aria-label="Exclusion decision type">
          <SearchableMultiSelect
            name="exclusionType"
            multiple={false}
            disableClear
            value={type}
            options={exclusionTypeOptions}
            onChange={event => setType(event.target.value)}
            searchPlaceholder="Search exclusion types"
          />
        </div>
      </div>
    </div>
    {query.isLoading ? <p className="p-8 text-center text-sm text-slate-500" role="status">Loading exclusions…</p> :
      query.isError ? <div className="p-8 text-center text-sm text-rose-700" role="alert">Could not load exclusions. <button type="button" onClick={() => query.refetch()} className="font-bold underline">Retry</button></div> :
      groups.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No excluded items for this financial year.</p> :
      filtered.length === 0 ? <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-slate-500"><p>No exclusions match your filters.</p><button type="button" onClick={() => { setSearch(''); setType('ALL'); }} className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"><X size={14}/>Clear filters</button></div> :
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase text-slate-500">
            <tr><th scope="col" className="px-5 py-3">Item / model</th><th scope="col" className="px-4 py-3">Affected departments</th><th scope="col" className="px-4 py-3">Decision</th><th scope="col" className="px-4 py-3 text-right">Excluded total</th><th scope="col" className="px-4 py-3">Last decision by</th><th scope="col" className="px-5 py-3 text-right">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(group => <tr key={group.key} className="transition-colors hover:bg-blue-50/40">
              <td className="px-5 py-4 align-middle"><p className="font-black text-slate-900">{group.itemName}</p>{group.modelName ? <p className="mt-1 text-xs text-slate-600">{group.modelName}</p> : null}<p className="mt-0.5 text-xs text-slate-400">{group.categoryName}</p>{group.exclusionType === 'PURCHASING_REJECTED' && group.activeModelCount > 0 ?
              <p className="mt-1 text-xs font-semibold text-rose-700">{group.itemExclusionScope === 'ALL_MODELS' ? 'Entire item excluded' : `${group.rejectedModelCount} of ${group.activeModelCount} models rejected`}</p> : null}</td>
              <td className="px-4 py-4 align-middle"><span className="inline-flex items-center gap-2 font-bold text-slate-800"><Building2 size={15} className="text-blue-600"/>{group.departments.length} {group.departments.length === 1 ? 'department' : 'departments'}</span><p className="mt-1 max-w-[240px] truncate text-xs text-slate-500" title={group.departments.map(department => department.name).join(', ')}>{group.departments.map(department => department.name).join(', ')}</p></td>
              <td className="px-4 py-4 align-middle"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${typeInfo[group.exclusionType].className}`}>{typeInfo[group.exclusionType].label}</span></td>
              <td className="px-4 py-4 text-right align-middle"><p className="font-black tabular-nums text-slate-900">{group.exclusionType === 'CM_ZERO' ? `0 approved / ${formatExclusionQuantity(group.excludedQuantity)} requested` : `${formatExclusionQuantity(group.excludedQuantity)} units`}</p><p className="mt-1 text-xs text-slate-500">{group.exclusionType === 'CM_ZERO' ? 'Not priced' : <CurrencyText value={group.excludedAmount}/>}</p></td>
              <td className="px-4 py-4 align-middle"><p className="text-xs font-bold text-slate-800">{group.decisions.length > 1 ? `${group.decisions.length} decisions` : group.latestDecision?.actorName || 'Reviewer not recorded'}{group.decisions.length === 1 && group.latestDecision?.actorCode ? ` · ${group.latestDecision.actorCode}` : ''}</p><p className="mt-1 text-xs text-slate-500">{formatExclusionDate(group.latestDecision?.decidedAt)}</p></td>
              <td className="px-5 py-4 text-right align-middle"><button type="button" onClick={() => setSelectedKey(group.key)} aria-label={`View exclusion details for ${group.itemName}${group.modelName ? `, ${group.modelName}` : ''}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">View details <ArrowRight size={14}/></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><ShieldX size={14}/>Read-only {audience} view. Department allocations and individual decision histories are available inside each full-screen detail drawer.</div>
    <BudgetExclusionDetailsDrawer group={selectedGroup} onClose={closeDetails} audience={audience}/>
  </motion.div>;
}

