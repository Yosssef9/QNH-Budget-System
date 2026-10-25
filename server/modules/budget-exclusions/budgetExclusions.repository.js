import { poolPromise, sql } from "../../config/db.js";

/** Shared, server-scoped read model. Never accepts client-provided department/category scope. */
export async function listBudgetExclusionsRepo({ financialYearId, departmentId, categoryId, includeDraftPurchasing }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input("financialYearId", sql.Int, financialYearId)
    .input("departmentId", sql.Int, departmentId)
    .input("categoryId", sql.Int, categoryId)
    .input("includeDraftPurchasing", sql.Bit, includeDraftPurchasing).query(`
      SELECT
        'CM_ZERO' AS exclusion_type,
        item.id AS decision_entity_id,
        CAST(NULL AS BIGINT) AS package_sub_item_id,
        CAST(NULL AS INT) AS active_model_count,
        CAST(NULL AS INT) AS rejected_model_count,
        item.catalog_item_id,
        db.financial_year_id,
        dcb.budget_category_id,
        cat.name AS category_name,
        db.department_id,
        dept.name AS department_name,
        COALESCE(item.catalog_item_name_snapshot, catalog.name) AS item_name,
        CAST(NULL AS NVARCHAR(300)) AS model_name,
        CAST(item.requested_quantity AS DECIMAL(18,4)) AS requested_quantity,
        CAST(item.requested_quantity AS DECIMAL(18,4)) AS excluded_quantity,
        CAST(0 AS DECIMAL(18,4)) AS excluded_amount,
        'Category Manager' AS decision_source,
        reviewer.USER_NAME AS actor_name,
        reviewer.USER_CODE AS actor_code,
        item.review_note AS reason,
        CAST(NULL AS INT) AS review_round,
        item.reviewed_at AS decided_at,
        (
          SELECT hist.id AS event_id, hist.entity_type, hist.entity_id,
                 hist.action, hist.old_status, hist.new_status, hist.note,
                 hist.old_values_json, hist.new_values_json,
                 hist.acting_workspace, hist.user_role_id,
                 hist.created_at AS decided_at, histUser.USER_NAME AS actor_name, histUser.USER_CODE AS actor_code
          FROM dbo.BS_budget_workflow_history AS hist
          LEFT JOIN dbo.users AS histUser ON histUser.USER_ID = hist.created_by
          WHERE hist.entity_type = 'DEPARTMENT_CATEGORY_BUDGET_ITEM' AND hist.entity_id = item.id
          ORDER BY hist.created_at DESC, hist.id DESC
          FOR JSON PATH
        ) AS history_json
      FROM dbo.BS_department_category_budget_items AS item
      INNER JOIN dbo.BS_department_category_budgets AS dcb ON dcb.id = item.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets AS db ON db.id = dcb.department_budget_id
      INNER JOIN dbo.BS_departments AS dept ON dept.id = db.department_id
      INNER JOIN dbo.BS_budget_categories AS cat ON cat.id = dcb.budget_category_id
      INNER JOIN dbo.BS_budget_catalog_items AS catalog ON catalog.id = item.catalog_item_id
      LEFT JOIN dbo.users AS reviewer ON reviewer.USER_ID = item.reviewed_by
      WHERE db.financial_year_id = @financialYearId
        AND (@departmentId IS NULL OR db.department_id = @departmentId)
        AND (@categoryId IS NULL OR dcb.budget_category_id = @categoryId)
        AND item.is_active = 1 AND item.review_status = 'CATEGORY_REVIEW_COMPLETED'
        AND dcb.status = 'CATEGORY_REVIEW_COMPLETED'
        AND item.requested_quantity > 0 AND item.category_approved_quantity = 0

      UNION ALL

      SELECT
        'PURCHASING_REJECTED' AS exclusion_type,
        review.id AS decision_entity_id,
        subItem.id AS package_sub_item_id,
        (SELECT COUNT(1) FROM dbo.BS_category_budget_package_sub_items AS sibling
         WHERE sibling.category_budget_package_item_id = packageItem.id
           AND sibling.is_active = 1 AND sibling.quantity > 0) AS active_model_count,
        (SELECT COUNT(DISTINCT sibling.id)
         FROM dbo.BS_category_budget_package_sub_items AS sibling
         INNER JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS siblingReview
           ON siblingReview.category_budget_package_sub_item_id = sibling.id
          AND siblingReview.category_budget_package_id = pkg.id
          AND siblingReview.review_round = pkg.purchasing_review_round
          AND siblingReview.status = 'REJECTED'
         WHERE sibling.category_budget_package_item_id = packageItem.id
           AND sibling.is_active = 1 AND sibling.quantity > 0) AS rejected_model_count,
        packageItem.catalog_item_id,
        pkg.financial_year_id,
        pkg.budget_category_id,
        cat.name AS category_name,
        db.department_id,
        dept.name AS department_name,
        COALESCE(packageItem.catalog_item_name_snapshot, catalog.name) AS item_name,
        subItem.name AS model_name,
        CAST(alloc.allocated_quantity AS DECIMAL(18,4)) AS requested_quantity,
        CAST(alloc.allocated_quantity AS DECIMAL(18,4)) AS excluded_quantity,
        CAST(alloc.allocated_quantity * review.purchasing_unit_price AS DECIMAL(18,4)) AS excluded_amount,
        'Purchasing' AS decision_source,
        reviewer.USER_NAME AS actor_name,
        reviewer.USER_CODE AS actor_code,
        review.rejection_reason AS reason,
        review.review_round AS review_round,
        review.reviewed_at AS decided_at,
        (
          SELECT hist.id AS event_id, hist.entity_type, hist.entity_id,
                 hist.action, hist.old_status, hist.new_status, hist.note,
                 hist.old_values_json, hist.new_values_json,
                 hist.acting_workspace, hist.user_role_id,
                 hist.created_at AS decided_at, histUser.USER_NAME AS actor_name, histUser.USER_CODE AS actor_code
          FROM dbo.BS_budget_workflow_history AS hist
          LEFT JOIN dbo.users AS histUser ON histUser.USER_ID = hist.created_by
          WHERE hist.entity_type = 'CATEGORY_PACKAGE_SUB_ITEM' AND hist.entity_id = subItem.id
          ORDER BY hist.created_at DESC, hist.id DESC
          FOR JSON PATH
        ) AS history_json
      FROM dbo.BS_category_budget_package_sub_item_price_reviews AS review
      INNER JOIN dbo.BS_category_budget_packages AS pkg ON pkg.id = review.category_budget_package_id
        AND pkg.purchasing_review_round = review.review_round
      INNER JOIN dbo.BS_category_budget_package_sub_items AS subItem
        ON subItem.id = review.category_budget_package_sub_item_id AND subItem.is_active = 1 AND subItem.quantity > 0
      INNER JOIN dbo.BS_category_budget_package_items AS packageItem
        ON packageItem.id = subItem.category_budget_package_item_id AND packageItem.is_active = 1
      INNER JOIN dbo.BS_budget_catalog_items AS catalog ON catalog.id = packageItem.catalog_item_id
      INNER JOIN dbo.BS_budget_categories AS cat ON cat.id = pkg.budget_category_id
      INNER JOIN dbo.BS_category_budget_package_sub_item_allocations AS alloc
        ON alloc.category_budget_package_sub_item_id = subItem.id AND alloc.allocated_quantity > 0
      INNER JOIN dbo.BS_department_category_budget_items AS item
        ON item.id = alloc.department_category_budget_item_id AND item.is_active = 1
      INNER JOIN dbo.BS_department_category_budgets AS dcb
        ON dcb.id = item.department_category_budget_id AND dcb.budget_category_id = pkg.budget_category_id
      INNER JOIN dbo.BS_department_budgets AS db
        ON db.id = dcb.department_budget_id AND db.financial_year_id = pkg.financial_year_id
      INNER JOIN dbo.BS_departments AS dept ON dept.id = db.department_id
      LEFT JOIN dbo.users AS reviewer ON reviewer.USER_ID = review.reviewed_by
      WHERE pkg.financial_year_id = @financialYearId
        AND review.status = 'REJECTED'
        AND (@departmentId IS NULL OR db.department_id = @departmentId)
        AND (@categoryId IS NULL OR pkg.budget_category_id = @categoryId)
        AND (@includeDraftPurchasing = 1
          OR (pkg.status <> 'IN_PURCHASING_REVIEW' AND pkg.submitted_to_cfo_at IS NOT NULL)
          OR (pkg.status = 'IN_PURCHASING_REVIEW' AND review.decision_source = 'CARRIED_FORWARD'))
      ORDER BY category_name, item_name, model_name, department_name;
    `);
  return result.recordset.map((row) => ({
    ...row,
    requested_quantity: Number(row.requested_quantity || 0),
    excluded_quantity: Number(row.excluded_quantity || 0),
    excluded_amount: Number(row.excluded_amount || 0),
    history: (() => { try { return JSON.parse(row.history_json || "[]"); } catch { return []; } })(),
    history_json: undefined,
  }));
}
