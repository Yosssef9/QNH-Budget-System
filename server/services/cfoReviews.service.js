import { ApiError } from "../utils/apiError.js";
import { withTransaction } from "../database/transaction.js";
import {
  approveCfoReviewPackageRepo,
  getCfoReviewItemByIdRepo,
  getCfoReviewItemStatusCountsRepo,
  getCfoReviewPackageByIdRepo,
  getCfoReviewPackageItemsRepo,
  getCfoReviewPackagesRepo,
  returnCfoReviewPackageRepo,
  updateCfoReviewItemStatusRepo,
} from "../repositories/cfoReviews.repository.js";
import {
  getDepartmentContributionsRepo,
  getSelectedSubItemsRepo,
} from "../repositories/categoryReviews.repository.js";
import {
  getReviewAttachmentsRepo,
  getReviewSubItemAttachmentsRepo,
} from "../repositories/categoryReviewAttachments.repository.js";

function requireCfoWorkspace(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (
    activeWorkspace?.type !== "CFO_REVIEW" ||
    !activeWorkspace?.permissions?.can_approve_budget
  ) {
    throw new ApiError(
      403,
      "Switch to the CFO / Budget Approval Workspace to review category budgets",
      "INVALID_WORKSPACE",
    );
  }
}

function assertPackageSubmitted(packageRow) {
  if (!packageRow) {
    throw new ApiError(
      404,
      "CFO review package not found",
      "CFO_REVIEW_PACKAGE_NOT_FOUND",
    );
  }

  if (packageRow.financial_year_status !== "OPEN") {
    throw new ApiError(
      409,
      "CFO review is only allowed while the financial year is open",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (packageRow.status !== "SUBMITTED_TO_CFO") {
    throw new ApiError(
      409,
      "Only packages submitted to CFO can be reviewed",
      "PACKAGE_NOT_SUBMITTED_TO_CFO",
    );
  }
}

export async function getCfoReviewPackagesService({ status, budgetAccess }) {
  requireCfoWorkspace(budgetAccess);
  return getCfoReviewPackagesRepo({ status });
}

export async function getCfoReviewPackageDetailsService({
  packageId,
  budgetAccess,
}) {
  requireCfoWorkspace(budgetAccess);

  const packageRow = await getCfoReviewPackageByIdRepo(packageId);

  if (!packageRow) {
    throw new ApiError(
      404,
      "CFO review package not found",
      "CFO_REVIEW_PACKAGE_NOT_FOUND",
    );
  }

  const items = await getCfoReviewPackageItemsRepo(packageId);

  const itemDetails = await Promise.all(
    items.map(async (item) => {
      const [departmentContributions, selectedSubItems, attachments] =
        await Promise.all([
          getDepartmentContributionsRepo(item.id),
          getSelectedSubItemsRepo(item.id),
          getReviewAttachmentsRepo(item.id),
        ]);

      const selectedSubItemsWithAttachments = await Promise.all(
        selectedSubItems.map(async (subItem) => ({
          ...subItem,
          attachments: await getReviewSubItemAttachmentsRepo(subItem.id),
        })),
      );

      return {
        ...item,
        departmentContributions,
        selectedSubItems: selectedSubItemsWithAttachments,
        attachments,
      };
    }),
  );

  return {
    package: packageRow,
    items: itemDetails,
  };
}

export async function updateCfoReviewItemStatusService({
  packageId,
  reviewId,
  payload,
  user,
  budgetAccess,
}) {
  requireCfoWorkspace(budgetAccess);

  return withTransaction(async (transaction) => {
    const item = await getCfoReviewItemByIdRepo({
      packageId,
      reviewId,
      transaction,
    });

    if (!item) {
      throw new ApiError(
        404,
        "CFO review item not found",
        "CFO_REVIEW_ITEM_NOT_FOUND",
      );
    }

    assertPackageSubmitted({
      status: item.package_status,
      financial_year_status: item.financial_year_status,
    });

    if (
      !["SUBMITTED_TO_CFO", "RETURNED_BY_CFO"].includes(
        item.category_review_status,
      )
    ) {
      throw new ApiError(
        409,
        "Only items submitted to CFO can be reviewed",
        "ITEM_NOT_SUBMITTED_TO_CFO",
      );
    }

    return updateCfoReviewItemStatusRepo({
      reviewId,
      status: payload.status,
      note: payload.note,
      reviewedBy: user.userId,
      transaction,
    });
  });
}

export async function approveCfoReviewPackageService({
  packageId,
  user,
  budgetAccess,
}) {
  requireCfoWorkspace(budgetAccess);

  return withTransaction(async (transaction) => {
    const packageRow = await getCfoReviewPackageByIdRepo(
      packageId,
      transaction,
    );

    assertPackageSubmitted(packageRow);

    const counts = await getCfoReviewItemStatusCountsRepo(
      packageId,
      transaction,
    );
    const total = Number(counts.total_count || 0);
    const accepted = Number(counts.accepted_count || 0);

    if (!total) {
      throw new ApiError(
        409,
        "Cannot approve an empty CFO review package",
        "CFO_REVIEW_PACKAGE_EMPTY",
      );
    }

    if (accepted !== total) {
      throw new ApiError(
        409,
        "All consolidated items must be accepted by CFO before package approval",
        "CFO_ITEMS_NOT_ALL_ACCEPTED",
      );
    }

    const approved = await approveCfoReviewPackageRepo({
      packageId,
      approvedBy: user.userId,
      transaction,
    });

    if (!approved) {
      throw new ApiError(
        409,
        "CFO review package is no longer submittable for approval",
        "CFO_REVIEW_APPROVAL_CONFLICT",
      );
    }

    return approved;
  });
}

export async function returnCfoReviewPackageService({
  packageId,
  payload,
  user,
  budgetAccess,
}) {
  requireCfoWorkspace(budgetAccess);

  return withTransaction(async (transaction) => {
    const packageRow = await getCfoReviewPackageByIdRepo(
      packageId,
      transaction,
    );

    assertPackageSubmitted(packageRow);

    const counts = await getCfoReviewItemStatusCountsRepo(
      packageId,
      transaction,
    );
    const returned = Number(counts.returned_count || 0);

    if (!returned) {
      throw new ApiError(
        409,
        "At least one consolidated item must be returned before returning the package",
        "NO_CFO_RETURNED_ITEMS",
      );
    }

    const updated = await returnCfoReviewPackageRepo({
      packageId,
      note: payload.note,
      returnedBy: user.userId,
      transaction,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "CFO review package is no longer returnable",
        "CFO_REVIEW_RETURN_CONFLICT",
      );
    }

    return updated;
  });
}
