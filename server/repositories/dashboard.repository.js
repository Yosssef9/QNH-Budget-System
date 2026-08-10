import { poolPromise, sql } from "../config/db.js";

export async function getDashboardStatsRepo({
  budgetCategoryId = null,
  financialYearId = null,
} = {}) {
  const pool = await poolPromise;

  const request = pool.request();
  request.input("budgetCategoryId", sql.Int, budgetCategoryId);
  request.input("financialYearId", sql.Int, financialYearId);

  const result = await request.query(`
   DECLARE @activeFinancialYearId INT;

IF @financialYearId IS NOT NULL
BEGIN
  SELECT @activeFinancialYearId = id
  FROM dbo.BS_financial_years
  WHERE id = @financialYearId;
END
ELSE
BEGIN
  SELECT TOP 1 @activeFinancialYearId = id
  FROM dbo.BS_financial_years
  WHERE status IN ('OPEN', 'PRE_CLOSING')
  ORDER BY opened_at DESC, id DESC;
END;

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

SELECT
  COUNT(CASE WHEN dcb.status = 'IN_CATEGORY_REVIEW' THEN 1 END) AS pending_department_reviews,
  COALESCE(SUM(CASE
    WHEN dcb.status = 'IN_CATEGORY_REVIEW'
     AND item.is_active = 1
     AND item.review_status = 'PENDING_CATEGORY_REVIEW'
      THEN 1
    ELSE 0
  END), 0) AS pending_item_decisions,
  COUNT(CASE WHEN dcb.status = 'CATEGORY_REVIEW_COMPLETED' THEN 1 END) AS completed_department_reviews
FROM dbo.BS_department_category_budgets AS dcb
INNER JOIN dbo.BS_department_budgets AS db
  ON db.id = dcb.department_budget_id
LEFT JOIN dbo.BS_department_category_budget_items AS item
  ON item.department_category_budget_id = dcb.id
WHERE db.financial_year_id = @activeFinancialYearId
  AND (@budgetCategoryId IS NOT NULL AND dcb.budget_category_id = @budgetCategoryId);

SELECT TOP 1
  window.status,
  window.closed_at,
  window.close_reason,
  window.reopened_at,
  window.reopen_reason,
  category.name AS category_name,
  fy.year AS financial_year,
  COUNT(CASE WHEN dcb.status IN ('IN_CATEGORY_REVIEW', 'CATEGORY_REVIEW_COMPLETED') THEN 1 END)
    AS submitted_departments,
  COUNT(CASE WHEN dcb.status = 'DRAFT' THEN 1 END) AS not_submitted_departments
FROM dbo.BS_category_submission_windows AS window
INNER JOIN dbo.BS_financial_years AS fy
  ON fy.id = window.financial_year_id
INNER JOIN dbo.BS_budget_categories AS category
  ON category.id = window.budget_category_id
LEFT JOIN dbo.BS_department_budgets AS db
  ON db.financial_year_id = window.financial_year_id
LEFT JOIN dbo.BS_department_category_budgets AS dcb
  ON dcb.department_budget_id = db.id
 AND dcb.budget_category_id = window.budget_category_id
WHERE window.financial_year_id = @activeFinancialYearId
  AND (@budgetCategoryId IS NOT NULL AND window.budget_category_id = @budgetCategoryId)
GROUP BY
  window.status,
  window.closed_at,
  window.close_reason,
  window.reopened_at,
  window.reopen_reason,
  category.name,
  fy.year,
  window.id
ORDER BY window.id DESC;

SELECT TOP 1
  pkg.id,
  pkg.status,
  pkg.return_reason,
  pkg.returned_at,
  COUNT(CASE WHEN packageItem.is_active = 1 AND packageItem.needs_reconciliation = 1 THEN 1 END)
    AS items_needing_reconciliation,
  COUNT(CASE WHEN packageItem.is_active = 1 AND packageItem.cfo_review_status = 'NEEDS_MODIFICATION' THEN 1 END)
    AS items_needing_modification,
  COUNT(CASE WHEN packageItem.is_active = 1 THEN 1 END) AS package_items,
  COUNT(CASE WHEN packageItem.is_active = 1 AND packageItem.cfo_review_status = 'CFO_ACCEPTED' THEN 1 END)
    AS cfo_accepted_items
FROM dbo.BS_category_budget_packages AS pkg
LEFT JOIN dbo.BS_category_budget_package_items AS packageItem
  ON packageItem.category_budget_package_id = pkg.id
WHERE pkg.financial_year_id = @activeFinancialYearId
  AND (@budgetCategoryId IS NOT NULL AND pkg.budget_category_id = @budgetCategoryId)
GROUP BY
  pkg.id,
  pkg.status,
  pkg.return_reason,
  pkg.returned_at
ORDER BY pkg.id DESC;

SELECT
  (
    SELECT COUNT(1)
    FROM dbo.BS_budget_categories AS category
    WHERE category.is_active = 1
  ) AS total_category_packages,
  COUNT(DISTINCT CASE
    WHEN pkg.status IN ('IN_CFO_REVIEW', 'RETURNED_BY_CFO', 'CFO_REVIEW_COMPLETED')
      THEN pkg.budget_category_id
  END) AS submitted_category_packages,
  COUNT(DISTINCT CASE WHEN pkg.status = 'IN_CFO_REVIEW' THEN pkg.budget_category_id END)
    AS waiting_for_cfo_packages,
  COUNT(DISTINCT CASE WHEN pkg.status = 'RETURNED_BY_CFO' THEN pkg.budget_category_id END)
    AS returned_category_packages,
  COUNT(DISTINCT CASE WHEN pkg.status = 'CFO_REVIEW_COMPLETED' THEN pkg.budget_category_id END)
    AS completed_category_packages,
  COALESCE(SUM(CASE
    WHEN packageItem.is_active = 1
     AND packageItem.cfo_review_status = 'PENDING_CFO_REVIEW'
      THEN 1
    ELSE 0
  END), 0) AS pending_cfo_package_items
FROM dbo.BS_category_budget_packages AS pkg
LEFT JOIN dbo.BS_category_budget_package_items AS packageItem
  ON packageItem.category_budget_package_id = pkg.id
WHERE pkg.financial_year_id = @activeFinancialYearId;

SELECT
  (
    SELECT COUNT(1)
    FROM dbo.BS_budget_categories AS category
    WHERE category.is_active = 1
  ) AS total_category_packages,
  COUNT(DISTINCT CASE
    WHEN pkg.submitted_to_purchasing_at IS NOT NULL
      THEN pkg.budget_category_id
  END) AS submitted_category_packages,
  COUNT(DISTINCT CASE
    WHEN pkg.status = 'IN_PURCHASING_REVIEW'
      THEN pkg.budget_category_id
  END) AS waiting_for_purchasing_packages,
  COALESCE(SUM(CASE
    WHEN pkg.status = 'IN_PURCHASING_REVIEW'
     AND priceReview.status = 'PENDING'
      THEN 1
    ELSE 0
  END), 0) AS pending_price_reviews
FROM dbo.BS_category_budget_packages AS pkg
LEFT JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS priceReview
  ON priceReview.category_budget_package_id = pkg.id
 AND priceReview.review_round = pkg.purchasing_review_round
WHERE pkg.financial_year_id = @activeFinancialYearId;
  `);

  return {
    budgets: result.recordsets[0]?.[0] || {},
    departments: result.recordsets[1]?.[0] || {},
    approvedAmount: result.recordsets[2]?.[0] || {},
    itemRequests: result.recordsets[3]?.[0] || {},
    transferRequests: result.recordsets[4]?.[0] || {},
    poLinks: result.recordsets[5]?.[0] || {},
    users: result.recordsets[6]?.[0] || {},
    categoryManager: {
      departmentReviews: result.recordsets[7]?.[0] || {},
      submissionWindow: result.recordsets[8]?.[0] || {},
      packageAction: result.recordsets[9]?.[0] || {},
    },
    cfo: {
      packageReview: result.recordsets[10]?.[0] || {},
    },
    purchasing: {
      packageReview: result.recordsets[11]?.[0] || {},
    },
  };
}
