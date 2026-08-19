export function mapDepartment(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    department_code: row.department_code,
    description: row.description,
    is_active: Boolean(row.is_active),
    active_user_role_count: Number(row.active_user_role_count || 0),
    budget_count: Number(row.budget_count || 0),
    created_by: row.created_by,
    created_by_name: row.created_by_name,
    created_at: row.created_at,
    updated_by: row.updated_by,
    updated_by_name: row.updated_by_name,
    updated_at: row.updated_at,
  };
}

export function mapDepartmentProvisioning(provisioning) {
  if (!provisioning) return null;

  return {
    financial_year_id: provisioning.financialYearId,
    financial_year: provisioning.financialYear,
    department_budget_id: provisioning.departmentBudgetId,
    category_budget_count: provisioning.categoryBudgetCount,
  };
}
