/** CFO exports: map exactly the current table projection, not a separate SQL
 * calculation. Comparison baselines are the snapshots used by the UI. */
import { cfoChange, cfoItemCounts, cfoNumber } from './cfoTableSelectors.js';

const num = value => value == null || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const sum = (rows, key) => rows.reduce((total, row) => total + (num(row[key]) || 0), 0);
const status = value => String(value || 'PENDING_CFO_REVIEW').replaceAll('_', ' ');
const sumValue = (items = []) => items.reduce((total, item) => total + cfoNumber(item.estimated_total), 0);
const column = (key, label, type = 'text', width = 20) => ({ key, label, type, width });

export function buildCfoItemsExcel(rows = [], comparisonsByPackage = {}) {
  const data = rows.map(item => {
    const comparison = comparisonsByPackage[item.package_id]?.itemsById?.[item.id];
    const models = item.model_unit_prices || [];
    const single = comparison?.models?.length === 1 ? comparison.models[0] : null;
    return {
      category: item.category_name,
      item: item.catalog_item_name,
      expense: item.catalog_expense_type,
      requested: num(item.requested_quantity),
      approved: num(item.approved_quantity),
      models: num(item.active_sub_item_count),
      cmValue: num(item.category_manager_estimated_total),
      purchasingValue: num(item.estimated_total),
      purchasingDelta: item.category_manager_estimated_total == null ? null : cfoChange(item),
      previousValue: num(comparison?.previous_total),
      currentValue: num(comparison?.current_total),
      changeAmount: num(comparison?.change_amount),
      changePercent: comparison?.change_percent == null ? null : num(comparison.change_percent) / 100,
      previousQuantity: num(comparison?.previous_quantity),
      currentQuantity: num(comparison?.current_quantity),
      quantityPercent: comparison?.quantity_percent == null ? null : num(comparison.quantity_percent) / 100,
      previousPrice: num(single?.previous_price),
      currentPrice: num(single?.current_price),
      pricePercent: single?.price_percent == null ? null : num(single.price_percent) / 100,
      modelNames: models.map(model => model.name).filter(Boolean).join(', '),
      cfoStatus: status(item.cfo_review_status),
      instruction: item.cfo_review_note || '',
    };
  });
  return {
    title: 'CFO Budget Review — By Item / Active Review',
    columns: [
      column('category','Category','text',22),column('item','Item','text',38),column('expense','Expense Type','text',16),
      column('requested','Requested Qty','quantity',16),column('approved','CM Approved Qty','quantity',19),
      column('models','Models','quantity',12),column('modelNames','Model names','text',42),
      column('cmValue','CM Value','currency',20),column('purchasingValue','Purchasing Eligible Value','currency',26),
      column('purchasingDelta','Purchasing vs CM (SAR)','currency',23),
      column('previousValue','Previous CFO Value','currency',24),column('currentValue','Current CFO Value','currency',24),
      column('changeAmount','Since Last Review (SAR)','currency',25),column('changePercent','Since Last Review (%)','percent',23),
      column('previousQuantity','Previous Qty','quantity',16),column('currentQuantity','Current Qty','quantity',16),
      column('quantityPercent','Qty Change (%)','percent',17),
      column('previousPrice','Previous Unit Price (1 model)','currency',28),column('currentPrice','Current Unit Price (1 model)','currency',28),
      column('pricePercent','Price Change (%) (1 model)','percent',28),
      column('cfoStatus','CFO Status','text',24),column('instruction','CFO Instruction','text',56),
    ],
    rows: data,
    totals: {
      requested: sum(data,'requested'), approved:sum(data,'approved'),
      cmValue:sum(data,'cmValue'), purchasingValue:sum(data,'purchasingValue'), purchasingDelta:sum(data,'purchasingDelta'),
    },
  };
}

export function buildCfoDepartmentsExcel(departments = []) {
  const data = departments.map(dep => ({
    department:dep.name, categories:num(dep.categoryCount),items:num(dep.itemCount),
    requested:num(dep.requested),approved:num(dep.approved),allocatedValue:num(dep.value),issues:num(dep.issues),
  }));
  return {
    title:'CFO Budget Review — By Department',
    columns:[column('department','Department','text',42),column('categories','Categories','quantity',18),
      column('items','Items','quantity',16),column('requested','Requested Qty','quantity',21),
      column('approved','Approved Qty','quantity',20),column('allocatedValue','Allocated Value','currency',26),
      column('issues','Allocation Issues','quantity',22)],
    rows:data,
    totals:{items:sum(data,'items'),requested:sum(data,'requested'),approved:sum(data,'approved'),allocatedValue:sum(data,'allocatedValue'),issues:sum(data,'issues')},
  };
}

export function buildCfoCategoriesExcel(packages = [], comparisonsByPackage = {}) {
  const data = packages.map(pkg => {
    const counts = cfoItemCounts(pkg.items || []);
    const comparison = comparisonsByPackage[pkg.id]?.category;
    return {
      category:pkg.category_name, items:counts.all, accepted:counts.accepted,
      pending:counts.pending, needs:counts.needs, value:sumValue(pkg.items),
      previous: num(comparison?.previous_total),current:num(comparison?.current_total),
      difference:num(comparison?.change_amount),percent:comparison?.change_percent == null ? null : num(comparison.change_percent) / 100,
      status:status(pkg.status),
    };
  });
  return {
    title:'CFO Budget Review — By Category',
    columns:[column('category','Category','text',35),column('items','Items','quantity',13),
      column('accepted','CFO Accepted','quantity',18),column('pending','Pending CFO','quantity',17),
      column('needs','Needs Modification','quantity',23),column('value','Purchasing Eligible Value','currency',26),
      column('previous','Previous CFO Review','currency',26),column('current','Current CFO Review','currency',26),
      column('difference','Since Last Review (SAR)','currency',26),column('percent','Since Last Review (%)','percent',24),
      column('status','Package Status','text',28)],
    rows:data,
    totals:{items:sum(data,'items'),accepted:sum(data,'accepted'),pending:sum(data,'pending'),needs:sum(data,'needs'),value:sum(data,'value')},
  };
}

export function buildCfoExclusionsExcel(groups = []) {
  const data = groups.map(group => ({
    category:group.categoryName,item:group.itemName,model:group.modelName || '',
    decision:group.exclusionType === 'CM_ZERO' ? 'CM Approved 0' : 'Purchasing Rejected',
    scope:group.exclusionType === 'CM_ZERO' ? 'Department request excluded' : group.itemExclusionScope === 'ALL_MODELS' ? 'All models rejected' : `${group.rejectedModelCount ?? 1} of ${group.activeModelCount ?? '?'} models rejected`,
    affectedDepartments:group.departments.length,
    departments:group.departments.map(d => `${d.name} (${d.excludedQuantity})`).join(' | '),
    excludedQuantity:num(group.excludedQuantity),excludedAmount:num(group.excludedAmount),
    round:num(group.reviewRound),
    reasons: [...new Set(group.decisions.map(d=>d.reason).filter(Boolean))].join(' | '),
    reviewer: group.latestDecision?.actorName || '',
    reviewerCode:group.latestDecision?.actorCode || '',
    decisionDate:group.latestDecision?.decidedAt ? String(group.latestDecision.decidedAt) : '',
  }));
  return {
    title:'CFO Budget Review — Excluded Items',
    columns:[column('category','Category','text',27),column('item','Item','text',40),column('model','Rejected Model','text',38),
      column('decision','Decision','text',25),column('scope','Exclusion Scope','text',28),
      column('affectedDepartments','Affected Departments','quantity',24),column('departments','Department Qty Breakdown','text',65),
      column('excludedQuantity','Excluded Quantity','quantity',23),column('excludedAmount','Excluded Value','currency',24),
      column('round','Purchasing Round','quantity',19),column('reasons','Decision Reason(s)','text',65),
      column('reviewer','Decision By','text',27),column('reviewerCode','Reviewer Code','text',20),
      column('decisionDate','Decision Date','text',26)],
    rows:data,
    totals:{excludedQuantity:sum(data,'excludedQuantity'),excludedAmount:sum(data,'excludedAmount')},
  };
}
