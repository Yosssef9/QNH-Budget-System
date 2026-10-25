import { useMemo, useRef, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ClipboardCheck, Flag, RefreshCw, Layers3, Building2, PackageCheck, X, Wallet, CheckCircle2, Clock3, ListChecks, FileSpreadsheet } from "lucide-react";
import { PERMISSION_CODES, hasPermission } from "@qnh/permissions";
import { acceptPendingCfoPackageItems, completeCfoPackageReview, finalizeAnnualCfoPackageReview, getCfoFinancialYears, getCfoFinancialYearDistribution, getCfoPackage, getCfoRevisionComparison, getCfoPackageDistribution, getCfoPackageItemDetail, getCfoPackageTimeline, getCfoPackages, markAllCfoPackageItemsNeedModification, reopenCfoPackageReview, returnCfoPackageToCategoryManager, setCfoPackageItemDecision } from "../../api/cfoPackageReview.api";
import ConfirmModal from "../../components/ConfirmModal";
import Input from "../../components/Input";
import CurrencyText from "../../components/CurrencyText";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import BudgetTimeline from "../../components/BudgetTimeline";
import AnimatedDrawer from "../../components/budgets/shared/drawers/AnimatedDrawer";
import CfoSearchField from "../../components/cfo-package-review/CfoSearchField";
import CfoExcludedItemsView from "../../components/cfo-package-review/CfoExcludedItemsView";
import { getBudgetExclusions } from "../../api/budgetExclusions.api";
import { exportBudgetTableViewToExcel } from "../../utils/budgetExcelExport";
import { buildCfoItemsExcel, buildCfoDepartmentsExcel, buildCfoCategoriesExcel, buildCfoExclusionsExcel } from "../../components/cfo-package-review/cfoReviewExport";
import CfoReviewStatusBadge from "../../components/cfo-package-review/CfoReviewStatusBadge";
import CfoItemReviewDrawer from "../../components/cfo-package-review/CfoItemReviewDrawer";
import CfoDepartmentDetailsDrawer from "../../components/cfo-package-review/CfoDepartmentDetailsDrawer";
import CfoPackageItemComparisonDrawer from "../../components/cfo-package-review/CfoPackageItemComparisonDrawer";
import { pendingCfoSnapshot, suggestCfoReturnReason } from "../../components/cfo-package-review/cfoBulkReviewHelpers";
import { cfoAcceptItemKey, updateCfoCachedAcceptedItem } from "../../components/cfo-package-review/cfoInstantAccept";
import { CfoItemsTable, CfoDepartmentsTable, CfoCategoryTable } from "../../components/cfo-package-review/CfoReviewTables";
import { buildCfoRows, buildCfoDepartments, filterCfoRows, filterCfoDepartments, summarizeCfoItemScope, summarizeCfoDepartmentScope, summarizeCfoCategoryScope, cfoItemCounts, cfoNumber, getCfoPackageEligibility } from "../../components/cfo-package-review/cfoTableSelectors";
import PackageDistributionDrawer from "../../components/category-packages/PackageDistributionDrawer";
import CollapsibleSection from "../../components/CollapsibleSection";
import { useAuth } from "../../context/AuthContext";
import { CategoryBackNavigationProvider, useCategoryBackOverlay } from "../../components/category-review/CategoryBackNavigation";

function CoverageTile({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black leading-none">{value}</p>
    </div>
  );
}

function DepartmentCoveragePanel({
  financialYear,
  coverage,
  packageBreakdown = [],
}) {
  const progress =
    coverage.total > 0 ? (coverage.submitted / coverage.total) * 100 : 0;

  return (
    <CollapsibleSection
      title="Department-category coverage"
      description={`FY ${financialYear || "-"} - Visible category packages`}
      icon={<Building2 className="h-5 w-5" />}
      defaultOpen={false}
      openText="Hide coverage"
      closedText="Show coverage"
      className="rounded-2xl border-blue-100"
      headerClassName="bg-gradient-to-br from-white via-blue-50/40 to-slate-50"
    >
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <p className="text-sm font-black text-slate-950">
                Department-category coverage
              </p>
              <p className="text-xs font-medium text-slate-500">
                FY {financialYear || "-"} · Visible category packages
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Tracks how many department submissions are included in the CFO
            package set, and how many department-category budgets did not submit
            before package review.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[560px]">
          <CoverageTile label="Coverage slots" value={coverage.total} />
          <CoverageTile
            label="Submitted"
            value={coverage.submitted}
            tone="blue"
          />
          <CoverageTile
            label="Not submitted"
            value={coverage.notSubmitted}
            tone="amber"
          />
          <CoverageTile
            label="Review complete"
            value={coverage.completed}
            tone="emerald"
          />
        </div>
      </div>

      <div className="border-t border-blue-100 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600">
          <span>
            {coverage.submitted} of {coverage.total} department-category budgets
            submitted
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        {packageBreakdown.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {packageBreakdown.map((pkg) => {
              const packageProgress =
                pkg.total > 0 ? (pkg.submitted / pkg.total) * 100 : 0;
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-700">
                    <span className="truncate">{pkg.categoryName}</span>
                    <span>
                      {pkg.submitted}/{pkg.total}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, packageProgress))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

function DecisionModal({ modal, loading, onCancel, onConfirm }) {
  const [note, setNote] = useState(() => modal?.type === "RETURN" ? suggestCfoReturnReason(modal.package) : "");

  if (!modal) return null;

  const requiresNote =
    modal.type === "NEEDS_MODIFICATION" ||
    modal.type === "RETURN" ||
    modal.type === "REOPEN" ||
    modal.type === "MARK_ALL_NEEDS_MODIFICATION";

  const title =
    modal.type === "COMPLETE"
        ? "Complete CFO package review?"
        : modal.type === "FINALIZE_ANNUAL"
          ? "Finalize CFO Package Review?"
          : modal.type === "REOPEN"
            ? "Reopen CFO package review?"
        : modal.type === "RETURN"
          ? "Return package to Category Manager?"
          : modal.type === "ACCEPT_ALL_PENDING"
            ? `Accept ${pendingCfoSnapshot(modal.package).length} pending items?`
          : modal.type === "MARK_ALL_NEEDS_MODIFICATION"
            ? `Mark ${pendingCfoSnapshot(modal.package).length} pending items for modification?`
            : "Mark item as needing modification?";

  const message =
    modal.type === "COMPLETE"
        ? "The category package will be completed and locked for normal package preparation."
        : modal.type === "FINALIZE_ANNUAL"
          ? "All completed category package reviews will be finalized for this financial year. This does not pre-close the year, but it locks CFO package reopening."
          : modal.type === "REOPEN"
            ? `${modal.package?.category_name} will return to CFO review so decisions can be adjusted before annual finalization.`
        : modal.type === "RETURN"
          ? "The whole package will return to the Category Manager. Only items marked Needs modification will be editable."
          : modal.type === "ACCEPT_ALL_PENDING"
            ? "Only pending items in this category will be accepted. Previously accepted items and items needing modification stay unchanged. This does not complete the package."
          : modal.type === "MARK_ALL_NEEDS_MODIFICATION"
            ? "Only pending items in this category will receive this common note. Earlier decisions and notes stay unchanged."
            : `${modal.item?.catalog_item_name} will be editable by the Category Manager after the package is returned.`;

  return (
    <ConfirmModal
      open
      title={title}
      message={message}
      confirmText={
        modal.type === "ACCEPT_ALL_PENDING"
          ? `Accept ${pendingCfoSnapshot(modal.package).length} pending items`
          : modal.type === "COMPLETE"
            ? "Complete review"
            : modal.type === "FINALIZE_ANNUAL"
              ? "Finalize review"
              : modal.type === "REOPEN"
                ? "Reopen package"
            : modal.type === "RETURN"
              ? "Return package"
              : "Confirm"
      }
      danger={modal.type === "RETURN"}
      loading={loading}
      onCancel={onCancel}
      onConfirm={() => onConfirm({ note })}
    >
      {(modal.type === "ACCEPT_ALL_PENDING" || modal.type === "MARK_ALL_NEEDS_MODIFICATION") && <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-950">
        <strong>{modal.package?.category_name} · {pendingCfoSnapshot(modal.package).length} pending items</strong>
        <p className="mt-1 text-xs leading-5">This operation applies to the entire category, regardless of table search or filters. Already reviewed items will not be changed.</p>
        <details className="mt-2"><summary className="cursor-pointer font-semibold">Review affected items</summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pl-4 text-xs list-disc">{(modal.package?.items||[]).filter(i=>i.cfo_review_status==='PENDING_CFO_REVIEW').map(i=><li key={i.id}>{i.catalog_item_name}</li>)}</ul>
        </details>
      </div>}
      {modal.type === "RETURN" && modal.package?.items && (() => {
        const review = cfoItemCounts(modal.package.items);
        const flagged = modal.package.items.filter(item => item.cfo_review_status === "NEEDS_MODIFICATION");
        return <div className="mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2"><span className="block text-slate-600">Accepted</span><strong className="text-lg text-emerald-800">{review.accepted}</strong></div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-2"><span className="block text-slate-600">Needs work</span><strong className="text-lg text-amber-800">{review.needs}</strong></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><span className="block text-slate-600">Pending</span><strong className="text-lg text-slate-900">{review.pending}</strong></div>
          </div>
          {flagged.length>0 && <details className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-amber-900">Review {flagged.length} item{flagged.length===1?'':'s'} needing modification</summary>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {flagged.map(item=><li key={item.id} className="rounded-lg bg-white p-2"><span className="font-semibold text-slate-900">{item.catalog_item_name}</span><p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.cfo_review_note || 'No item-specific note recorded.'}</p></li>)}
            </ul>
          </details>}
        </div>;
      })()}
      {requiresNote && (
        <Input
          label={
            modal.type === "RETURN"
              ? "Package return reason (suggested, editable)"
              : modal.type === "REOPEN"
                ? "Reopen reason"
                : "CFO note"
          }
          multiline
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Explain what the Category Manager needs to change."
          required
        />
      )}
      {modal.type === "COMPLETE" && (
        <Input
          label="Completion note"
          multiline
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for the completed CFO review."
        />
      )}
    </ConfirmModal>
  );
}

function CfoPackageReviewContent() {
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const { budgetAccess } = useAuth();
  const permissionCodes = budgetAccess?.permissionCodes ?? budgetAccess?.selectedWorkspace?.permissionCodes ?? [];
  const canDecide = hasPermission(permissionCodes, PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES);
  const [selectedFinancialYearId, setSelectedFinancialYearId] = useState(null);
  const [showExcludedItems, setShowExcludedItems] = useState(false);
  const [view, setView] = useState('ITEMS');
  const itemsExportRef = useRef(null);
  const departmentsExportRef = useRef(null);
  const excludedExportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [expense, setExpense] = useState('ALL');
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [comparisonRow, setComparisonRow] = useState(null);
  const [modal, setModal] = useState(null);
  // A synchronous lock prevents double-clicks before React re-renders.
  // Each item tracks its own pending save so other rows remain reviewable.
  const acceptingItemsRef = useRef(new Set());
  const [acceptingItems, setAcceptingItems] = useState(() => new Set());
  const [distributionContext, setDistributionContext] = useState(null);
  const [timelinePackageId, setTimelinePackageId] = useState(null);
  const [focusedDepartmentId, setFocusedDepartmentId] = useState(null);
  const [itemDepartmentContext, setItemDepartmentContext] = useState(null);

  // Share Category Manager's POP blocker: Back closes the topmost CFO overlay,
  // not the CFO route. Each open layer keeps its existing X/onClose handler.
  useCategoryBackOverlay(Boolean(selectedRowKey), () => setSelectedRowKey(null));
  useCategoryBackOverlay(Boolean(itemDepartmentContext), () => setItemDepartmentContext(null));
  useCategoryBackOverlay(Boolean(comparisonRow), () => setComparisonRow(null));
  useCategoryBackOverlay(Boolean(modal), () => setModal(null));
  useCategoryBackOverlay(Boolean(distributionContext), () => setDistributionContext(null));
  useCategoryBackOverlay(Boolean(timelinePackageId), () => setTimelinePackageId(null));

  const financialYearsQuery = useQuery({queryKey:['cfo-package-review','financial-years'],queryFn:getCfoFinancialYears});
  const financialYears = useMemo(()=>financialYearsQuery.data || [],[financialYearsQuery.data]);
  const defaultYearId = useMemo(()=>(financialYears.find(y=>y.status==='OPEN') || financialYears.find(y=>y.status==='PRE_CLOSING') || financialYears[0])?.id || null,[financialYears]);
  const effectiveYearId = selectedFinancialYearId || defaultYearId;
  const year = financialYears.find(y=>Number(y.id)===Number(effectiveYearId));
  const readOnly = year?.status !== 'OPEN';
  const packagesQuery = useQuery({queryKey:['cfo-package-review','packages',effectiveYearId],queryFn:()=>getCfoPackages(effectiveYearId),enabled:Boolean(effectiveYearId)});
  const packages = useMemo(()=>packagesQuery.data || [],[packagesQuery.data]);
  // Package details are fetched in parallel. Every row remains tied to its own
  // package id, permission/status, row-version and backend mutation.
  const packageQueries = useQueries({queries:packages.map(pkg=>({
    queryKey:['cfo-package-review','package',pkg.id],
    queryFn:()=>getCfoPackage(pkg.id),enabled:Boolean(effectiveYearId),
  }))});
  const packageResponses = packageQueries.filter(q=>q.isSuccess && q.data?.package).map(q=>q.data);
  const exclusionsQuery = useQuery({
    queryKey: ['budget-exclusions', Number(effectiveYearId)],
    queryFn: () => getBudgetExclusions(effectiveYearId),
    enabled: Boolean(effectiveYearId) && view === 'ITEMS' && showExcludedItems,
    staleTime: 10000,
  });
  const loadedPackages = packageResponses.map(result=>result.package);
  const comparisonQueries = useQueries({queries:loadedPackages.map(pkg=>({
    queryKey:['cfo-package-review','revision-comparison',pkg.id],
    queryFn:()=>getCfoRevisionComparison(pkg.id),
    enabled:pkg.status === 'IN_CFO_REVIEW' || pkg.status === 'CFO_REVIEW_COMPLETED',
    staleTime:30000,
  }))});
  const comparisonsByPackage = Object.fromEntries(comparisonQueries
    .filter(q=>q.isSuccess && q.data?.package_id)
    .map(q=>[q.data.package_id, {
      ...q.data,
      itemsById:Object.fromEntries((q.data.items||[]).map(item=>[item.item_id,item])),
    }]));

  const selectedCategoryPackage = category !== 'ALL'
    ? loadedPackages.find(pkg => pkg.category_code === category)
    : null;
  const selectedCategoryComparison = selectedCategoryPackage
    ? comparisonsByPackage[selectedCategoryPackage.id]
    : null;

  const loading = financialYearsQuery.isLoading || packagesQuery.isLoading || packageQueries.some(q=>q.isPending);
  const loadingFailed = financialYearsQuery.isError || packagesQuery.isError || packageQueries.some(q=>q.isError);
  const isExcludedExport = view === 'ITEMS' && showExcludedItems;
  // Cycle comparisons are optional export columns. Some queries are deliberately
  // disabled for packages outside CFO review; none should block the whole export.
  const optionalComparisonsUnavailable = comparisonQueries.some((query, index) => {
    const packageStatus = loadedPackages[index]?.status;
    const applicable = packageStatus === 'IN_CFO_REVIEW' || packageStatus === 'CFO_REVIEW_COMPLETED';
    return applicable && !query.isSuccess;
  });
  const exportDisabled = exporting || !effectiveYearId || (isExcludedExport
    ? exclusionsQuery.isPending || exclusionsQuery.isError
    : loading || loadingFailed);

  async function exportCurrentCfoView() {
    if (exportDisabled) return;
    const currentView = isExcludedExport ? 'Excluded_Items' : view === 'ITEMS' ? 'By_Item' : view === 'DEPARTMENTS' ? 'By_Department' : 'By_Category';
    let report;
    let filters;
    if (isExcludedExport) {
      const rowsForExport = excludedExportRef.current?.getExportRows();
      if (!rowsForExport) { toast.error('Exclusion view is not ready to export.'); return; }
      report = buildCfoExclusionsExcel(rowsForExport);
      const local = excludedExportRef.current.getExportFilters();
      filters = [`Type: ${local.type === 'ALL' ? 'All exclusions' : local.type.replaceAll('_', ' ')}`, local.search ? `Search: ${local.search}` : null];
    } else if (view === 'ITEMS') {
      const rowsForExport = itemsExportRef.current?.getExportRows();
      if (!rowsForExport) { toast.error('Item table is not ready to export.'); return; }
      report = buildCfoItemsExcel(rowsForExport, comparisonsByPackage);
      filters = [`Category: ${category === 'ALL' ? 'All' : category}`, `Expense: ${expense}`, `CFO status: ${status}`, search ? `Search: ${search}` : null, 'Sort: as shown in item table'];
    } else if (view === 'DEPARTMENTS') {
      const rowsForExport = departmentsExportRef.current?.getExportRows();
      if (!rowsForExport) { toast.error('Department table is not ready to export.'); return; }
      report = buildCfoDepartmentsExcel(rowsForExport);
      filters = [`Category: ${category === 'ALL' ? 'All' : category}`, `Expense: ${expense}`, departmentSearch ? `Search: ${departmentSearch}` : null, 'Sort: as shown in department table'];
    } else {
      report = buildCfoCategoriesExcel(loadedPackages, comparisonsByPackage);
      filters = ['All submitted categories', 'Order: as shown in category table'];
    }
    if (!report.rows.length) { toast('No rows match the current filters.'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const safeCategory = view === 'CATEGORIES' || isExcludedExport || category === 'ALL' ? 'All' : category;
    const fileName = `CFO_${currentView}_FY${year?.year || 'Year'}_${safeCategory}_${today}.xlsx`;
    setExporting(true);
    try {
      await exportBudgetTableViewToExcel({
        ...report,
        subtitle: `QNH Budget System | FY ${year?.year || '-'} | ${currentView.replaceAll('_', ' ')}`,
        filters: filters.filter(Boolean),
        fileName,
      });
      if (!isExcludedExport && view !== 'DEPARTMENTS' && optionalComparisonsUnavailable) {
        toast('Excel exported. Some optional CFO cycle comparisons were unavailable; their cells are blank.');
      }
    } catch (error) {
      toast.error(error?.message || 'Could not export the current CFO view.');
    } finally { setExporting(false); }
  }
  const rows = useMemo(()=>buildCfoRows(packageResponses),[packageResponses.map(q=>q.package?.id+'-'+q.package?.row_version+'-'+(q.package?.items||[]).map(i=>i.row_version).join(',')).join('|')]);
  const departments = useMemo(()=>buildCfoDepartments(packageResponses),[rows]);
  const filteredRows = useMemo(()=>filterCfoRows(rows,{search,category,status,expense}),[rows,search,category,status,expense]);
  const filteredDepartments = useMemo(()=>filterCfoDepartments(departments,{search:departmentSearch,category,expense}),[departments,departmentSearch,category,expense]);
  const itemScope = useMemo(()=>summarizeCfoItemScope(filteredRows),[filteredRows]);
  const departmentScope = useMemo(()=>summarizeCfoDepartmentScope(filteredDepartments),[filteredDepartments]);
  const categoryScope = summarizeCfoCategoryScope(loadedPackages);
  const financialContext = view === 'ITEMS'
    ? [category==='ALL'?'All categories':category, expense==='ALL'?'CAPEX + OPEX':expense, status==='ALL'?'All CFO statuses':status==='PENDING'?'Pending CFO decisions':status.replaceAll('_',' ').toLowerCase(), search.trim()?'Search applied':null].filter(Boolean).join(' · ')
    : view === 'DEPARTMENTS'
    ? [category==='ALL'?'All categories':category,expense==='ALL'?'CAPEX + OPEX':expense,departmentSearch.trim()?'Search applied':null].filter(Boolean).join(' · ')
    : 'All submitted categories · CAPEX + OPEX';
  const financialTitle = view === 'ITEMS'
    ? `${category==='ALL'?'':category+' '}${expense==='ALL'?'Purchasing':expense+' Purchasing'} value`
    : view === 'DEPARTMENTS' ? `${expense==='ALL'?'Allocated':expense+' allocated'} value` : 'Category package value';
  const kpis = view === 'ITEMS' ? [
    {label:financialTitle,value:<CurrencyText compact value={itemScope.value}/>,hint:financialContext+' · Purchasing-approved model prices',icon:Wallet,tone:'blue'},
    {label:'Matching package items',value:itemScope.all,hint:'Filtered items · all table pages',icon:Layers3,tone:'slate'},
    {label:'Accepted items',value:itemScope.accepted,hint:`${itemScope.all?Math.round(itemScope.accepted/itemScope.all*100):0}% of matching items`,icon:CheckCircle2,tone:'emerald'},
    {label:'Awaiting / needs work',value:itemScope.pending+itemScope.needs,hint:`${itemScope.pending} pending · ${itemScope.needs} needs modification`,icon:Clock3,tone:'amber'},
  ] : view === 'DEPARTMENTS' ? [
    {label:financialTitle,value:<CurrencyText compact value={departmentScope.value}/>,hint:financialContext+' · Model allocations',icon:Wallet,tone:'blue'},
    {label:'Matching departments',value:departmentScope.departments,hint:'Departments in current filter',icon:Building2,tone:'slate'},
    {label:'Department item requests',value:departmentScope.items,hint:`${departmentScope.approved.toLocaleString()} approved units`,icon:ListChecks,tone:'emerald'},
    {label:'Allocation issues',value:departmentScope.issues,hint:'Unreconciled department request lines',icon:Clock3,tone:'amber'},
  ] : [
    {label:financialTitle,value:<CurrencyText compact value={categoryScope.value}/>,hint:financialContext,icon:Wallet,tone:'blue'},
    {label:'Category packages',value:categoryScope.categories,hint:'Submitted categories for selected year',icon:Layers3,tone:'slate'},
    {label:'Completed reviews',value:categoryScope.completed,hint:'Category-level CFO completion',icon:CheckCircle2,tone:'emerald'},
    {label:'Categories in review',value:categoryScope.inReview,hint:`${categoryScope.returned} returned to Category Manager`,icon:Clock3,tone:'amber'},
  ];
  const visibleDrawerRows = useMemo(()=>[...(view==='ITEMS'?filteredRows:filterCfoRows(rows,{category}))].sort((a,b)=>String(a.catalog_item_name||'').localeCompare(String(b.catalog_item_name||''))),[view,filteredRows,rows,category]);
  const selectedRow = selectedRowKey ? rows.find(r=>String(r.package_id)===String(selectedRowKey.packageId) && String(r.id)===String(selectedRowKey.itemId)) : null;
  const itemDetailQuery = useQuery({queryKey:['cfo-package-review','package-item',selectedRow?.package_id,selectedRow?.id],queryFn:()=>getCfoPackageItemDetail({packageId:selectedRow.package_id,packageItemId:selectedRow.id}),enabled:Boolean(selectedRow)});
  const annualFinalized = Boolean(year?.cfo_review_finalized_at || packages.find(p=>p.financial_year_cfo_review_finalized_at)?.financial_year_cfo_review_finalized_at);
  const canFinalize = Boolean(canDecide && !readOnly && !annualFinalized && effectiveYearId && packages.length>=3 && packages.every(p=>p.status==='CFO_REVIEW_COMPLETED'));
  const coverage = packages.reduce((a,p)=>({
    total:a.total+cfoNumber(p.summary?.total_departments),
    submitted:a.submitted+cfoNumber(p.summary?.submitted_departments),
    notSubmitted:a.notSubmitted+cfoNumber(p.summary?.not_submitted_departments),
    completed:a.completed+cfoNumber(p.summary?.completed_departments),
  }),{total:0,submitted:0,notSubmitted:0,completed:0});
  coverage.packages = packages.map(p=>({id:p.id,categoryName:p.category_name,total:cfoNumber(p.summary?.total_departments),submitted:cfoNumber(p.summary?.submitted_departments)}));
  const eligibilityFor = pkg => getCfoPackageEligibility(pkg,{canDecide,readOnly,finalized:annualFinalized});
  const canDecideItem = row => eligibilityFor(loadedPackages.find(p=>Number(p.id)===Number(row.package_id))).editable;

  const distributionQuery = useQuery({
    queryKey:['cfo-package-review','distribution',distributionContext?.type,distributionContext?.financialYearId,distributionContext?.packageId,distributionContext?.packageItemId],
    queryFn:()=>distributionContext.type==='FINANCIAL_YEAR'
      ? getCfoFinancialYearDistribution(distributionContext.financialYearId)
      : getCfoPackageDistribution({packageId:distributionContext.packageId,packageItemId:distributionContext.packageItemId || null}),
    enabled:Boolean(distributionContext),
  });
  function refresh() {queryClient.invalidateQueries({queryKey:['cfo-package-review']});}
  const mutationOptions=(success,error)=>({onSuccess:()=>{toast.success(success);setModal(null);refresh()},onError:e=>toast.error(e?.response?.data?.message||error)});
  const decisionMutation=useMutation({mutationFn:setCfoPackageItemDecision,...mutationOptions('CFO item decision saved','Failed to save CFO item decision')});
  const acceptPendingMutation=useMutation({mutationFn:acceptPendingCfoPackageItems,...mutationOptions('Pending items accepted','Failed to accept pending items')});
  const markAllMutation=useMutation({mutationFn:markAllCfoPackageItemsNeedModification,...mutationOptions('Pending items marked as needing modification','Failed to mark pending items')});
  const returnMutation=useMutation({mutationFn:returnCfoPackageToCategoryManager,...mutationOptions('Package returned to Category Manager','Failed to return package')});
  const completeMutation=useMutation({mutationFn:completeCfoPackageReview,...mutationOptions('CFO package review completed','Failed to complete review')});
  const reopenMutation=useMutation({mutationFn:reopenCfoPackageReview,...mutationOptions('CFO package review reopened','Failed to reopen review')});
  const finalizeAnnualMutation=useMutation({mutationFn:finalizeAnnualCfoPackageReview,...mutationOptions('CFO Package Review finalized','Failed to finalize annual review')});
  const modalLoading=[decisionMutation,acceptPendingMutation,markAllMutation,returnMutation,completeMutation,reopenMutation,finalizeAnnualMutation].some(m=>m.isPending);
  const isAcceptingItem = (item) => acceptingItems.has(cfoAcceptItemKey(item));

  // Individual Accept is intentionally a one-click action. Unlike bulk or
  // package workflow transitions, it never opens/closes a confirmation dialog.
  async function acceptItemImmediately(item) {
    if (!item) return;
    const key = cfoAcceptItemKey(item);
    if (acceptingItemsRef.current.has(key)) return;
    const pkg = loadedPackages.find((entry) => Number(entry.id) === Number(item.package_id));
    const currentItem = pkg?.items?.find((entry) => Number(entry.id) === Number(item.id));
    if (!currentItem || !eligibilityFor(pkg).editable) {
      toast.error('This item is no longer available for CFO review. Refresh the page.');
      return;
    }
    if (currentItem.cfo_review_status === 'CFO_ACCEPTED') return;

    acceptingItemsRef.current.add(key);
    setAcceptingItems((previous) => new Set(previous).add(key));
    try {
      const result = await setCfoPackageItemDecision({
        packageId: pkg.id,
        packageItemId: currentItem.id,
        payload: {decision: 'CFO_ACCEPTED', row_version: currentItem.row_version, note: ''},
      });
      // Immediately reflect the confirmed server decision in the table, drawer,
      // counters and category view. Then refetch all authoritative package data.
      queryClient.setQueryData(['cfo-package-review', 'package', pkg.id], (cached) =>
        updateCfoCachedAcceptedItem(cached, result?.package_item, currentItem.row_version));
      toast.success(`${currentItem.catalog_item_name || 'Item'} accepted successfully`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to accept CFO item');
    } finally {
      // Keep this item locked until the authoritative refresh finishes. A
      // refresh error must never be reported as an acceptance failure.
      try {
        await queryClient.invalidateQueries({queryKey: ['cfo-package-review']});
      } catch {
        toast.error('Could not refresh CFO items. Please use Refresh.');
      } finally {
        acceptingItemsRef.current.delete(key);
        setAcceptingItems((previous) => {
          const next = new Set(previous);
          next.delete(key);
          return next;
        });
      }
    }
  }

  function confirmDecision({note}) {
    if(!modal) return;
    const packageId=modal.package?.id || modal.packageId || modal.item?.package_id;
    const pkg=loadedPackages.find(p=>Number(p.id)===Number(packageId));
    if(modal.type!=='FINALIZE_ANNUAL' && !pkg) {toast.error('Package data is unavailable. Refresh the page.');return;}
    if(['RETURN','REOPEN','NEEDS_MODIFICATION','MARK_ALL_NEEDS_MODIFICATION'].includes(modal.type) && !note.trim()) {toast.error('A reason is required');return;}
    if(modal.type==='NEEDS_MODIFICATION') {
      const currentItem=pkg.items?.find(i=>Number(i.id)===Number(modal.item.id));
      if(!currentItem || !eligibilityFor(pkg).editable) {toast.error('Item is no longer available for CFO review');return;}
      decisionMutation.mutate({packageId:pkg.id,packageItemId:currentItem.id,payload:{decision:'NEEDS_MODIFICATION',row_version:currentItem.row_version,note}});
    } else if(modal.type==='ACCEPT_ALL_PENDING' || modal.type==='MARK_ALL_NEEDS_MODIFICATION') {
      if(!eligibilityFor(pkg).canAcceptPending) {toast.error('There are no eligible pending items');return;}
      // Freeze the exact list the CFO saw when the confirmation opened.
      // A background refetch must not silently add unseen items to this action.
      const expected_pending_items = pendingCfoSnapshot(modal.package);
      const payload = {row_version:modal.package.row_version,expected_pending_items,...(modal.type==='MARK_ALL_NEEDS_MODIFICATION'?{note}:{})};
      if(modal.type==='ACCEPT_ALL_PENDING') acceptPendingMutation.mutate({packageId:pkg.id,payload});
      else markAllMutation.mutate({packageId:pkg.id,payload});
    } else if(modal.type==='RETURN') {
      if(!eligibilityFor(pkg).canReturn) {toast.error('All items must be decided and one must need modification');return;}
      returnMutation.mutate({packageId:pkg.id,payload:{row_version:pkg.row_version,reason:note}});
    } else if(modal.type==='COMPLETE') {
      if(!eligibilityFor(pkg).canComplete) {toast.error('All items must be accepted');return;}
      completeMutation.mutate({packageId:pkg.id,payload:{row_version:pkg.row_version,note}});
    } else if(modal.type==='REOPEN') {
      if(!eligibilityFor(pkg).canReopen) {toast.error('This package cannot be reopened');return;}
      reopenMutation.mutate({packageId:pkg.id,payload:{row_version:pkg.row_version,reason:note}});
    } else if(modal.type==='FINALIZE_ANNUAL') {
      if(!canFinalize) {toast.error('Annual review is not ready for finalization');return;}
      finalizeAnnualMutation.mutate({financialYearId:effectiveYearId,payload:{note:note.trim()||null}});
    }
  }
  function openItem(item) {setItemDepartmentContext(null);setSelectedRowKey(item?{packageId:item.package_id,itemId:item.id}:null);}
  function openItemByIds({packageId,itemId}) {
    const row=rows.find(r=>Number(r.package_id)===Number(packageId)&&Number(r.id)===Number(itemId));
    if(!row) {toast.error('Item not found in the active CFO package set');return;}
    openItem(row);
  }
  function packageDistribution(pkg) {setDistributionContext({type:'CATEGORY_PACKAGE',packageId:pkg.id,title:`${pkg.category_name} Package Distribution`,subtitle:`FY ${pkg.financial_year} approved package value across the year`});}
  function itemDistribution(item) {setDistributionContext({type:'PACKAGE_ITEM',packageId:item.package_id,packageItemId:item.id,title:`${item.catalog_item_name} Distribution`,subtitle:`${item.category_name} package – FY ${item.financial_year}`});}
  function filterCategoryAndOpenItems(code) {setCategory(String(code).toUpperCase());setStatus('ALL');setExpense('ALL');setSearch('');setView('ITEMS');}
  function reviewPendingCategory(pkg) {
    setCategory(String(pkg.category_code).toUpperCase());
    setStatus('PENDING');
    setExpense('ALL');
    setSearch('');
    setView('ITEMS');
    document.getElementById('cfo-review-workspace')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  const categoryOptions = useMemo(() => [
    { value: 'ALL', label: 'All Categories' },
    ...packages.map(pkg => ({
      value: String(pkg.category_code).toUpperCase(),
      label: pkg.category_name,
      status: pkg.status,
    })),
  ], [packages]);
  const statusOptions = [{value:'ALL',label:'All Statuses'},{value:'PENDING',label:'Pending Review'},{value:'CFO_ACCEPTED',label:'Accepted'},{value:'NEEDS_MODIFICATION',label:'Needs Modification'}];
  const expenseOptions = [{value:'ALL',label:'All Expense Types'},{value:'CAPEX',label:'CAPEX'},{value:'OPEX',label:'OPEX'}];

  const controls='rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  return <div className="mx-auto max-w-[1800px] space-y-4 pb-10">
    <header className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-700"><ClipboardCheck size={15}/> CFO Review</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">CFO Budget Review</h1>
          <p className="mt-1 text-sm text-slate-500">Review category items, inspect departmental demand, and complete each package.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[195px]"><p className="mb-1 text-xs font-bold text-slate-500">FINANCIAL YEAR</p><SearchableMultiSelect name="financialYearId" multiple={false} disableClear value={effectiveYearId || ''} options={financialYears}
            disabled={financialYearsQuery.isLoading||!financialYears.length} loading={financialYearsQuery.isLoading} placeholder="Choose financial year" searchPlaceholder="Search years" noResultsText="No financial years" maxVisibleBadges={1}
            getOptionValue={y=>y.id} getOptionLabel={y=>`FY ${y.year} - ${y.status}`}
            onChange={e=>{setSelectedFinancialYearId(e.target.value||null);setSelectedRowKey(null);setComparisonRow(null);setModal(null);setCategory('ALL');setView('ITEMS');setSearch('');setDepartmentSearch('');setExpense('ALL');setStatus('ALL');setItemDepartmentContext(null);setTimelinePackageId(null);setFocusedDepartmentId(null);setDistributionContext(null)}}/></div>
          <button type="button" disabled={!effectiveYearId} onClick={()=>setDistributionContext({type:'FINANCIAL_YEAR',financialYearId:effectiveYearId,title:`FY ${year?.year || ''} Distribution`,subtitle:'All submitted category packages'})} className={`${controls} inline-flex items-center gap-1 disabled:opacity-40`}><CalendarDays size={15}/> Year Distribution</button>
          <button type="button" onClick={refresh} className={`${controls} inline-flex items-center gap-1`}><RefreshCw size={15}/> Refresh</button>
          <button type="button" disabled={!canFinalize} title={annualFinalized?'Annual CFO review is finalized':'All category reviews must be completed before annual finalization'} onClick={()=>setModal({type:'FINALIZE_ANNUAL'})} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><Flag size={15}/> Finalize Annual Review</button>
        </div>
      </div>
      {annualFinalized && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Annual CFO review finalized. Financial-year pre-close is a separate operation.</p>}
      {readOnly && year && <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">FY {year.year} is {year.status}. All review actions are read-only.</p>}
    </header>

    <AnimatePresence initial={false}>
    {!(view === 'ITEMS' && showExcludedItems) && <motion.section
      key="cfo-review-kpis"
      initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeInOut' }}
      className="grid grid-cols-2 gap-3 overflow-hidden lg:grid-cols-4"
      aria-label={`${view === 'ITEMS' ? 'Item' : view === 'DEPARTMENTS' ? 'Department' : 'Category'} CFO review KPIs`}>
      {kpis.map(card=>{
        const Icon=card.icon;
        const tones={blue:'bg-blue-50 text-blue-700',slate:'bg-slate-100 text-slate-700',emerald:'bg-emerald-50 text-emerald-700',amber:'bg-amber-50 text-amber-700'};
        return <div key={card.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><span className={`rounded-lg p-2 ${tones[card.tone]}`}><Icon size={17}/></span><p className="break-words text-[11px] font-black uppercase tracking-wide text-slate-600">{card.label}</p></div>
          <p className="mt-3 text-xl font-black tabular-nums text-slate-950">{loading||loadingFailed?'—':card.value}</p>
          <p className="mt-1 min-h-8 break-words text-xs leading-4 text-slate-500">{card.hint}</p>
        </div>;
      })}
    </motion.section>}
    </AnimatePresence>
    {packages.length>0 && <DepartmentCoveragePanel financialYear={year?.year} coverage={coverage} packageBreakdown={coverage.packages}/>}

    <section id="cfo-review-workspace" className="scroll-mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="CFO review perspective">
          {[['ITEMS','By Item',Layers3],['DEPARTMENTS','By Department',Building2],['CATEGORIES','By Category',PackageCheck]].map(([id,label,Icon])=><button key={id} type="button" role="tab" aria-selected={view===id} onClick={()=>setView(id)} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition ${view===id?'bg-blue-600 text-white shadow-sm':'text-slate-600 hover:bg-white'}`}><Icon size={15}/>{label}</button>)}
        </div>
        {view==='ITEMS' && <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="CFO item review mode">
          {[{ excluded: false, label: 'Active review' }, { excluded: true, label: 'Excluded items' }].map(mode => {
            const selected = showExcludedItems === mode.excluded;
            return <button key={mode.label} type="button" aria-pressed={selected} onClick={() => setShowExcludedItems(mode.excluded)} className={`relative isolate overflow-hidden rounded-md px-3 py-1.5 text-xs font-bold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${selected ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}>
              {selected && <motion.span layoutId="cfo-item-review-mode-indicator" className="pointer-events-none absolute inset-0 z-0 rounded-md bg-white shadow-sm" transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 530, damping: 44 }}/>} 
              <span className="relative z-10">{mode.label}</span>
            </button>;
          })}
        </div>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{view==='ITEMS'?(showExcludedItems?'Read-only exclusions':`${filteredRows.length} of ${rows.length} items`):view==='DEPARTMENTS'?`${filteredDepartments.length} departments`:`${packages.length} category packages`}</span>
          <button type="button" onClick={exportCurrentCfoView} disabled={exportDisabled}
            aria-label="Export current CFO view to Excel" title="Export all matching rows in the current view, using the table sort order"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
            <FileSpreadsheet size={16}/>{exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>
      {view!=='CATEGORIES' && (view!=='ITEMS' || !showExcludedItems) && <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white p-4">
        {view==='ITEMS' && <CfoSearchField className="min-w-[200px] flex-[2_1_290px]" label="Search CFO items" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search item, model, category or note"/>}
        <div className="min-w-[180px] flex-[1_1_190px]" aria-label="Category filter"><SearchableMultiSelect name="cfoCategory" multiple={false} disableClear value={category} options={categoryOptions} onChange={e=>setCategory(e.target.value)} searchPlaceholder="Search categories" renderOptionSuffix={option => option.status ? <CfoReviewStatusBadge status={option.status} compact /> : null}/></div>
        {view==='ITEMS' && <>
          <div className="min-w-[175px] flex-[1_1_180px]" aria-label="CFO status filter"><SearchableMultiSelect name="cfoStatus" multiple={false} disableClear value={status} options={statusOptions} onChange={e=>setStatus(e.target.value)} searchPlaceholder="Search statuses"/></div>
        </>}
        {(view==='ITEMS'||view==='DEPARTMENTS') && <div className="min-w-[155px] flex-[1_1_165px]" aria-label="Expense type filter"><SearchableMultiSelect name="cfoExpenseType" multiple={false} disableClear value={expense} options={expenseOptions} onChange={e=>setExpense(e.target.value)} searchPlaceholder="Search expense types"/></div>}
        {(category!=='ALL'||expense!=='ALL'||(view==='ITEMS' && (status!=='ALL'||search))||(view==='DEPARTMENTS' && departmentSearch)) && <button type="button" onClick={()=>{setCategory('ALL');setStatus('ALL');setSearch('');setDepartmentSearch('');setExpense('ALL')}} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><X size={13}/>Clear Filters</button>}
      </div>}
      {view === 'ITEMS' && !showExcludedItems && selectedCategoryComparison?.category && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/50 px-4 py-3" aria-label="CFO category cycle financial comparison">
          <div>
            <div className="text-xs font-black text-blue-900">{selectedCategoryPackage.category_name} · Since previous CFO review</div>
            <div className="mt-1 text-xs text-slate-600">Entire category (all expenses) · Previous <CurrencyText compact value={selectedCategoryComparison.category.previous_total}/> · Current <CurrencyText compact value={selectedCategoryComparison.category.current_total}/></div>
            <div className="mt-1 text-xs text-slate-600">{selectedCategoryComparison.summary.changed} financially changed · {selectedCategoryComparison.summary.unchanged} financially unchanged returned items</div>
          </div>
          <span className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-black text-blue-800">
            {selectedCategoryComparison.category.change_amount > 0 ? '+' : ''}<CurrencyText compact value={selectedCategoryComparison.category.change_amount} /> · {selectedCategoryComparison.category.change_percent == null ? 'N/A' : `${selectedCategoryComparison.category.change_percent > 0 ? '+' : ''}${selectedCategoryComparison.category.change_percent}%`}
          </span>
        </div>
      )}
      <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={view === 'ITEMS' ? (showExcludedItems ? 'excluded' : 'active') : view}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.17, ease: 'easeOut' }}
      >
      {view==='ITEMS' && showExcludedItems ?
        <CfoExcludedItemsView ref={excludedExportRef} key={effectiveYearId || "none"} financialYearId={effectiveYearId} query={exclusionsQuery} /> :
      loading ? <div className="p-10 text-center text-sm text-slate-500" role="status">Loading CFO packages and items…</div>
      : loadingFailed ? <div className="p-8 text-center text-sm text-rose-700" role="alert">Could not load all CFO packages. Refresh to retry; partial data is hidden to avoid incomplete decisions.</div>
      : !packages.length ? <div className="p-10 text-center text-sm text-slate-500">No submitted category packages for this year.</div>
      : view==='ITEMS' ? <CfoItemsTable ref={itemsExportRef} rows={filteredRows} comparisonsByPackage={comparisonsByPackage} canDecideItem={canDecideItem} onDetails={openItem} onHistory={setComparisonRow} onAccept={acceptItemImmediately} isAcceptingItem={isAcceptingItem} onModification={item=>setModal({type:'NEEDS_MODIFICATION',item,packageId:item.package_id})}/>
      : view==='DEPARTMENTS' ? <CfoDepartmentsTable ref={departmentsExportRef} focusDepartmentId={focusedDepartmentId} departments={departments} category={category} expense={expense} search={departmentSearch} onSearchChange={setDepartmentSearch} categoryOptions={categoryOptions} onSelectItem={openItemByIds} onCloseFocusedDepartment={()=>setFocusedDepartmentId(null)}/>
      : <CfoCategoryTable packages={loadedPackages} comparisonsByPackage={comparisonsByPackage} eligibilityFor={eligibilityFor} onAction={(type,pkg)=>setModal({type,package:pkg})} onDistribution={packageDistribution} onTimeline={p=>setTimelinePackageId(p.id)} onFilterCategory={filterCategoryAndOpenItems} onReviewPending={reviewPendingCategory}/> }
      </motion.div>
      </AnimatePresence>
    </section>

    <CfoItemReviewDrawer selectedRow={selectedRow || null} visibleRows={visibleDrawerRows} itemDetail={itemDetailQuery.data} loadingDetail={itemDetailQuery.isLoading} detailError={itemDetailQuery.isError} canDecide={Boolean(selectedRow && canDecideItem(selectedRow))} onSelectItem={openItem} onCloseItem={()=>{setItemDepartmentContext(null);setSelectedRowKey(null);}} onAccept={acceptItemImmediately} accepting={Boolean(selectedRow && isAcceptingItem(selectedRow))} onNeedsModification={item=>setModal({type:'NEEDS_MODIFICATION',item,packageId:item.package_id})} onViewDistribution={itemDistribution} packageReturnNote={loadedPackages.find(p=>Number(p.id)===Number(selectedRow?.package_id))?.return_reason} onOpenDepartment={(departmentId,categoryCode)=>setItemDepartmentContext({departmentId,categoryCode})}/>
    <CfoDepartmentDetailsDrawer key={`${itemDepartmentContext?.departmentId || 'closed'}-${itemDepartmentContext?.categoryCode || ''}`}
      open={Boolean(itemDepartmentContext && selectedRow)}
      department={departments.find(dep=>String(dep.id)===String(itemDepartmentContext?.departmentId)) || null}
      onClose={()=>setItemDepartmentContext(null)} onViewItem={openItemByIds}
      categoryOptions={categoryOptions}
      initialFilters={{category:itemDepartmentContext?.categoryCode || 'ALL',expense:'ALL',search:''}}/>
    <CfoPackageItemComparisonDrawer open={Boolean(comparisonRow)} onClose={()=>setComparisonRow(null)} packageId={comparisonRow?.package_id} packageItem={comparisonRow}/>
    <DecisionModal key={`${modal?.type||'none'}-${modal?.package?.id||modal?.item?.id||'annual'}`} modal={modal} loading={modalLoading} onCancel={()=>setModal(null)} onConfirm={confirmDecision}/>
    <PackageDistributionDrawer open={Boolean(distributionContext)} onClose={()=>setDistributionContext(null)} title={distributionContext?.title} subtitle={distributionContext?.subtitle} data={distributionQuery.data} loading={distributionQuery.isLoading} error={distributionQuery.error}/>
    <AnimatedDrawer open={Boolean(timelinePackageId)} onClose={()=>setTimelinePackageId(null)} side="left" maxWidth="max-w-xl"><div className="flex h-full flex-col bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-4"><h3 className="text-lg font-bold">Category workflow timeline</h3><button type="button" onClick={()=>setTimelinePackageId(null)} aria-label="Close timeline" className="rounded-lg border border-slate-200 p-2"><X size={18}/></button></div><div className="min-h-0 flex-1 overflow-y-auto p-3">{timelinePackageId && <BudgetTimeline budgetId={timelinePackageId} queryKey={['cfo-package-review','timeline',timelinePackageId]} queryFn={()=>getCfoPackageTimeline(timelinePackageId)} enabled={Boolean(timelinePackageId)} title="Category package timeline" subtitle="CFO and package workflow history" emptyMessage="No package timeline actions recorded." onToggle={()=>setTimelinePackageId(null)}/>}</div></div></AnimatedDrawer>
  </div>;
}


/** The blocker must be rendered inside the router and above all CFO drawers. */
export default function CfoPackageReviewPage() {
  return (
    <CategoryBackNavigationProvider>
      <CfoPackageReviewContent />
    </CategoryBackNavigationProvider>
  );
}

