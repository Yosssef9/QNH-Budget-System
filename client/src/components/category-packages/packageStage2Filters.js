// Read-only Stage 2 selectors. Never mutate the package items: drawers and
// readiness/submit APIs must continue to operate on the full package.
const quantity = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const positivePrice = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;

export function packagePriceStatus(item) {
  const models = item.model_unit_prices || [];
  if (!models.length) return "MISSING";
  const priced = models.filter((row) => positivePrice(row.category_manager_unit_price)).length;
  if (!priced) return "MISSING";
  return priced === models.length ? "PRICED" : "PARTIAL";
}

export function scopePackageItem(item, expenseType = "ALL", departmentId = "ALL") {
  const scoped = expenseType !== "ALL" || departmentId !== "ALL";
  const contributions = (item.expense_contributions || []).filter((row) =>
    (expenseType === "ALL" || row.expense_type === expenseType) &&
    (departmentId === "ALL" || String(row.department_id) === String(departmentId)),
  );
  if (scoped && !contributions.length) return null;
  const approved = scoped
    ? contributions.reduce((total, row) => total + quantity(row.approved_quantity), 0)
    : quantity(item.approved_quantity);
  const allocated = scoped
    ? contributions.reduce((total, row) => total + quantity(row.allocated_quantity), 0)
    : quantity(item.allocated_quantity);
  const departments = scoped
    ? new Set(contributions.map((row) => String(row.department_id))).size
    : quantity(item.department_count);
  const modelsPriced = packagePriceStatus(item) === "PRICED";
  // Scoped amounts are based on actual allocations at model-level prices, not
  // a misleading pro-rata portion of the full package model estimate.
  const allocatedValue = contributions.reduce((total, row) => total + quantity(row.estimated_allocated_value), 0);
  const missingPrices = contributions.some((row) => quantity(row.unpriced_allocations) > 0);
  const value = scoped
    ? (approved > 0 && (!modelsPriced || allocated <= 0 || missingPrices)
      ? null : allocatedValue)
    : (modelsPriced ? quantity(item.category_manager_estimated_total ?? item.estimated_total) : null);
  return {
    ...item,
    view_approved_quantity: approved,
    view_allocated_quantity: allocated,
    view_department_count: departments,
    view_estimated_value: value,
    view_scoped: scoped,
  };
}

export function matchesPreparationFilter(item, type, blockers = []) {
  const noModels = quantity(item.approved_quantity) > 0 && quantity(item.active_sub_item_count) === 0;
  const attention = item.reconciliation_status !== "RECONCILED" || blockers.length > 0;
  if (type === "NEEDS_MODIFICATION") return item.cfo_review_status === "NEEDS_MODIFICATION";
  if (type === "NEEDS_SETUP") return noModels;
  if (type === "NEEDS_ATTENTION") return attention;
  if (type === "RECONCILED") return item.reconciliation_status === "RECONCILED";
  return true;
}

export function filterStage2Items(items, options, blockersById = new Map()) {
  const query = String(options.search || "").trim().toLowerCase();
  return items
    .map((item) => scopePackageItem(item, options.expenseType, options.departmentId))
    .filter(Boolean)
    .filter((item) => {
      if (query && ![item.catalog_item_name, item.catalog_item_code, item.unit_name]
        .some((value) => String(value || "").toLowerCase().includes(query))) return false;
      if (options.priceStatus !== "ALL" && packagePriceStatus(item) !== options.priceStatus) return false;
      if (options.modelStatus === "NONE" && Number(item.active_sub_item_count) !== 0) return false;
      if (options.modelStatus === "ONE" && Number(item.active_sub_item_count) !== 1) return false;
      if (options.modelStatus === "MULTIPLE" && Number(item.active_sub_item_count) <= 1) return false;
      if (options.allocationStatus === "SHORT" && item.view_approved_quantity <= item.view_allocated_quantity) return false;
      if (options.allocationStatus === "EXCESS" && item.view_approved_quantity >= item.view_allocated_quantity) return false;
      if (options.allocationStatus === "FULL" && Math.abs(item.view_approved_quantity - item.view_allocated_quantity) > 0.0001) return false;
      return matchesPreparationFilter(item, options.status, blockersById.get(Number(item.id)) || []);
    })
    .sort((a, b) => {
      if (options.sortBy === "VALUE") return (b.view_estimated_value ?? -1) - (a.view_estimated_value ?? -1) || String(a.catalog_item_name).localeCompare(String(b.catalog_item_name));
      if (options.sortBy === "DEMAND") return b.view_approved_quantity - a.view_approved_quantity || String(a.catalog_item_name).localeCompare(String(b.catalog_item_name));
      if (options.sortBy === "DEPARTMENTS") return b.view_department_count - a.view_department_count || String(a.catalog_item_name).localeCompare(String(b.catalog_item_name));
      if (options.sortBy === "ATTENTION") {
        const aIssues = (blockersById.get(Number(a.id)) || []).length;
        const bIssues = (blockersById.get(Number(b.id)) || []).length;
        return bIssues - aIssues || String(a.catalog_item_name).localeCompare(String(b.catalog_item_name));
      }
      return String(a.catalog_item_name).localeCompare(String(b.catalog_item_name));
    });
}

export function filterStage2Departments(data, expenseType = "ALL") {
  if (!data || expenseType === "ALL") return data;
  const departments = (data.departments || []).map((department) => {
    const items = (department.items || []).filter((item) => item.expense_type === expenseType);
    if (!items.length) return null;
    const approved = items.reduce((n, row) => n + quantity(row.approved_quantity), 0);
    const allocated = items.reduce((n, row) => n + quantity(row.allocated_quantity), 0);
    const requested = items.reduce((n, row) => n + quantity(row.requested_quantity), 0);
    const issueCount = items.filter((row) => row.reconciliation_status !== "RECONCILED").length;
    return {
      ...department,
      items,
      item_count: items.length,
      requested_quantity: requested,
      approved_quantity: approved,
      allocated_quantity: allocated,
      remaining_quantity: approved - allocated,
      issue_count: issueCount,
      reconciliation_status: issueCount === 0 ? "RECONCILED" : approved > allocated ? "SHORT" : approved < allocated ? "EXCESS" : "NEEDS_RECONCILIATION",
    };
  }).filter(Boolean);
  const summary = departments.reduce((total, row) => ({
    department_count: total.department_count + 1,
    item_count: total.item_count + row.item_count,
    requested_quantity: total.requested_quantity + row.requested_quantity,
    approved_quantity: total.approved_quantity + row.approved_quantity,
    allocated_quantity: total.allocated_quantity + row.allocated_quantity,
    issue_count: total.issue_count + row.issue_count,
  }), { department_count: 0, item_count: 0, requested_quantity: 0, approved_quantity: 0, allocated_quantity: 0, issue_count: 0 });
  return { ...data, departments, summary };
}
