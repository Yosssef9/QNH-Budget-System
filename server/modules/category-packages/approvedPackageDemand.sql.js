/**
 * SQL predicate for an item that has at least one completed department review
 * with positive approved demand in this package's year/category.
 *
 * Correlate only to an internal, trusted SQL alias (never user-provided text).
 * Retain rejected requests (approved = 0) in department/category history;
 * they are not Purchasing/CFO work items.
 */
export function hasPositiveApprovedPackageDemandSql(packageItemAlias = "packageItem") {
  return `EXISTS (
    SELECT 1
    FROM dbo.BS_category_budget_packages AS approvedPkg
    INNER JOIN dbo.BS_department_budgets AS approvedDb
      ON approvedDb.financial_year_id = approvedPkg.financial_year_id
    INNER JOIN dbo.BS_department_category_budgets AS approvedCb
      ON approvedCb.department_budget_id = approvedDb.id
     AND approvedCb.budget_category_id = approvedPkg.budget_category_id
     AND approvedCb.status = 'CATEGORY_REVIEW_COMPLETED'
    INNER JOIN dbo.BS_department_category_budget_items AS approvedItem
      ON approvedItem.department_category_budget_id = approvedCb.id
     AND approvedItem.catalog_item_id = ${packageItemAlias}.catalog_item_id
     AND approvedItem.is_active = 1
     AND approvedItem.review_status = 'CATEGORY_REVIEW_COMPLETED'
     AND approvedItem.category_approved_quantity > 0
    WHERE approvedPkg.id = ${packageItemAlias}.category_budget_package_id
  )`;
}
