import { poolPromise } from "../config/db.js";

export async function getDashboardStatsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
   DECLARE @activeFinancialYearId INT;

SELECT TOP 1 @activeFinancialYearId = id
FROM dbo.BS_financial_years
WHERE status IN ('OPEN', 'PRE_CLOSING')
ORDER BY opened_at DESC, id DESC;

    SELECT
      COUNT(DISTINCT db.id) AS total_budgets,
      SUM(CASE WHEN dcb.status = 'IN_CATEGORY_REVIEW' THEN 1 ELSE 0 END) AS pending_budgets,
      SUM(CASE WHEN dcb.status = 'CATEGORY_REVIEW_COMPLETED' THEN 1 ELSE 0 END) AS approved_budgets,
      CAST(0 AS INT) AS returned_budgets,
      SUM(CASE WHEN dcb.status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_budgets
    FROM dbo.BS_department_budgets AS db
    LEFT JOIN dbo.BS_department_category_budgets AS dcb
      ON dcb.department_budget_id = db.id
    WHERE db.financial_year_id = @activeFinancialYearId;

    SELECT
      COUNT(DISTINCT db.department_id) AS departments_with_budgets
    FROM dbo.BS_department_budgets AS db
    INNER JOIN dbo.BS_departments AS dept
      ON dept.id = db.department_id
     AND dept.is_active = 1
    WHERE db.financial_year_id = @activeFinancialYearId;

    SELECT
      ISNULL(SUM(allocation.allocated_quantity * ISNULL(subItem.unit_price, 0)), 0) AS approved_total_amount
    FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
    INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
      ON subItem.id = allocation.category_budget_package_sub_item_id
     AND subItem.is_active = 1
    INNER JOIN dbo.BS_category_budget_package_items AS packageItem
      ON packageItem.id = subItem.category_budget_package_item_id
     AND packageItem.is_active = 1
    INNER JOIN dbo.BS_category_budget_packages AS pkg
      ON pkg.id = packageItem.category_budget_package_id
    WHERE pkg.financial_year_id = @activeFinancialYearId;

   SELECT
  COUNT(*) AS pending_item_requests
FROM dbo.BS_budget_item_requests
WHERE status = 'PENDING';

SELECT
  COUNT(*) AS pending_transfer_requests
FROM dbo.BS_category_budget_transfers
WHERE status = 'PENDING_APPROVAL';

SELECT
  COUNT(*) AS pending_po_links
FROM dbo.BS_category_po_links
WHERE status = 'PENDING';

SELECT
  COUNT(*) AS system_users
FROM dbo.BS_budget_user_roles
WHERE is_active = 1;
  `);

  return {
    budgets: result.recordsets[0]?.[0] || {},
    departments: result.recordsets[1]?.[0] || {},
    approvedAmount: result.recordsets[2]?.[0] || {},
    itemRequests: result.recordsets[3]?.[0] || {},
    transferRequests: result.recordsets[4]?.[0] || {},
    poLinks: result.recordsets[5]?.[0] || {},
    users: result.recordsets[6]?.[0] || {},
  };
}
