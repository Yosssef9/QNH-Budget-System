// Read-only Stage 2 selectors. Never mutate the package items: drawers and
// readiness/submit APIs must continue to operate on the full package.
const quantity = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const positivePrice = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;

export function packagePriceStatus(item) {
  // Pricing is not required for rejected demand or unused models.
  const hasPendingReview = quantity(item.pending_review_count) > 0;
  // Only a confirmed zero approval makes pricing unnecessary; an incomplete
  // response must not be mistaken for a reviewed-and-rejected request.
  if (item.approved_quantity != null && quantity(item.approved_quantity) <= 0 && !hasPendingReview) return "NOT_REQUIRED";
  // A draft price can be entered before Stage 1 completes; there is no
  // allocated model quantity yet, so inspect the proposed model prices.
  const models = (item.model_unit_prices || []).filter((row) =>
    row.quantity == null || quantity(row.quantity) > 0 ||
    (hasPendingReview && quantity(item.approved_quantity) <= 0),
  );
  if (!models.length) return "MISSING";
  const priced = models.filter((row) => positivePrice(row.category_manager_unit_price)).length;
  if (!priced) return "MISSING";
  return priced === models.length ? "PRICED" : "PARTIAL";
}

// Expense type is a property of the catalog item, even before any department
// requests have reached Category Manager approval. Completed department review
// contributions take precedence whenever they exist (mixed CAPEX/OPEX demand
// can belong to one consolidated package item).
const normalizedExpense = (value) => String(value || "").trim().toUpperCase();

export function scopePackageItem(item, expenseType = "ALL", departmentId = "ALL") {
  const selectedExpense = normalizedExpense(expenseType) || "ALL";
  const catalogExpense = normalizedExpense(item.catalog_expense_type);
  const allContributions = Array.isArray(item.expense_contributions)
    ? item.expense_contributions
    : [];
  const scoped = selectedExpense !== "ALL" || departmentId !== "ALL";
  const contributions = allContributions.filter((row) =>
    (selectedExpense === "ALL" || normalizedExpense(row.expense_type) === selectedExpense) &&
    (departmentId === "ALL" || String(row.department_id) === String(departmentId)),
  );

  // If demand has not been approved yet, package items still need a working
  // CAPEX/OPEX filter. Use their catalog classification ONLY when there are no
  // contribution rows and no approved demand; never fabricate a department.
  const awaitingApproval = allContributions.length === 0 && quantity(item.approved_quantity) === 0;
  const matchesCatalogOnly = awaitingApproval && departmentId === "ALL" &&
    selectedExpense !== "ALL" && catalogExpense === selectedExpense;
  if (scoped && contributions.length === 0 && !matchesCatalogOnly) return null;

  const approved = scoped
    ? contributions.reduce((total, row) => total + quantity(row.approved_quantity), 0)
    : quantity(item.approved_quantity);
  const requested = scoped
    ? contributions.reduce((total, row) => total + quantity(row.requested_quantity), 0)
    : quantity(item.requested_quantity);
  const pendingReviews = scoped
    ? contributions.filter((row) => row.item_review_status !== "CATEGORY_REVIEW_COMPLETED" ||
        row.department_review_status !== "CATEGORY_REVIEW_COMPLETED").length
    : quantity(item.pending_review_count);
  const reviewedRequests = scoped
    ? contributions.length - pendingReviews
    : quantity(item.reviewed_request_count);
  const allocated = scoped
    ? contributions.reduce((total, row) => total + quantity(row.allocated_quantity), 0)
    : quantity(item.allocated_quantity);
  const departments = scoped
    ? new Set(contributions.map((row) => String(row.department_id))).size
    : quantity(item.department_count);
  const modelsPriced = ["PRICED", "NOT_REQUIRED"].includes(packagePriceStatus(item));
  const allocatedValue = contributions.reduce((total, row) => total + quantity(row.estimated_allocated_value), 0);
  const missingPrices = contributions.some((row) => quantity(row.unpriced_allocations) > 0);
  const value = approved <= 0
    ? 0
    : scoped
      ? (!modelsPriced || allocated <= 0 || missingPrices ? null : allocatedValue)
      : (modelsPriced ? quantity(item.category_manager_estimated_total ?? item.estimated_total) : null);
  const contributionTypes = [...new Set(allContributions
    .map((row) => normalizedExpense(row.expense_type)).filter(Boolean))];
  return {
    ...item,
    view_approved_quantity: approved,
    view_requested_quantity: requested,
    view_pending_review_count: pendingReviews,
    view_reviewed_request_count: reviewedRequests,
    view_review_status: pendingReviews > 0 ? "PENDING" : "REVIEWED",
    view_allocated_quantity: allocated,
    view_department_count: departments,
    view_estimated_value: value,
    view_expense_type: selectedExpense !== "ALL" ? selectedExpense :
      contributionTypes.length > 1 ? "MIXED" : (contributionTypes[0] || catalogExpense || "UNCLASSIFIED"),
    view_catalog_fallback: matchesCatalogOnly,
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

// Sort on the complete filtered collection; the workbench paginates afterward.
// A package with multiple models has no single displayed unit price, so those
// rows (and unpriced values) are always last in both sort directions.
function stage2UnitPrice(item) {
  const models = item.model_unit_prices || [];
  if (models.length !== 1 || !positivePrice(models[0].category_manager_unit_price)) return null;
  return Number(models[0].category_manager_unit_price);
}

function compareNullableNumbers(a, b, direction) {
  const aMissing = a === null || a === undefined || !Number.isFinite(Number(a));
  const bMissing = b === null || b === undefined || !Number.isFinite(Number(b));
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  if (aMissing) return 0;
  return (Number(a) - Number(b)) * direction;
}

export function compareStage2Items(a, b, column = "NAME", direction = "asc", blockersById = new Map()) {
  const factor = direction === "desc" ? -1 : 1;
  const nameDiff = String(a.catalog_item_name || "").localeCompare(String(b.catalog_item_name || ""), undefined, { sensitivity: "base" });
  let result = 0;
  switch (column) {
    case "DEMAND": result = compareNullableNumbers(a.view_approved_quantity, b.view_approved_quantity, factor); break;
    case "DEPARTMENTS": result = compareNullableNumbers(a.view_department_count, b.view_department_count, factor); break;
    case "MODELS": result = compareNullableNumbers(a.active_sub_item_count ?? 0, b.active_sub_item_count ?? 0, factor); break;
    case "UNIT_PRICE": result = compareNullableNumbers(stage2UnitPrice(a), stage2UnitPrice(b), factor); break;
    case "VALUE": result = compareNullableNumbers(a.view_estimated_value, b.view_estimated_value, factor); break;
    case "RECONCILIATION": result = String(a.reconciliation_status || "").localeCompare(String(b.reconciliation_status || "")) * factor; break;
    case "ATTENTION": result = compareNullableNumbers((blockersById.get(Number(a.id)) || []).length, (blockersById.get(Number(b.id)) || []).length, factor); break;
    default: return nameDiff * factor || Number(a.id || 0) - Number(b.id || 0);
  }
  return result || nameDiff || Number(a.id || 0) - Number(b.id || 0);
}

export function filterStage2Items(items, options, blockersById = new Map()) {
  const query = String(options.search || "").trim().toLowerCase();
  return items
    .map((item) => scopePackageItem(item, options.expenseType, options.departmentId))
    .filter(Boolean)
    .filter((item) => {
      if (query && ![item.catalog_item_name, item.catalog_item_code, item.unit_name]
        .some((value) => String(value || "").toLowerCase().includes(query))) return false;
      if (options.reviewStatus === "PENDING" && item.view_pending_review_count === 0) return false;
      if (options.reviewStatus === "REVIEWED" &&
          (item.view_pending_review_count > 0 || item.view_reviewed_request_count === 0)) return false;
      if (options.priceStatus !== "ALL" && packagePriceStatus(item) !== options.priceStatus) return false;
      if (options.modelStatus === "NONE" && Number(item.active_sub_item_count) !== 0) return false;
      if (options.modelStatus === "ONE" && Number(item.active_sub_item_count) !== 1) return false;
      if (options.modelStatus === "MULTIPLE" && Number(item.active_sub_item_count) <= 1) return false;
      if (options.allocationStatus === "SHORT" && item.view_approved_quantity <= item.view_allocated_quantity) return false;
      if (options.allocationStatus === "EXCESS" && item.view_approved_quantity >= item.view_allocated_quantity) return false;
      if (options.allocationStatus === "FULL" && Math.abs(item.view_approved_quantity - item.view_allocated_quantity) > 0.0001) return false;
      return matchesPreparationFilter(item, options.status, blockersById.get(Number(item.id)) || []);
    })
    .sort((a, b) => compareStage2Items(a, b, options.sortBy || "NAME",
      options.sortDirection || (options.sortBy && options.sortBy !== "NAME" ? "desc" : "asc"), blockersById));
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

