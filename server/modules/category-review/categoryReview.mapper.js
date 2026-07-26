function mapRowVersion(rowVersion) {
  if (!rowVersion) return null;

  if (Buffer.isBuffer(rowVersion)) {
    return rowVersion.toString("base64");
  }

  return String(rowVersion);
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function mapDistribution(row) {
  return {
    id: row.distribution_id,
    period_type: row.period_type,
    period_no: Number(row.period_no),
    quantity: toNumber(row.distribution_quantity),
  };
}

function getReopenReviewBlockReason(budget) {
  if (budget.status !== "CATEGORY_REVIEW_COMPLETED") {
    return null;
  }

  if (budget.financial_year_status !== "OPEN") {
    return "FINANCIAL_YEAR_NOT_OPEN";
  }

  if (!budget.category_package_id) {
    return "CATEGORY_PACKAGE_NOT_FOUND";
  }

  if (
    budget.category_package_status !== "DRAFT" ||
    budget.submitted_to_cfo_at
  ) {
    return "CATEGORY_PACKAGE_ALREADY_SUBMITTED_TO_CFO";
  }

  return null;
}

export function mapReviewQueue({ rows = [], window = null, coverage = null } = {}) {
  const budgets = rows.map((row) => ({
    id: row.department_category_budget_id,
    department_category_budget_id: row.department_category_budget_id,
    department_budget_id: row.department_budget_id,
    department_id: row.department_id,
    department_name: row.department_name,
    department_code: row.department_code || null,

    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,

    category_id: row.budget_category_id,
    category_code: row.category_code,
    category_name: row.category_name,

    status: row.status,

    submitted_by: row.submitted_by,
    submitted_by_name: row.submitted_by_name || null,
    submitted_at: row.submitted_at,

    returned_at: row.returned_at,
    return_reason: row.return_reason || null,

    item_count: Number(row.item_count || 0),
    pending_count: Number(row.pending_count || 0),
    reviewed_count: Number(row.reviewed_count || 0),

    total_requested_quantity: toNumber(row.total_requested_quantity),
    total_approved_quantity: toNumber(row.total_approved_quantity),

    row_version: mapRowVersion(row.row_version),
  }));

  const summary = budgets.reduce(
    (accumulator, budget) => {
      accumulator.departmentsSubmitted +=
        budget.status === "IN_CATEGORY_REVIEW" ? 1 : 0;

      accumulator.departmentsCompleted +=
        budget.status === "CATEGORY_REVIEW_COMPLETED" ? 1 : 0;

      accumulator.itemsPending += budget.pending_count;
      accumulator.itemsReviewed += budget.reviewed_count;

      accumulator.totalRequestedQuantity += budget.total_requested_quantity;

      accumulator.totalApprovedQuantity += budget.total_approved_quantity;

      return accumulator;
    },
    {
      departmentsSubmitted: 0,
      departmentsCompleted: 0,
      itemsPending: 0,
      itemsReviewed: 0,
      totalRequestedQuantity: 0,
      totalApprovedQuantity: 0,
    },
  );

  return {
    summary,
    coverage: {
      totalDepartments: Number(coverage?.total_department_count || 0),
      submittedDepartments: Number(
        coverage?.submitted_department_count ||
          summary.departmentsSubmitted + summary.departmentsCompleted,
      ),
      notSubmittedDepartments: Number(
        coverage?.not_submitted_department_count || 0,
      ),
      inReviewDepartments: Number(
        coverage?.in_review_department_count || summary.departmentsSubmitted,
      ),
      completedDepartments: Number(
        coverage?.completed_department_count || summary.departmentsCompleted,
      ),
    },

    submissionWindow: window
      ? {
          id: window.id,
          financial_year_id: window.financial_year_id,
          category_id: window.budget_category_id,
          status: window.status,

          closed_by: window.closed_by,
          closed_by_name: window.closed_by_name || null,
          closed_at: window.closed_at,
          close_reason: window.close_reason || null,

          reopened_by: window.reopened_by,
          reopened_by_name: window.reopened_by_name || null,
          reopened_at: window.reopened_at,
          reopen_reason: window.reopen_reason || null,

          financial_year: window.financial_year,
          financial_year_status: window.financial_year_status,

          category_name: window.category_name,
          category_code: window.category_code,

          row_version: mapRowVersion(window.row_version),
        }
      : null,

    budgets,
  };
}

export function mapCategoryReviewDetail({ budget, itemRows = [] }) {
  if (!budget) return null;

  const itemMap = new Map();

  for (const row of itemRows) {
    if (!row.item_id) continue;

    const itemId = Number(row.item_id);

    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        id: row.item_id,
        department_category_budget_id: row.department_category_budget_id,

        catalog_item_id: row.catalog_item_id,
        catalog_item_name: row.catalog_item_name,
        catalog_item_code: row.catalog_item_code || null,
        item_code: row.catalog_item_code || null,
        expense_type: row.expense_type,

        unit_of_measure_id: row.unit_of_measure_id,
        unit_name: row.unit_name || null,
        unit_code: row.unit_code || null,

        requested_quantity: toNumber(row.requested_quantity),
        hod_item_note: row.hod_item_note || null,
        hodItemNote: row.hod_item_note || null,

        category_approved_quantity:
          row.category_approved_quantity === null ||
          row.category_approved_quantity === undefined
            ? null
            : toNumber(row.category_approved_quantity),

        distribution_method: row.distribution_method,

        review_status: row.review_status,
        review_note: row.review_note || null,

        reviewed_by: row.reviewed_by || null,
        reviewed_by_name: row.reviewed_by_name || null,
        reviewed_at: row.reviewed_at || null,

        package_item_id: row.package_item_id ?? null,
        package_item_cfo_review_status:
          row.package_item_cfo_review_status || null,
        package_item_cfo_review_note:
          row.package_item_cfo_review_note || null,
        package_item_cfo_reviewed_by:
          row.package_item_cfo_reviewed_by ?? null,
        package_item_cfo_reviewed_by_name:
          row.package_item_cfo_reviewed_by_name || null,
        package_item_cfo_reviewed_at:
          row.package_item_cfo_reviewed_at || null,

        is_active: row.is_active === true || row.is_active === 1,

        row_version: mapRowVersion(row.item_row_version),

        distribution: [],
      });
    }

    if (row.distribution_id) {
      itemMap.get(itemId).distribution.push(mapDistribution(row));
    }
  }

  const items = Array.from(itemMap.values());

  const reopenReviewBlockReason = getReopenReviewBlockReason(budget);

  const canReopenReview =
    budget.status === "CATEGORY_REVIEW_COMPLETED" &&
    reopenReviewBlockReason === null;

  return {
    id: budget.id,
    department_category_budget_id: budget.id,
    department_budget_id: budget.department_budget_id,

    department_id: budget.department_id,
    department_name: budget.department_name,
    department_code: budget.department_code || null,

    financial_year_id: budget.financial_year_id,
    financial_year: budget.financial_year,
    financial_year_status: budget.financial_year_status,

    category_id: budget.budget_category_id,
    category_code: budget.category_code,
    category_name: budget.category_name,

    status: budget.status,

    submitted_by: budget.submitted_by ?? null,
    submitted_by_name: budget.submitted_by_name || null,
    submitted_at: budget.submitted_at || null,

    returned_by: budget.returned_by ?? null,
    returned_by_name: budget.returned_by_name || null,
    returned_at: budget.returned_at || null,
    return_reason: budget.return_reason || null,

    category_review_completed_by: budget.category_review_completed_by ?? null,

    category_review_completed_by_name:
      budget.category_review_completed_by_name || null,

    category_review_completed_at: budget.category_review_completed_at || null,

    category_package_id: budget.category_package_id ?? null,

    category_package_status: budget.category_package_status || null,

    submitted_to_cfo_by: budget.submitted_to_cfo_by ?? null,

    submitted_to_cfo_by_name: budget.submitted_to_cfo_by_name || null,

    submitted_to_cfo_at: budget.submitted_to_cfo_at || null,

    package_returned_by_cfo: budget.package_returned_by_cfo ?? null,

    package_returned_by_cfo_name:
      budget.package_returned_by_cfo_name || null,

    package_returned_at: budget.package_returned_at || null,

    package_return_reason: budget.package_return_reason || null,

    category_package_row_version: mapRowVersion(
      budget.category_package_row_version,
    ),

    can_reopen_review: canReopenReview,

    reopen_review_block_reason: reopenReviewBlockReason,

    row_version: mapRowVersion(budget.row_version),

    items,

    summary: {
      item_count: items.length,

      pending_count: items.filter(
        (item) => item.review_status === "PENDING_CATEGORY_REVIEW",
      ).length,

      reviewed_count: items.filter(
        (item) => item.review_status === "CATEGORY_REVIEW_COMPLETED",
      ).length,

      total_requested_quantity: items.reduce(
        (sum, item) => sum + item.requested_quantity,
        0,
      ),

      total_approved_quantity: items.reduce(
        (sum, item) =>
          sum +
          (item.category_approved_quantity === null
            ? 0
            : item.category_approved_quantity),
        0,
      ),
    },
  };
}
