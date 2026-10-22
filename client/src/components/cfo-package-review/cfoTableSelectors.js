// CFO presentation helpers. Decisions and eligibility remain server-authoritative.
const number = (value) => { const result = Number(value); return Number.isFinite(result) ? result : 0; };
export const cfoNumber = number;
export const cfoChange = (item) => number(item?.estimated_total) - number(item?.category_manager_estimated_total);
export const cfoItemCounts = (items = []) => items.reduce((total, item) => {
  total.all += 1;
  if (item.cfo_review_status === 'CFO_ACCEPTED') total.accepted += 1;
  else if (item.cfo_review_status === 'NEEDS_MODIFICATION') total.needs += 1;
  else total.pending += 1;
  return total;
}, { all: 0, accepted: 0, needs: 0, pending: 0 });
export function buildCfoRows(responses = []) {
  return responses.flatMap(({ package: pkg }) => (pkg?.items || []).map(item => ({
    ...item,
    package_id: pkg.id,
    category_name: pkg.category_name,
    category_code: pkg.category_code,
    financial_year: pkg.financial_year,
    package_status: pkg.status,
    package_financial_year_status: pkg.financial_year_status,
  })));
}
export function filterCfoRows(rows = [], { search = '', category = 'ALL', status = 'ALL', expense = 'ALL' } = {}) {
  const term = search.trim().toLocaleLowerCase();
  return rows.filter(item => {
    if (category !== 'ALL' && String(item.category_code).toUpperCase() !== category) return false;
    if (expense !== 'ALL' && String(item.catalog_expense_type || '').toUpperCase() !== expense) return false;
    if (status === 'PENDING' && ['CFO_ACCEPTED','NEEDS_MODIFICATION'].includes(item.cfo_review_status)) return false;
    if (!['ALL','PENDING'].includes(status) && item.cfo_review_status !== status) return false;
    if (!term) return true;
    return [item.category_name,item.category_code,item.catalog_item_name,item.catalog_item_code,item.cfo_review_note,...(item.model_unit_prices || []).map(model=>model.name)]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(term));
  });
}
export function getCfoPackageEligibility(pkg, {canDecide = false, readOnly = false, finalized = false} = {}) {
  const items = pkg?.items || [];
  const counts = cfoItemCounts(items);
  const editable = canDecide && !readOnly && !finalized && pkg?.status === 'IN_CFO_REVIEW';
  return {
    counts,
    editable,
    canAcceptPending: editable && counts.pending > 0,
    canMarkPending: editable && counts.pending > 0,
    canMarkAll: editable && counts.pending > 0, // legacy name, now pending-only
    canReturn: editable && items.length > 0 && counts.pending === 0 && counts.needs > 0,
    canComplete: editable && items.length > 0 && counts.accepted === items.length,
    canReopen: canDecide && !readOnly && !finalized && pkg?.financial_year_status === 'OPEN' && pkg?.status === 'CFO_REVIEW_COMPLETED',
  };
}
export function buildCfoDepartments(responses = []) {
  const departments = new Map();
  for (const response of responses) {
    const pkg = response?.package;
    for (const dept of response?.departmentView?.departments || []) {
      const key = String(dept.department_id);
      const previous = departments.get(key) || {id:dept.department_id, name:dept.department_name, code:dept.department_code,
        items: [], itemCount:0, requested:0, approved:0, value:0, issues:0, categoryCount:0, categories: []};
      const items = (dept.items || []).map(item => {
        const packageItem = (pkg.items || []).find(entry => Number(entry.id) === Number(item.package_item_id));
        return {...item, package_id:pkg.id, category_name:pkg.category_name, category_code:pkg.category_code,
          catalog_expense_type: item.catalog_expense_type || item.expense_type || packageItem?.catalog_expense_type || null,
          catalog_item_name: item.catalog_item_name || packageItem?.catalog_item_name || 'Budget item',
          catalog_item_code: item.catalog_item_code || packageItem?.catalog_item_code || null,
          unit_name: item.unit_name || packageItem?.unit_name || null,
          unit_code: item.unit_code || packageItem?.unit_code || null,
          cfo_review_status: item.cfo_review_status || packageItem?.cfo_review_status || null};
      });
      const value = items.reduce((total, item) => total + (item.allocations || []).reduce((line, a) => line + number(a.allocated_quantity)*number(a.unit_price), 0),0);
      const issues = items.filter(item => item.reconciliation_status !== 'RECONCILED').length;
      previous.items.push(...items); previous.itemCount += items.length;
      previous.requested += number(dept.requested_quantity); previous.approved += number(dept.approved_quantity);
      previous.value += value; previous.issues += issues; previous.categoryCount += 1;
      previous.categories.push({name:pkg.category_name, code:pkg.category_code, packageId:pkg.id, items, value});
      departments.set(key,previous);
    }
  }
  return [...departments.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}

/** Apply department demand filters at item level so quantities and values
 * reflect the visible scope. A matching department name includes its items;
 * a matching item/model name includes only that item. */
export function filterCfoDepartmentItems(items = [], {category = 'ALL', expense = 'ALL', search = ''} = {}) {
  const term = String(search || '').trim().toLocaleLowerCase();
  return items.filter(item => {
    if (category !== 'ALL' && String(item.category_code || '').toUpperCase() !== String(category).toUpperCase()) return false;
    if (expense !== 'ALL' && String(item.catalog_expense_type || '').toUpperCase() !== String(expense).toUpperCase()) return false;
    if (!term) return true;
    return [item.catalog_item_name, item.catalog_item_code, item.category_name, item.category_code,
      ...(item.allocations || []).map(a => a.sub_item_name || a.model_name || a.name)]
      .some(v => String(v || '').toLocaleLowerCase().includes(term));
  });
}
export function filterCfoDepartments(departments = [], filters = {}) {
  // Retain the legacy string form for other existing CFO callers.
  const {category = 'ALL', expense = 'ALL', search = ''} =
    typeof filters === 'string' ? {category:filters} : filters;
  const term = String(search || '').trim().toLocaleLowerCase();
  return departments.flatMap(dept => {
    const departmentMatched = term && [dept.name, dept.code].some(v=>String(v || '').toLocaleLowerCase().includes(term));
    const items = filterCfoDepartmentItems(dept.items || [], {
      category, expense, search: departmentMatched ? '' : term,
    });
    if (!items.length) return [];
    const distinctCategories = new Map(items.map(i=>[String(i.category_code), {
      code:i.category_code, name:i.category_name, packageId:i.package_id,
    }]));
    return [{...dept, items, categories:[...distinctCategories.values()],
      categoryCount:distinctCategories.size, itemCount:items.length,
      requested:items.reduce((s,i)=>s+number(i.requested_quantity),0),
      approved:items.reduce((s,i)=>s+number(i.approved_quantity),0),
      value:items.reduce((s,i)=>s+(i.allocations||[]).reduce((t,a)=>t+number(a.allocated_quantity)*number(a.unit_price),0),0),
      issues:items.filter(i=>i.reconciliation_status!=='RECONCILED').length,
    }];
  });
}

/** Returns a single meaningful action without modifying server-authoritative eligibility. */
export function getCfoPackageNextAction(pkg, eligibility) {
  const counts = eligibility.counts;
  if (pkg?.status === 'CFO_REVIEW_COMPLETED') return {kind:'COMPLETED', label:'Review completed'};
  if (pkg?.status !== 'IN_CFO_REVIEW') return {kind:'VIEW_ITEMS', label:'View package items'};
  if (counts.pending > 0) return {kind:'REVIEW_PENDING', label:`${eligibility.editable?'Review':'View'} ${counts.pending} pending`};
  if (eligibility.canReturn) return {kind:'RETURN', label:'Return to CM'};
  if (eligibility.canComplete) return {kind:'COMPLETE', label:'Complete review'};
  return {kind:'VIEW_ITEMS', label:'View package items'};
}


/** The catalog's actual unit snapshot is the preferred source. Do not infer units
 * from an item name or display the redundant generic item code as its subtitle. */
export function cfoItemUnitExpense(item = {}) {
  const explicit = [item.unit_name, item.unit_of_measure_name, item.unit_code, item.unit_of_measure_code]
    .find(value => String(value ?? '').trim());
  const units = [...new Set((item.allocations || []).map(allocation =>
    String(allocation.unit_of_measure_name || allocation.unit_of_measure_code || '').trim()
  ).filter(Boolean))];
  const unit = String(explicit || (units.length > 1 ? 'Mixed units' : units[0] || 'Unit not specified')).trim();
  const expense = String(item.catalog_expense_type || item.expense_type || '').trim().toUpperCase();
  return expense ? `${unit} · ${expense}` : unit;
}

/** All summaries use the complete, unpaginated filtered dataset. Values are
 * Purchasing estimates for package items and allocation totals for departments. */
export function summarizeCfoItemScope(items = []) {
  const counts = cfoItemCounts(items);
  return {...counts, value:items.reduce((sum,item)=>sum+number(item.estimated_total),0)};
}
export function summarizeCfoDepartmentScope(departments = []) {
  return departments.reduce((summary,department) => ({
    departments:summary.departments+1,
    items:summary.items+number(department.itemCount),
    value:summary.value+number(department.value),
    approved:summary.approved+number(department.approved),
    issues:summary.issues+number(department.issues),
  }), {departments:0,items:0,value:0,approved:0,issues:0});
}
export function summarizeCfoCategoryScope(packages = []) {
  return packages.reduce((summary,pkg)=>({
    categories:summary.categories+1,
    value:summary.value+number(pkg.summary?.estimated_total),
    completed:summary.completed+(pkg.status==='CFO_REVIEW_COMPLETED'?1:0),
    inReview:summary.inReview+(pkg.status==='IN_CFO_REVIEW'?1:0),
    returned:summary.returned+(pkg.status==='RETURNED_BY_CFO'?1:0),
  }),{categories:0,value:0,completed:0,inReview:0,returned:0});
}
