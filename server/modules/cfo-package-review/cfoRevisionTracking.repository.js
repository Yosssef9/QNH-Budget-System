import { poolPromise, sql } from '../../config/db.js';
import { createRequest } from '../../utils/createRequest.js';
import { isPurchasingModelIncludedSql } from '../category-packages/purchasingExclusion.sql.js';
import { hasPositiveApprovedPackageDemandSql } from '../category-packages/approvedPackageDemand.sql.js';

const executor = async (transaction) => transaction || await poolPromise;

export async function listCfoReturnComparisonsRepo(packageId, transaction = null) {
  const connection = await executor(transaction);
  const result = await createRequest(connection).input('packageId', sql.BigInt, packageId).query(`
    SELECT latest.id AS snapshot_id, packageItem.id AS item_id, packageItem.cfo_review_status,
      latest.approved_quantity, latest.item_total_amount, latest.snapshot_json, latest.created_at AS baseline_at,
      CAST(COALESCE(progress.is_reviewed, 0) AS BIT) AS is_reviewed,
      progress.changed_at AS reviewed_at,
      (
        SELECT COALESCE(SUM(demand.category_approved_quantity),0)
        FROM dbo.BS_department_category_budget_items AS demand
        INNER JOIN dbo.BS_department_category_budgets AS dcb ON dcb.id = demand.department_category_budget_id
        INNER JOIN dbo.BS_department_budgets AS db ON db.id = dcb.department_budget_id
        INNER JOIN dbo.BS_category_budget_packages AS p ON p.id = packageItem.category_budget_package_id
        WHERE db.financial_year_id = p.financial_year_id
          AND dcb.budget_category_id = p.budget_category_id
          AND dcb.status = 'CATEGORY_REVIEW_COMPLETED'
          AND demand.catalog_item_id = packageItem.catalog_item_id
          AND demand.is_active = 1 AND demand.review_status = 'CATEGORY_REVIEW_COMPLETED'
      ) AS current_approved_quantity,
      (SELECT model.id, model.name, model.quantity, model.unit_price,
              model.category_manager_unit_price,
              (SELECT TOP (1) review.status FROM dbo.BS_category_budget_package_sub_item_price_reviews review
               INNER JOIN dbo.BS_category_budget_packages pkg ON pkg.id = review.category_budget_package_id
                AND pkg.purchasing_review_round = review.review_round
               WHERE review.category_budget_package_sub_item_id = model.id ORDER BY review.id DESC) AS purchasing_decision
       FROM dbo.BS_category_budget_package_sub_items AS model
       WHERE model.category_budget_package_item_id = packageItem.id AND model.is_active = 1
       ORDER BY model.id FOR JSON PATH, INCLUDE_NULL_VALUES) AS current_models_json
    FROM dbo.BS_category_budget_package_items AS packageItem
    CROSS APPLY (
      SELECT TOP (1) s.id, s.approved_quantity, s.item_total_amount, s.snapshot_json, s.created_at
      FROM dbo.BS_cfo_package_item_return_snapshots AS s
      WHERE s.category_budget_package_id = packageItem.category_budget_package_id
        AND s.category_budget_package_item_id = packageItem.id
      ORDER BY s.created_at DESC, s.id DESC
    ) latest
    LEFT JOIN dbo.BS_cfo_package_cm_review_progress progress ON progress.snapshot_id = latest.id
    WHERE packageItem.category_budget_package_id = @packageId AND packageItem.is_active = 1;
  `);
  return result.recordset;
}

export async function setCfoCmReviewedRepo(transaction, { packageId, itemId, reviewed, actorUserId }) {
  const result = await new sql.Request(transaction)
    .input('packageId', sql.BigInt, packageId)
    .input('itemId', sql.BigInt, itemId)
    .input('reviewed', sql.Bit, reviewed ? 1 : 0)
    .input('actor', sql.Int, actorUserId)
    .query(`
      SELECT TOP (1) s.id AS snapshot_id
      FROM dbo.BS_category_budget_packages AS pkg WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.BS_category_budget_package_items AS item WITH (UPDLOCK, HOLDLOCK)
        ON item.category_budget_package_id = pkg.id AND item.id = @itemId
        AND item.is_active = 1 AND item.cfo_review_status = 'NEEDS_MODIFICATION'
      INNER JOIN dbo.BS_cfo_package_item_return_snapshots s
        ON s.category_budget_package_item_id = item.id AND s.category_budget_package_id = pkg.id
      WHERE pkg.id = @packageId AND pkg.status = 'RETURNED_BY_CFO'
      ORDER BY s.created_at DESC, s.id DESC;
    `);
  const snapshotId = result.recordset[0]?.snapshot_id;
  if (!snapshotId) return null;
  const previous = await new sql.Request(transaction)
    .input('snapshotId', sql.BigInt, snapshotId)
    .query('SELECT is_reviewed FROM dbo.BS_cfo_package_cm_review_progress WITH (UPDLOCK, HOLDLOCK) WHERE snapshot_id = @snapshotId;');
  const previousReviewed = Boolean(previous.recordset[0]?.is_reviewed);
  const saved = await new sql.Request(transaction)
    .input('snapshotId', sql.BigInt, snapshotId)
    .input('reviewed', sql.Bit, reviewed ? 1 : 0)
    .input('actor', sql.Int, actorUserId)
    .query(`
      UPDATE dbo.BS_cfo_package_cm_review_progress WITH (UPDLOCK, SERIALIZABLE)
      SET is_reviewed = @reviewed, changed_by = @actor, changed_at = SYSUTCDATETIME()
      WHERE snapshot_id = @snapshotId;
      IF @@ROWCOUNT = 0
        INSERT INTO dbo.BS_cfo_package_cm_review_progress (snapshot_id, is_reviewed, changed_by)
        VALUES (@snapshotId, @reviewed, @actor);
      SELECT snapshot_id, is_reviewed, changed_by, changed_at FROM dbo.BS_cfo_package_cm_review_progress WHERE snapshot_id = @snapshotId;
    `);
  return { ...saved.recordset[0], previous_reviewed: previousReviewed };
}

// Capture the exact CFO-reviewed eligible category total BEFORE returning it
// to CM. Excluded or unaccepted models never count in this baseline.
export async function captureCfoPackageReturnTotalRepo(transaction, { packageId, actorUserId }) {
  const result = await new sql.Request(transaction)
    .input('packageId', sql.BigInt, packageId)
    .input('actor', sql.Int, actorUserId)
    .query(`
      INSERT INTO dbo.BS_cfo_package_return_totals(package_id, total_before, created_by)
      SELECT pkg.id, COALESCE(SUM(CAST(subItem.quantity * subItem.unit_price AS DECIMAL(19,4))),0), @actor
      FROM dbo.BS_category_budget_packages pkg
      LEFT JOIN dbo.BS_category_budget_package_items packageItem
        ON packageItem.category_budget_package_id = pkg.id AND packageItem.is_active = 1
        AND ${hasPositiveApprovedPackageDemandSql('packageItem')}
      LEFT JOIN dbo.BS_category_budget_package_sub_items subItem
        ON subItem.category_budget_package_item_id = packageItem.id
        AND subItem.is_active = 1 AND ${isPurchasingModelIncludedSql('subItem')}
      WHERE pkg.id = @packageId
      GROUP BY pkg.id;
      SELECT @@ROWCOUNT AS created_count;
    `);
  return Number(result.recordset[0]?.created_count || 0);
}

export async function getCfoCategoryChangeRepo(packageId) {
  const pool = await poolPromise;
  const result = await createRequest(pool).input('packageId', sql.BigInt, packageId).query(`
    SELECT TOP (1) total_before, created_at AS baseline_at
    FROM dbo.BS_cfo_package_return_totals WHERE package_id = @packageId ORDER BY id DESC;
    SELECT COALESCE(SUM(CAST(model.quantity * model.unit_price AS DECIMAL(19,4))), 0) AS current_total
    FROM dbo.BS_category_budget_packages pkg
    LEFT JOIN dbo.BS_category_budget_package_items packageItem
      ON packageItem.category_budget_package_id = pkg.id AND packageItem.is_active = 1
      AND ${hasPositiveApprovedPackageDemandSql('packageItem')}
    LEFT JOIN dbo.BS_category_budget_package_sub_items model
      ON model.category_budget_package_item_id = packageItem.id AND model.is_active = 1
      AND ${isPurchasingModelIncludedSql('model')}
    WHERE pkg.id = @packageId;
  `);
  return { baseline: result.recordsets[0]?.[0] || null, current: result.recordsets[1]?.[0] || null };
}
