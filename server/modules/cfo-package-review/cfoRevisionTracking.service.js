import { withTransaction } from '../../database/transaction.js';
import { ApiError } from '../../utils/apiError.js';
import { hasPermission } from '../../../shared/permissions/permissionCodes.js';
import { CATEGORY_PACKAGE_PERMISSIONS } from '../category-packages/categoryPackages.constants.js';
import { findCurrentPackageForCategoryRepo, createWorkflowHistoryRepo } from '../category-packages/categoryPackages.repository.js';
import { CFO_PACKAGE_REVIEW_PERMISSIONS } from './cfoPackageReview.constants.js';
import { findCfoPackageByIdRepo } from './cfoPackageReview.repository.js';
import { compareCfoReturnedItem, summarizeRevisionItems } from './cfoRevisionComparison.js';
import { listCfoReturnComparisonsRepo, setCfoCmReviewedRepo, getCfoCategoryChangeRepo } from './cfoRevisionTracking.repository.js';

function requireCategory(budgetAccess, permission = CATEGORY_PACKAGE_PERMISSIONS.VIEW) {
  if (!hasPermission(budgetAccess, permission) || (budgetAccess?.workspaceType ?? budgetAccess?.type) !== 'CATEGORY' ||
      !['CATEGORY_BUDGET_MANAGER'].includes(budgetAccess?.role?.code ?? budgetAccess?.role_code)) {
    throw new ApiError(403, 'Category Manager workspace is required', 'CATEGORY_WORKSPACE_REQUIRED');
  }
  const categoryId = Number(budgetAccess?.category?.id ?? budgetAccess?.budgetCategory?.id ?? budgetAccess?.budget_category_id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) throw new ApiError(403, 'Category workspace not found');
  return categoryId;
}

export async function getCmRevisionTrackerService({ budgetAccess }) {
  const categoryId = requireCategory(budgetAccess);
  const pkg = await findCurrentPackageForCategoryRepo({ budgetCategoryId: categoryId });
  if (!pkg) throw new ApiError(404, 'Category package not found');
  const comparisons = await listCfoReturnComparisonsRepo(pkg.id);
  const active = pkg.status === 'RETURNED_BY_CFO';
  const items = comparisons.filter(row => row.cfo_review_status === 'NEEDS_MODIFICATION')
    .map(row => compareCfoReturnedItem(row, { stage: 'CM' }));
  // Only an actionable, currently returned CFO item should count toward CM's
  // checklist. The source list is already scoped to the current package.
  return { package_id: pkg.id, active, items: active ? items : [],
    summary: summarizeRevisionItems(active ? items : []) };
}

export async function setCmRevisionReviewedService({ budgetAccess, itemId, reviewed, actorUserId }) {
  const categoryId = requireCategory(budgetAccess, CATEGORY_PACKAGE_PERMISSIONS.MANAGE_PACKAGE);
  if (!Number.isInteger(itemId) || itemId <= 0 || typeof reviewed !== 'boolean') {
    throw new ApiError(400, 'Valid item ID and reviewed boolean are required');
  }
  return withTransaction(async transaction => {
    // Lock and recheck the package and item state in the same transaction as
    // the update; CFO approvals and Purchasing decisions are not altered.
    const pkg = await findCurrentPackageForCategoryRepo({ budgetCategoryId: categoryId }, transaction);
    if (!pkg || pkg.status !== 'RETURNED_BY_CFO' || pkg.financial_year_status !== 'OPEN') {
      throw new ApiError(409, 'Only current CFO-returned items can be marked Reviewed');
    }
    const saved = await setCfoCmReviewedRepo(transaction, { packageId: pkg.id, itemId, reviewed, actorUserId });
    if (!saved) throw new ApiError(409, 'Item is not an active CFO-requested modification');
    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: pkg.financial_year_id, entity_type: 'CATEGORY_BUDGET_PACKAGE_ITEM', entity_id: itemId,
      action: 'CATEGORY_MANAGER_CFO_ITEM_REVIEW_TOGGLED',
      old_status: saved.previous_reviewed ? 'CM_REVIEWED' : 'CM_TO_REVIEW',
      new_status: reviewed ? 'CM_REVIEWED' : 'CM_TO_REVIEW',
      note: reviewed ? 'Category Manager marked CFO feedback as reviewed' : 'Category Manager marked CFO feedback as to review',
      created_by: actorUserId,
      user_role_id: budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null,
      acting_workspace: budgetAccess?.workspaceType ?? budgetAccess?.type ?? null,
    });
    return { item_id: itemId, snapshot_id: Number(saved.snapshot_id), reviewed: Boolean(saved.is_reviewed) };
  });
}

export async function getCfoRevisionComparisonService({ packageId, budgetAccess }) {
  if (!hasPermission(budgetAccess, CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW)) {
    throw new ApiError(403, 'CFO review permission required');
  }
  const pkg = await findCfoPackageByIdRepo({ packageId });
  if (!pkg) throw new ApiError(404, 'CFO package not found');
  const [rows, category] = await Promise.all([
    listCfoReturnComparisonsRepo(packageId), getCfoCategoryChangeRepo(packageId),
  ]);
  const items = rows.map(row => compareCfoReturnedItem(row, { stage: 'CFO' }));
  const baseline = category.baseline;
  const before = baseline ? Number(baseline.total_before) : null;
  const after = Number(category.current?.current_total || 0);
  return {
    package_id: packageId, items, summary: summarizeRevisionItems(items),
    category: baseline ? {
      previous_total: before, current_total: after,
      change_amount: Math.round((after - before) * 10000) / 10000,
      change_percent: before === 0 ? null : Math.round((after - before) * 10000 / Math.abs(before)) / 100,
      baseline_at: baseline.baseline_at,
    } : null,
  };
}
