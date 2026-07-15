import { useQuery } from "@tanstack/react-query";

import Breadcrumbs from "../components/Breadcrumbs";
import LockedPage from "../components/LockedPage";
import TransferForm from "../components/transfers/TransferForm";
import TransferTable from "../components/transfers/TransferTable";
import AdjustmentRequestsReviewPanel from "../components/adjustment-requests/AdjustmentRequestsReviewPanel";
import { getMyBudgets } from "../api/budget.api";
import { getTransferPageLock } from "../helpers/pageLockRules";
import useLockToast from "../hooks/useLockToast";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { can } from "../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import { useActiveFinancialYear } from "../hooks/financial-years/useFinancialYears";

export default function TransferPage() {
  const { budgetAccess } = useAuth();
  const { data: activeYear, isLoading: loadingActiveYear } =
    useActiveFinancialYear();
  const canReviewAdjustmentRequests = can(
    budgetAccess,
    PERMISSION_CODES.REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS,
  );
  const canCreateCategoryTransfers = can(
    budgetAccess,
    PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
  );
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["my-budgets"],
    queryFn: getMyBudgets,
    enabled: !canCreateCategoryTransfers,
  });

  const lock = getTransferPageLock(budgets);
  const categoryTransferLocked =
    canCreateCategoryTransfers && activeYear?.status !== "PRE_CLOSING";
  const isLocked =
    (!canCreateCategoryTransfers && lock.locked) || categoryTransferLocked;
  const lockedTitle = categoryTransferLocked
    ? "Transfers Not Available"
    : lock.title;
  const lockedMessage = categoryTransferLocked
    ? "Category transfers are available only after the financial year moves to PRE_CLOSING."
    : lock.message;
  const lockedReasons = categoryTransferLocked
    ? [
        "The financial year must be in PRE_CLOSING status.",
        "Transfers are execution-phase actions after CFO finalization.",
        "Use Department Adjustment Requests during planning when departments need a change.",
      ]
    : lock.reasons;

  useLockToast(isLocked && !isLoading && !loadingActiveYear, lockedMessage);

  if (
    (isLoading && !canCreateCategoryTransfers) ||
    (loadingActiveYear && canCreateCategoryTransfers)
  ) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading Transfer Requests"
        subtitle="Checking available budget items..."
      />
    );
  }

  if (isLocked) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/" },
            { label: "Transfer Requests" },
          ]}
        />

        <LockedPage
          title={lockedTitle}
          message={lockedMessage}
          reasons={lockedReasons}
        />

        {canReviewAdjustmentRequests && <AdjustmentRequestsReviewPanel />}
        <TransferTable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/" },
          { label: "Transfer Requests" },
        ]}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Transfer Requests
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Move available budget between approved items during the
              pre-closing period.
            </p>
          </div>
        </div>
      </div>

      {canReviewAdjustmentRequests && <AdjustmentRequestsReviewPanel />}

      <TransferForm />

      <TransferTable />
    </div>
  );
}
