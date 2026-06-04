import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle2, Clock3, FileText } from "lucide-react";

import Breadcrumbs from "../components/Breadcrumbs";
import LockedPage from "../components/LockedPage";
import TransferForm from "../components/transfers/TransferForm";
import TransferTable from "../components/transfers/TransferTable";
import { getMyBudgets } from "../api/budget.api";
import { getTransferPageLock } from "../helpers/pageLockRules";
import useLockToast from "../hooks/useLockToast";
import LoadingSpinner from "../components/LoadingSpinner";
import { useState, useEffect } from "react";

export default function TransferPage() {
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["my-budgets"],
    queryFn: getMyBudgets,
  });

  const lock = getTransferPageLock(budgets);

  useLockToast(lock.locked && !isLoading, lock.message);

  if (isLoading) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading Transfer Requests"
        subtitle="Checking available budget items..."
      />
    );
  }

  if (lock.locked) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/" },
            { label: "Transfer Requests" },
          ]}
        />

        <LockedPage
          title={lock.title}
          message={lock.message}
          reasons={lock.reasons}
        />

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

      <TransferForm />

      <TransferTable />
    </div>
  );
}
