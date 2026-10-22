import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, CheckCheck, ChevronDown, Eye, History, ListChecks, MessageSquareWarning, RotateCcw } from 'lucide-react';
import CurrencyText from '../CurrencyText';
import SortableHeader from '../SortableHeader';
import TablePagination from '../TablePagination';
import usePagination from '../../hooks/usePagination';
import useTableSort from '../../hooks/useTableSort';
import CfoReviewStatusBadge from './CfoReviewStatusBadge';
import CfoDepartmentDetailsDrawer from './CfoDepartmentDetailsDrawer';
import CfoActionTooltip from './CfoActionTooltip';
import CfoSearchField from './CfoSearchField';
import { useCategoryBackOverlay } from '../category-review/CategoryBackNavigation';
import { cfoChange, cfoNumber, cfoItemUnitExpense, filterCfoDepartments } from './cfoTableSelectors';

const actionButton = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
const numberFormat = (value) => cfoNumber(value).toLocaleString();

/** Existing row action click handlers, wrapped in the shared accessible tooltip. */
function CfoActionButton({Icon, label, disabled=false, disabledReason='', onClick, tone, variant, ariaLabel}) {
  return <CfoActionTooltip Icon={Icon} label={label} variant={variant} disabled={disabled} disabledReason={disabledReason}>
    <button type="button" disabled={disabled} onClick={onClick} aria-label={ariaLabel || label}
      className={`${actionButton} ${tone}`}><Icon size={16}/></button>
  </CfoActionTooltip>;
}

export function CfoItemsTable({ rows, canDecideItem, isAcceptingItem = () => false, onDetails, onHistory, onAccept, onModification }) {
  const enriched = useMemo(() => rows.map(row => ({...row,
    cm_value_sort: cfoNumber(row.category_manager_estimated_total),
    purchasing_value_sort: cfoNumber(row.estimated_total),
    price_change_sort: cfoChange(row),
  })), [rows]);
  const {sortedRows,sortColumn,sortDirection,handleSort} = useTableSort(enriched,'catalog_item_name','asc');
  const pagination = usePagination(sortedRows.length, 25);
  const visible = sortedRows.slice((pagination.page-1)*pagination.pageSize,pagination.page*pagination.pageSize);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="CFO items table">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1510px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-600">
          <tr>
            <SortableHeader label="Category" column="category_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}/>
            <SortableHeader label="Generic item" column="catalog_item_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="min-w-60"/>
            <SortableHeader label="Requested" column="requested_quantity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
            <SortableHeader label="Approved" column="approved_quantity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
            <th className="border border-slate-200 px-3 py-3 text-center">Models</th>
            <SortableHeader label="CM value" column="cm_value_sort" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
            <SortableHeader label="Purchasing value" column="purchasing_value_sort" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
            <SortableHeader label="Difference" column="price_change_sort" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
            <SortableHeader label="CFO status" column="cfo_review_status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}/>
            <th className="sticky right-0 z-20 min-w-[220px] border border-slate-200 bg-slate-50 px-3 py-3 text-center shadow-[-9px_0_12px_-12px_rgba(15,23,42,.5)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map(item => {const diff=cfoChange(item),editable=canDecideItem(item),accepting=isAcceptingItem(item),alreadyAccepted=item.cfo_review_status==='CFO_ACCEPTED';
            return <tr key={`${item.package_id}-${item.id}`} tabIndex={0} aria-label={`Open details for ${item.catalog_item_name}`}
              onClick={() => onDetails(item)}
              onKeyDown={(event) => {if(event.target===event.currentTarget && (event.key==='Enter'||event.key===' ')){event.preventDefault();onDetails(item);}}}
              className="group cursor-pointer transition hover:bg-blue-50/60 focus-visible:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500">
              <td className="px-3 py-3 font-semibold text-slate-600">{item.category_name}</td>
              <td className="px-3 py-3">
                <button type="button" onClick={(event)=>{event.stopPropagation();onDetails(item)}} className="text-left font-bold text-blue-800 hover:underline">{item.catalog_item_name}</button>
                <div className="text-xs text-slate-500">{cfoItemUnitExpense(item)}</div>
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{numberFormat(item.requested_quantity)}</td>
              <td className="px-3 py-3 text-right font-bold tabular-nums">{numberFormat(item.approved_quantity)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{item.active_sub_item_count ?? '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums">{item.category_manager_estimated_total == null ? '—' : <CurrencyText compact value={item.category_manager_estimated_total}/>}</td>
              <td className="px-3 py-3 text-right font-bold tabular-nums"><CurrencyText compact value={item.estimated_total || 0}/></td>
              <td className={`px-3 py-3 text-right font-semibold tabular-nums ${diff>0?'text-rose-700':diff<0?'text-emerald-700':'text-slate-500'}`}>{item.category_manager_estimated_total == null ? '—' : <>{diff>0?'+':diff<0?'−':''}<CurrencyText compact value={Math.abs(diff)}/></>}</td>
              <td className="px-3 py-3"><CfoReviewStatusBadge status={item.cfo_review_status || 'PENDING_CFO_REVIEW'} note={item.cfo_review_note}/></td>
              <td className="sticky right-0 z-10 border-l border-slate-100 bg-white px-3 py-3 shadow-[-9px_0_12px_-12px_rgba(15,23,42,.45)] group-hover:bg-blue-50">
                <div className="flex items-center justify-end gap-1.5" onClick={event=>event.stopPropagation()}>
                  <CfoActionButton Icon={Check} disabled={!editable || accepting || alreadyAccepted} disabledReason={accepting ? 'Saving item acceptance…' : alreadyAccepted ? 'Item already accepted. Use Needs Modification to change the decision.' : 'This package is not currently editable for CFO decisions.'} onClick={()=>onAccept(item)} label={accepting ? 'Accepting Item…' : 'Accept Item'} variant="success" ariaLabel={`Accept ${item.catalog_item_name}`} tone="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"/>
                  <CfoActionButton Icon={MessageSquareWarning} disabled={!editable || accepting} disabledReason={accepting ? 'Wait for the current acceptance to finish.' : 'This package is not currently editable for CFO decisions.'} onClick={()=>onModification(item)} label="Needs Modification" variant="warning" ariaLabel={`Needs Modification ${item.catalog_item_name}`} tone="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"/>
                  <CfoActionButton Icon={History} onClick={()=>onHistory(item)} label="View Changes" variant="violet" ariaLabel={`View Changes for ${item.catalog_item_name}`} tone="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"/>
                  <CfoActionButton Icon={Eye} onClick={()=>onDetails(item)} label="View Details" variant="info" ariaLabel={`View Details for ${item.catalog_item_name}`} tone="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"/>
                </div>
              </td>
            </tr>;
          })}
          {!visible.length && <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-500">No items match the selected filters.</td></tr>}
        </tbody>
      </table>
    </div>
    <TablePagination page={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} startRow={pagination.startRow} endRow={pagination.endRow} totalRows={sortedRows.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} pageSizes={[10,25,50,100]}/>
  </section>;
}

/** Department table: sort/search/filter totals and open a *full-screen* drawer.
 * The main table contains no inline expanded detail rows. */
export function CfoDepartmentsTable({departments, category='ALL', expense='ALL', search='', onSearchChange, categoryOptions=[], onSelectItem, focusDepartmentId=null, onCloseFocusedDepartment}) {
  const [selectedDepartmentId,setSelectedDepartmentId] = useState(null);
  useCategoryBackOverlay(selectedDepartmentId !== null, () => closeDrawer());
  const filtered = useMemo(()=>filterCfoDepartments(departments, {category,expense,search}),[departments,category,expense,search]);
  const {sortedRows,sortColumn,sortDirection,handleSort} = useTableSort(filtered,'name','asc');
  const pagination=usePagination(sortedRows.length,20);
  const paged=sortedRows.slice((pagination.page-1)*pagination.pageSize,pagination.page*pagination.pageSize);
  const selectedDepartment=departments.find(dep=>String(dep.id)===String(selectedDepartmentId)) || null;
  useEffect(()=>{
    if(focusDepartmentId==null)return;
    const index=sortedRows.findIndex(dep=>String(dep.id)===String(focusDepartmentId));
    if(index<0)return;
    setSelectedDepartmentId(focusDepartmentId);
    pagination.setPage(Math.floor(index/pagination.pageSize)+1);
  },[focusDepartmentId]);
  function closeDrawer(){setSelectedDepartmentId(null);onCloseFocusedDepartment?.();}
  function openDrawer(id){setSelectedDepartmentId(id);}
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Department breakdown">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
      <div><h3 className="font-bold text-slate-900">Department breakdown</h3><p className="mt-1 text-xs text-slate-500">Click any department to review its requested items and allocated models.</p></div>
      <CfoSearchField className="min-w-[250px]" label="Search departments and their requested items" value={search} onChange={e=>{onSearchChange?.(e.target.value);pagination.resetPage();}} placeholder="Search department or requested item"/>
    </div>
    <div className="overflow-x-auto"><table className="min-w-[1080px] w-full border-collapse text-left text-sm">
      <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr>
        <SortableHeader label="Department" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}/>
        <SortableHeader label="Categories" column="categoryCount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
        <SortableHeader label="Items" column="itemCount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
        <SortableHeader label="Requested" column="requested" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
        <SortableHeader label="Approved" column="approved" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
        <SortableHeader label="Allocated value" column="value" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
        <SortableHeader label="Issues" column="issues" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right"/>
        <th className="border border-slate-200 px-4 py-3 text-right">Details</th>
      </tr></thead><tbody className="divide-y divide-slate-100">
        {paged.map(dep=><tr key={dep.id} tabIndex={0} aria-label={`View ${dep.name} department requests`} onClick={()=>openDrawer(dep.id)}
          onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openDrawer(dep.id);}}}
          className="group cursor-pointer transition hover:bg-blue-50/60 focus-visible:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500">
          <td className="px-4 py-3 font-bold text-slate-900">{dep.name}</td>
          <td className="px-4 py-3 text-right tabular-nums">{dep.categoryCount}</td>
          <td className="px-4 py-3 text-right tabular-nums">{dep.itemCount}</td>
          <td className="px-4 py-3 text-right tabular-nums">{numberFormat(dep.requested)}</td>
          <td className="px-4 py-3 text-right tabular-nums">{numberFormat(dep.approved)}</td>
          <td className="px-4 py-3 text-right font-bold tabular-nums"><CurrencyText compact value={dep.value}/></td>
          <td className="px-4 py-3 text-right tabular-nums">{dep.issues}</td>
          <td className="px-4 py-3 text-right"><button type="button" onClick={e=>{e.stopPropagation();openDrawer(dep.id);}} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100" title="View department requests in full-screen details">Details <ArrowRight size={14}/></button></td>
        </tr>)}
        {!paged.length && <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">No departments match the selected filters.</td></tr>}
      </tbody></table></div>
    <TablePagination page={pagination.page} totalPages={pagination.totalPages} pageSize={pagination.pageSize} startRow={pagination.startRow} endRow={pagination.endRow} totalRows={sortedRows.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} pageSizes={[10,20,50]}/>
    {selectedDepartment && <CfoDepartmentDetailsDrawer key={`${selectedDepartment.id}-${category}-${expense}-${search}`} open department={selectedDepartment} onClose={closeDrawer} onViewItem={onSelectItem} categoryOptions={categoryOptions} initialFilters={{category,expense,search}}/>}
  </section>;
}

/** A compact category workflow center: one useful primary action per category. */
export function CfoCategoryTable({packages, eligibilityFor, onAction, onDistribution, onTimeline, onFilterCategory, onReviewPending}) {
  const [expandedPackageId, setExpandedPackageId] = useState(null);
  const toolClass = 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600';

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Category package management">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <h3 className="text-sm font-bold text-slate-900">Category package review</h3>
      <span className="text-xs font-medium text-slate-500">{packages.length} category packages</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1260px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
          <tr><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Items</th><th className="px-4 py-3 text-right">Accepted</th><th className="px-4 py-3 text-right">Pending</th><th className="px-4 py-3 text-right">Needs work</th><th className="px-4 py-3 text-right">Value</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Package actions</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {packages.map(pkg => {
            const e = eligibilityFor(pkg);
            const expanded = String(expandedPackageId) === String(pkg.id);
            const completion = e.counts.all ? Math.round(e.counts.accepted/e.counts.all*100) : 0;
            return <Fragment key={pkg.id}>
              <tr className={`transition-colors ${expanded?'bg-blue-50/30':'hover:bg-slate-50/70'}`}>
                <td className="px-4 py-3.5 align-middle">
                  <button type="button" onClick={()=>onFilterCategory(pkg.category_code)} className="font-bold text-blue-700 hover:underline">{pkg.category_name}</button>
                  <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={e.counts.accepted} aria-valuemin={0} aria-valuemax={e.counts.all || 1} aria-label={`${pkg.category_name} accepted items`}>
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:`${completion}%`}}/>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums">{e.counts.all}</td>
                <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700">{e.counts.accepted}</td>
                <td className="px-4 py-3.5 text-right tabular-nums">{e.counts.pending}</td>
                <td className="px-4 py-3.5 text-right tabular-nums text-amber-700">{e.counts.needs}</td>
                <td className="px-4 py-3.5 text-right font-bold tabular-nums"><CurrencyText compact value={(pkg.items||[]).reduce((sum,item)=>sum+cfoNumber(item.estimated_total),0)}/></td>
                <td className="px-4 py-3.5"><CfoReviewStatusBadge status={pkg.status}/></td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    {e.counts.pending>0 && <CfoActionTooltip Icon={ArrowRight} label={`Review ${e.counts.pending} pending items`} variant="info"><button type="button" onClick={()=>onReviewPending(pkg)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"><ArrowRight size={14}/>Review {e.counts.pending} pending</button></CfoActionTooltip>}
                    <CfoActionTooltip Icon={RotateCcw} label="Return to CM" variant="danger" disabled={!e.canReturn} disabledReason={e.counts.pending>0?'Decide all pending items before returning to CM.':e.counts.needs===0?'At least one item must need modification.':'This category package is not eligible for return.'}>
                      <button type="button" disabled={!e.canReturn} onClick={()=>onAction('RETURN',pkg)} aria-label={`Return ${pkg.category_name} to CM`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-35"><RotateCcw size={14}/>Return to CM</button>
                    </CfoActionTooltip>
                    <CfoActionTooltip Icon={Check} label="Complete Review" variant="success" disabled={!e.canComplete} disabledReason={e.counts.pending>0?'Review all pending items before completing this category.':e.counts.needs>0?'Items needing modification prevent completion.':'This category package is not eligible for completion.'}>
                      <button type="button" disabled={!e.canComplete} onClick={()=>onAction('COMPLETE',pkg)} aria-label={`Complete ${pkg.category_name} CFO review`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-35"><Check size={14}/>Complete Review</button>
                    </CfoActionTooltip>
                    <CfoActionTooltip Icon={ChevronDown} label={expanded?'Hide Package Tools':'Show Package Tools'} variant="info">
                      <button type="button" onClick={()=>setExpandedPackageId(id=>String(id)===String(pkg.id)?null:pkg.id)} aria-expanded={expanded} aria-label={`${expanded?'Hide':'Show'} ${pkg.category_name} package tools`} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${expanded?'border-blue-300 bg-blue-100 text-blue-700':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                        <ChevronDown size={17} className={expanded?'rotate-180':''}/>
                      </button>
                    </CfoActionTooltip>
                  </div>
                </td>
              </tr>
              {expanded && <tr key={`${pkg.id}-tools`} className="bg-slate-50/60">
                <td colSpan={8} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="max-w-lg">
                      <h4 className="text-sm font-bold text-slate-900">{pkg.category_name} package tools</h4>
                      <p className="mt-1 text-xs text-slate-500">Bulk decisions affect pending items only. Accepted items and existing modification notes remain untouched.</p>
                      {pkg.return_reason && <p className="mt-2 whitespace-pre-wrap text-xs text-amber-800"><strong>Previous return:</strong> {pkg.return_reason}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" className={toolClass} onClick={()=>onDistribution(pkg)}><CalendarDays size={16}/>Distribution</button>
                      <button type="button" className={toolClass} onClick={()=>onTimeline(pkg)}><History size={16}/>Package timeline</button>
                      {e.canAcceptPending && <button type="button" className={`${toolClass} border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100`} onClick={()=>onAction('ACCEPT_ALL_PENDING',pkg)}><CheckCheck size={16}/>Accept all {e.counts.pending} pending</button>}
                      {e.canMarkPending && <button type="button" className={`${toolClass} border-amber-200 text-amber-800 hover:bg-amber-50`} onClick={()=>onAction('MARK_ALL_NEEDS_MODIFICATION',pkg)}><ListChecks size={16}/>Mark {e.counts.pending} pending for modification</button>}
                      {e.canReopen && <button type="button" className={`${toolClass} border-blue-200 text-blue-700`} onClick={()=>onAction('REOPEN',pkg)}><RotateCcw size={16}/>Reopen review</button>}
                    </div>
                  </div>
                </td>
              </tr>}
            </Fragment>;
          })}
          {!packages.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No category packages for the selected financial year.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
