import { poolPromise } from "../config/db.js";

export async function getDashboardStatsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
   DECLARE @activeFinancialYearId INT;

SELECT TOP 1 @activeFinancialYearId = id
FROM BS_financial_years
WHERE status IN ('OPEN', 'PRE_CLOSING')
ORDER BY started_at DESC, id DESC;

    SELECT
      COUNT(*) AS total_budgets,
      SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending_budgets,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_budgets,
      SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) AS returned_budgets,
      SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_budgets
    FROM BS_budgets
    WHERE is_active = 1
      AND financial_year_id = @activeFinancialYearId;

    SELECT
      COUNT(DISTINCT department_id) AS departments_with_budgets
    FROM BS_budgets
    WHERE is_active = 1
      AND financial_year_id = @activeFinancialYearId;

    SELECT
      ISNULL(SUM(bi.total_amount), 0) AS approved_total_amount
    FROM BS_budgets b
    INNER JOIN BS_budget_items bi
      ON bi.budget_id = b.id
     AND bi.is_active = 1
    WHERE b.is_active = 1
      AND b.status = 'APPROVED'
      AND b.financial_year_id = @activeFinancialYearId;

    SELECT
      COUNT(*) AS pending_item_requests
    FROM BS_budget_item_requests
    WHERE status = 'PENDING';

    SELECT
      COUNT(*) AS system_users
    FROM BS_budget_user_roles
    WHERE is_active = 1;
  `);

  return {
    budgets: result.recordsets[0]?.[0] || {},
    departments: result.recordsets[1]?.[0] || {},
    approvedAmount: result.recordsets[2]?.[0] || {},
    itemRequests: result.recordsets[3]?.[0] || {},
    users: result.recordsets[4]?.[0] || {},
  };
}
