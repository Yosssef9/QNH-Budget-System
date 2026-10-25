/** Fixed SQL aliases only.  A model must be positively accepted for the
 * package's CURRENT Purchasing round, not merely free of a rejection. */
export function isPurchasingModelIncludedSql(subItemAlias = "subItem") {
  return `EXISTS (
    SELECT 1
    FROM dbo.BS_category_budget_package_sub_item_price_reviews AS acceptedReview
    INNER JOIN dbo.BS_category_budget_packages AS acceptedPkg
      ON acceptedPkg.id = acceptedReview.category_budget_package_id
     AND acceptedPkg.purchasing_review_round = acceptedReview.review_round
    WHERE acceptedReview.category_budget_package_sub_item_id = ${subItemAlias}.id
      AND acceptedReview.status = 'ACCEPTED'
  )`;
}

export function hasPurchasingEligibleModelSql(packageItemAlias = "packageItem") {
  return `EXISTS (
    SELECT 1 FROM dbo.BS_category_budget_package_sub_items AS eligibleSubItem
    WHERE eligibleSubItem.category_budget_package_item_id = ${packageItemAlias}.id
      AND eligibleSubItem.is_active = 1 AND eligibleSubItem.quantity > 0
      AND ${isPurchasingModelIncludedSql("eligibleSubItem")}
  )`;
}
