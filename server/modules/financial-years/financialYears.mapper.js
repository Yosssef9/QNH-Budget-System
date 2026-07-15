export function mapFinancialYear(row) {
  if (!row) return null;

  return {
    id: row.id,
    year: row.year,
    status: row.status,
    opened_by: row.opened_by,
    opened_by_name: row.opened_by_name ?? null,
    opened_at: row.opened_at,
    started_by: row.opened_by,
    started_by_name: row.opened_by_name ?? null,
    started_at: row.opened_at,
    pre_closed_by: row.pre_closed_by,
    pre_closed_by_name: row.pre_closed_by_name ?? null,
    pre_closed_at: row.pre_closed_at,
    closed_by: row.closed_by,
    closed_by_name: row.closed_by_name ?? null,
    closed_at: row.closed_at,
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at ?? null,
    row_version: row.row_version ?? null,
    department_budget_count: Number(row.department_budget_count || 0),
    department_category_budget_count: Number(
      row.department_category_budget_count || 0,
    ),
    submission_window_count: Number(row.submission_window_count || 0),
    category_package_count: Number(row.category_package_count || 0),
  };
}

export function mapInitializationSummary(summary = {}) {
  return {
    departments: Number(summary.departments || 0),
    categories: Number(summary.categories || 0),
    department_budgets: Number(summary.departmentBudgets || 0),
    department_category_budgets: Number(
      summary.departmentCategoryBudgets || 0,
    ),
    category_submission_windows: Number(summary.submissionWindows || 0),
    category_budget_packages: Number(summary.categoryPackages || 0),
  };
}
