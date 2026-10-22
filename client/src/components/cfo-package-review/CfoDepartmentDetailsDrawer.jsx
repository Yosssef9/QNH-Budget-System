import { useMemo, useState } from 'react';
import { ArrowRight, Building2, Eye, Layers3, X } from 'lucide-react';
import AnimatedDrawer from '../budgets/shared/drawers/AnimatedDrawer';
import { useCategoryBackOverlay } from '../category-review/CategoryBackNavigation';
import CurrencyText from '../CurrencyText';
import SearchableMultiSelect from '../SearchableMultiSelect';
import CfoSearchField from './CfoSearchField';
import SortableHeader from '../SortableHeader';
import TablePagination from '../TablePagination';
import usePagination from '../../hooks/usePagination';
import useTableSort from '../../hooks/useTableSort';
import CfoSplitDetailsDrawer from './CfoSplitDetailsDrawer';
import { cfoNumber, cfoItemUnitExpense, filterCfoDepartments } from './cfoTableSelectors';

const qty = value => cfoNumber(value).toLocaleString();
const expenseOptions = [{value:'ALL',label:'All Expense Types'},{value:'CAPEX',label:'CAPEX'},{value:'OPEX',label:'OPEX'}];
const currencyFor = item => (item.allocations || []).reduce((sum, allocation) =>
  sum + cfoNumber(allocation.allocated_quantity) * cfoNumber(allocation.unit_price), 0);

/** The department's *unfiltered* data is supplied, allowing independent filtering
 * inside the drawer without altering the main department table. */
export default function CfoDepartmentDetailsDrawer({department, open, onClose, onViewItem, categoryOptions = [], initialFilters = {}}) {
  const [search, setSearch] = useState(initialFilters.search || '');
  const [category, setCategory] = useState(initialFilters.category || 'ALL');
  const [expense, setExpense] = useState(initialFilters.expense || 'ALL');
  const [splitItem, setSplitItem] = useState(null);
  // Back from the model-allocation split closes only that child drawer.
  useCategoryBackOverlay(Boolean(splitItem), () => setSplitItem(null));

  const visibleDepartment = useMemo(() => department
    ? filterCfoDepartments([department], {category, expense, search})[0] || null
    : null, [department, category, expense, search]);
  const items = useMemo(() => (visibleDepartment?.items || []).map(item => ({
    ...item, allocated_value_sort:currencyFor(item), model_count_sort:(item.allocations || []).length,
  })), [visibleDepartment]);
  const {sortedRows, sortColumn, sortDirection, handleSort} = useTableSort(items, 'catalog_item_name','asc');
  const pagination = usePagination(sortedRows.length, 25);
  const pageItems = sortedRows.slice((pagination.page-1)*pagination.pageSize, pagination.page*pagination.pageSize);
  const filterChanged = category !== 'ALL' || expense !== 'ALL' || Boolean(search);

  function changeFilter(setter, value) { setter(value); pagination.resetPage(); }
  function review(item) {
    setSplitItem(null);
    onClose();
    onViewItem({packageId:item.package_id, itemId:item.package_item_id});
  }

  return <>
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      {department && <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700"><Building2 size={15}/> CFO department demand</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{department.name}</h2>
              <p className="mt-1 text-xs text-slate-500">Requested package items, approved quantities and actual shared-model allocations</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close department details" title="Close department details" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100"><X size={19}/></button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {[{label:'ITEMS',value:visibleDepartment?.itemCount || 0},{label:'REQUESTED',value:qty(visibleDepartment?.requested)},{label:'APPROVED',value:qty(visibleDepartment?.approved)},
              {label:'ALLOCATED VALUE',value:<CurrencyText compact value={visibleDepartment?.value || 0}/> }].map(summary=><div key={summary.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2"><p className="text-[11px] font-bold tracking-wider text-slate-500">{summary.label}</p><p className="mt-1 text-lg font-black text-slate-900">{summary.value}</p></div>)}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4">
              <CfoSearchField className="min-w-[230px] flex-[2_1_300px]" label="Search requested items" value={search} onChange={e=>changeFilter(setSearch,e.target.value)} placeholder="Search requested item or department"/>
              <div className="min-w-[190px] flex-[1_1_190px]" aria-label="Department detail category filter"><SearchableMultiSelect name="cfoDepartmentDrawerCategory" multiple={false} disableClear value={category} options={categoryOptions} onChange={e=>changeFilter(setCategory,e.target.value)} searchPlaceholder="Search categories"/></div>
              <div className="min-w-[190px] flex-[1_1_190px]" aria-label="Department detail expense type filter"><SearchableMultiSelect name="cfoDepartmentDrawerExpense" multiple={false} disableClear value={expense} options={expenseOptions} onChange={e=>changeFilter(setExpense,e.target.value)} searchPlaceholder="Search expense types"/></div>
              {filterChanged && <button type="button" onClick={()=>{setSearch('');setCategory('ALL');setExpense('ALL');pagination.resetPage();}} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><X size={14} className="mr-1 inline"/>Reset filters</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600"><tr>
                  <SortableHeader label="Category" column="category_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}/>
                  <SortableHeader label="Requested item" column="catalog_item_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="min-w-64"/>
                  <SortableHeader label="Requested" column="requested_quantity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
                  <SortableHeader label="Approved" column="approved_quantity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
                  <SortableHeader label="Model splits" column="model_count_sort" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
                  <SortableHeader label="Allocated value" column="allocated_value_sort" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
                  <th className="sticky right-0 z-20 min-w-44 border border-slate-200 bg-slate-50 px-3 py-3 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map(item=><tr key={`${item.package_id}-${item.department_item_id}`} className="group cursor-pointer hover:bg-blue-50/60 focus-visible:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500" tabIndex={0}
                    aria-label={`View ${item.catalog_item_name}`} onClick={()=>review(item)} onKeyDown={e=>{if(e.target===e.currentTarget && (e.key==='Enter'||e.key===' ')){e.preventDefault();review(item);}}}>
                    <td className="px-3 py-3 text-slate-600">{item.category_name}</td>
                    <td className="px-3 py-3"><p className="font-bold text-blue-800">{item.catalog_item_name}</p><p className="text-xs text-slate-500">{cfoItemUnitExpense(item)}</p></td>
                    <td className="px-3 py-3 text-right tabular-nums">{qty(item.requested_quantity)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{qty(item.approved_quantity)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.model_count_sort}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums"><CurrencyText compact value={item.allocated_value_sort}/></td>
                    <td className="sticky right-0 z-10 bg-white px-3 py-3 group-hover:bg-blue-50"><div className="flex justify-end gap-2" onClick={e=>e.stopPropagation()}>
                      <button type="button" onClick={()=>setSplitItem(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100" title="View the models allocated to this department"><Layers3 size={14}/>Models</button>
                      <button type="button" onClick={()=>review(item)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100" title="Open full item review"><Eye size={14}/>Details <ArrowRight size={12}/></button>
                    </div></td>
                  </tr>)}
                  {!pageItems.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No requested items match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <TablePagination page={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} startRow={pagination.startRow} endRow={pagination.endRow} totalRows={sortedRows.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} pageSizes={[10,25,50,100]}/>
          </section>
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 text-right"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button></footer>
      </div>}
    </AnimatedDrawer>
    <CfoSplitDetailsDrawer open={Boolean(splitItem)} onClose={()=>setSplitItem(null)} packageId={splitItem?.package_id} packageItemId={splitItem?.package_item_id} item={splitItem} focusDepartmentItemId={splitItem?.department_item_id}/>
  </>;
}
