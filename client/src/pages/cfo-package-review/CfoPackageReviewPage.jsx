import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  ClipboardCheck,
  Flag,
  Layers3,
  ListChecks,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { PERMISSION_CODES, hasPermission } from "@qnh/permissions";

import {
  completeCfoPackageReview,
  finalizeAnnualCfoPackageReview,
  getCfoFinancialYears,
  getCfoPackage,
  getCfoPackageItemDetail,
  getCfoPackages,
  markAllCfoPackageItemsNeedModification,
  reopenCfoPackageReview,
  returnCfoPackageToCategoryManager,
  setCfoPackageItemDecision,
} from "../../api/cfoPackageReview.api";
import ConfirmModal from "../../components/ConfirmModal";
import CfoDepartmentView from "../../components/cfo-package-review/CfoDepartmentView";
import CfoMetric from "../../components/cfo-package-review/CfoMetric";
import CfoPackageItemsView from "../../components/cfo-package-review/CfoPackageItemsView";
import CfoPackageQueue from "../../components/cfo-package-review/CfoPackageQueue";
import CfoReviewStatusBadge from "../../components/cfo-package-review/CfoReviewStatusBadge";
import CfoTotalPackageOverview from "../../components/cfo-package-review/CfoTotalPackageOverview";
import { useAuth } from "../../context/AuthContext";
import CollapsiblePanelToggle from "../../components/layout/CollapsiblePanelToggle";

const TOTAL_PACKAGE_ID = "TOTAL_PACKAGE";

function includesSearch(pkg, search) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return [pkg.category_name, pkg.category_code, pkg.financial_year, pkg.status]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function getPackageItemCounts(items = []) {
  return items.reduce(
    (result, item) => {
      if (item.cfo_review_status === "CFO_ACCEPTED") result.accepted += 1;
      else if (item.cfo_review_status === "NEEDS_MODIFICATION") {
        result.needsModification += 1;
      } else {
        result.pending += 1;
      }
      return result;
    },
    { accepted: 0, needsModification: 0, pending: 0 },
  );
}

function getEstimatedTotal(items = []) {
  return items.reduce(
    (sum, item) => sum + (Number(item.estimated_total) || 0),
    0,
  );
}

function DecisionModal({ modal, loading, onCancel, onConfirm }) {
  const [note, setNote] = useState("");

  if (!modal) return null;

  const requiresNote =
    modal.type === "NEEDS_MODIFICATION" ||
    modal.type === "RETURN" ||
    modal.type === "REOPEN" ||
    modal.type === "MARK_ALL_NEEDS_MODIFICATION";

  const title =
    modal.type === "ACCEPT"
      ? "Accept package item?"
      : modal.type === "COMPLETE"
        ? "Complete CFO package review?"
        : modal.type === "FINALIZE_ANNUAL"
          ? "Finalize CFO Package Review?"
          : modal.type === "REOPEN"
            ? "Reopen CFO package review?"
        : modal.type === "RETURN"
          ? "Return package to Category Manager?"
          : modal.type === "MARK_ALL_NEEDS_MODIFICATION"
            ? "Mark all items as needing modification?"
            : "Mark item as needing modification?";

  const message =
    modal.type === "ACCEPT"
      ? `${modal.item?.catalog_item_name} will be accepted for this category package.`
      : modal.type === "COMPLETE"
        ? "The category package will be completed and locked for normal package preparation."
        : modal.type === "FINALIZE_ANNUAL"
          ? "All completed category package reviews will be finalized for this financial year. This does not pre-close the year, but it locks CFO package reopening."
          : modal.type === "REOPEN"
            ? `${modal.package?.category_name} will return to CFO review so decisions can be adjusted before annual finalization.`
        : modal.type === "RETURN"
          ? "The whole package will return to the Category Manager. Only items marked Needs modification will be editable."
          : modal.type === "MARK_ALL_NEEDS_MODIFICATION"
            ? "Every package item will be marked as needing modification using this note."
            : `${modal.item?.catalog_item_name} will be editable by the Category Manager after the package is returned.`;

  return (
    <ConfirmModal
      open
      title={title}
      message={message}
      confirmText={
        modal.type === "ACCEPT"
          ? "Accept item"
          : modal.type === "COMPLETE"
            ? "Complete review"
            : modal.type === "FINALIZE_ANNUAL"
              ? "Finalize review"
              : modal.type === "REOPEN"
                ? "Reopen package"
            : modal.type === "RETURN"
              ? "Return package"
              : "Confirm"
      }
      danger={modal.type === "RETURN"}
      loading={loading}
      onCancel={onCancel}
      onConfirm={() => onConfirm({ note })}
    >
      {requiresNote && (
        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            {modal.type === "RETURN"
              ? "Return reason"
              : modal.type === "REOPEN"
                ? "Reopen reason"
                : "CFO note"}
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Explain what the Category Manager needs to change."
          />
        </label>
      )}
      {modal.type === "COMPLETE" && (
        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Completion note
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Optional note for the completed CFO review."
          />
        </label>
      )}
    </ConfirmModal>
  );
}

export default function CfoPackageReviewPage() {
  const queryClient = useQueryClient();
  const { budgetAccess } = useAuth();
  const permissionCodes =
    budgetAccess?.permissionCodes ??
    budgetAccess?.selectedWorkspace?.permissionCodes ??
    [];
  const canDecide = hasPermission(
    permissionCodes,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
  );

  const [packageSearch, setPackageSearch] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedPackageItemId, setSelectedPackageItemId] = useState(null);
  const [perspective, setPerspective] = useState("ITEMS");
  const [modal, setModal] = useState(null);
  const [isPackageQueueOpen, setIsPackageQueueOpen] = useState(true);
  const [selectedFinancialYearId, setSelectedFinancialYearId] = useState(null);

  const financialYearsQuery = useQuery({
    queryKey: ["cfo-package-review", "financial-years"],
    queryFn: getCfoFinancialYears,
  });

  const financialYears = useMemo(
    () => financialYearsQuery.data || [],
    [financialYearsQuery.data],
  );

  useEffect(() => {
    if (selectedFinancialYearId || financialYears.length === 0) return;

    const defaultYear =
      financialYears.find((year) => year.status === "OPEN") ||
      financialYears.find((year) => year.status === "PRE_CLOSING") ||
      financialYears[0];

    if (defaultYear?.id) {
      setSelectedFinancialYearId(defaultYear.id);
    }
  }, [financialYears, selectedFinancialYearId]);

  const selectedFinancialYear = useMemo(
    () =>
      financialYears.find(
        (year) => Number(year.id) === Number(selectedFinancialYearId),
      ) || null,
    [financialYears, selectedFinancialYearId],
  );

  const selectedYearReadOnly = selectedFinancialYear?.status !== "OPEN";
  const packagesQuery = useQuery({
    queryKey: ["cfo-package-review", "packages", selectedFinancialYearId],
    queryFn: () => getCfoPackages(selectedFinancialYearId),
    enabled: Boolean(selectedFinancialYearId),
  });

  useEffect(() => {
    setSelectedPackageId(null);
    setSelectedPackageItemId(null);
    setPerspective("ITEMS");
  }, [selectedFinancialYearId]);

  const filteredPackages = useMemo(
    () =>
      (packagesQuery.data || []).filter((pkg) =>
        includesSearch(pkg, packageSearch),
      ),
    [packagesQuery.data, packageSearch],
  );
  const allPackages = useMemo(
    () => packagesQuery.data || [],
    [packagesQuery.data],
  );
  const activeFinancialYearId = selectedFinancialYearId;
  const activeYearPackages = allPackages;
  const annualCfoReviewFinalizedAt =
    selectedFinancialYear?.cfo_review_finalized_at ||
    activeYearPackages.find((pkg) => pkg.financial_year_cfo_review_finalized_at)
      ?.financial_year_cfo_review_finalized_at ||
    null;
  const annualCfoReviewFinalized = Boolean(annualCfoReviewFinalizedAt);
  const allCategoryPackagesCompleted =
    activeYearPackages.length >= 3 &&
    activeYearPackages.every((pkg) => pkg.status === "CFO_REVIEW_COMPLETED");
  const canFinalizeAnnualReview =
    canDecide &&
    !selectedYearReadOnly &&
    !annualCfoReviewFinalized &&
    allCategoryPackagesCompleted &&
    Boolean(activeFinancialYearId);
  const showTotalPackage = allPackages.length > 1;
  const totalPackageSummary = useMemo(() => {
    if (!showTotalPackage) return null;

    return allPackages.reduce(
      (summary, pkg) => {
        summary.packageCount += 1;
        summary.packageItems += Number(pkg.summary?.package_items || 0);
        summary.acceptedItems += Number(pkg.summary?.accepted_items || 0);
        summary.needsModificationItems += Number(
          pkg.summary?.needs_modification_items || 0,
        );
        summary.estimatedTotal += Number(pkg.summary?.estimated_total || 0);
        return summary;
      },
      {
        id: TOTAL_PACKAGE_ID,
        packageCount: 0,
        packageItems: 0,
        acceptedItems: 0,
        needsModificationItems: 0,
        estimatedTotal: 0,
      },
    );
  }, [allPackages, showTotalPackage]);

  const effectiveSelectedPackageId =
    showTotalPackage && selectedPackageId === TOTAL_PACKAGE_ID
      ? TOTAL_PACKAGE_ID
      : filteredPackages.some((pkg) => Number(pkg.id) === Number(selectedPackageId))
        ? selectedPackageId
        : showTotalPackage
          ? TOTAL_PACKAGE_ID
          : filteredPackages[0]?.id;
  const totalPackageSelected = effectiveSelectedPackageId === TOTAL_PACKAGE_ID;

  const packageQuery = useQuery({
    queryKey: ["cfo-package-review", "package", effectiveSelectedPackageId],
    queryFn: () => getCfoPackage(effectiveSelectedPackageId),
    enabled: Boolean(effectiveSelectedPackageId) && !totalPackageSelected,
  });

  const packageData = packageQuery.data;
  const selectedPackage = packageData?.package;
  const packageItems = useMemo(
    () => selectedPackage?.items || [],
    [selectedPackage?.items],
  );
  const effectiveSelectedPackageItemId = packageItems.some(
    (item) => Number(item.id) === Number(selectedPackageItemId),
  )
    ? selectedPackageItemId
    : packageItems[0]?.id;

  const itemDetailQuery = useQuery({
    queryKey: [
      "cfo-package-review",
      "package-item",
      effectiveSelectedPackageId,
      effectiveSelectedPackageItemId,
    ],
    queryFn: () =>
      getCfoPackageItemDetail({
        packageId: effectiveSelectedPackageId,
        packageItemId: effectiveSelectedPackageItemId,
      }),
    enabled: Boolean(
      effectiveSelectedPackageId &&
        effectiveSelectedPackageItemId &&
        !totalPackageSelected,
    ),
  });

  function invalidatePackageQueries() {
    queryClient.invalidateQueries({ queryKey: ["cfo-package-review"] });
  }

  const decisionMutation = useMutation({
    mutationFn: setCfoPackageItemDecision,
    onSuccess: () => {
      toast.success("CFO item decision saved");
      setModal(null);
      invalidatePackageQueries();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to save CFO item decision",
      );
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllCfoPackageItemsNeedModification,
    onSuccess: () => {
      toast.success("All items marked as needing modification");
      setModal(null);
      invalidatePackageQueries();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to mark all items as needing modification",
      );
    },
  });

  const returnMutation = useMutation({
    mutationFn: returnCfoPackageToCategoryManager,
    onSuccess: () => {
      toast.success("Package returned to Category Manager");
      setModal(null);
      invalidatePackageQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to return package");
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeCfoPackageReview,
    onSuccess: () => {
      toast.success("CFO package review completed");
      setModal(null);
      invalidatePackageQueries();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to complete CFO review",
      );
    },
  });

  const reopenMutation = useMutation({
    mutationFn: reopenCfoPackageReview,
    onSuccess: () => {
      toast.success("CFO package review reopened");
      setModal(null);
      invalidatePackageQueries();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to reopen CFO package review",
      );
    },
  });

  const finalizeAnnualMutation = useMutation({
    mutationFn: finalizeAnnualCfoPackageReview,
    onSuccess: () => {
      toast.success("CFO Package Review finalized");
      setModal(null);
      invalidatePackageQueries();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to finalize CFO Package Review",
      );
    },
  });

  const counts = getPackageItemCounts(packageItems);
  const packageInReview = selectedPackage?.status === "IN_CFO_REVIEW";
  const canReopenPackage =
    canDecide &&
    !selectedYearReadOnly &&
    !annualCfoReviewFinalized &&
    selectedPackage?.financial_year_status === "OPEN" &&
    selectedPackage?.status === "CFO_REVIEW_COMPLETED";
  const canReturn =
    canDecide &&
    !selectedYearReadOnly &&
    packageInReview &&
    counts.pending === 0 &&
    counts.needsModification > 0;
  const canComplete =
    canDecide &&
    !selectedYearReadOnly &&
    packageInReview &&
    packageItems.length > 0 &&
    counts.accepted === packageItems.length;

  function handleModalConfirm({ note }) {
    if (!modal) return;

    if (modal.type === "ACCEPT") {
      if (!selectedPackage) return;
      decisionMutation.mutate({
        packageId: selectedPackage.id,
        packageItemId: modal.item.id,
        payload: {
          decision: "CFO_ACCEPTED",
          row_version: modal.item.row_version,
          note,
        },
      });
    } else if (modal.type === "NEEDS_MODIFICATION") {
      if (!selectedPackage) return;
      if (!note.trim()) {
        toast.error("CFO note is required");
        return;
      }
      decisionMutation.mutate({
        packageId: selectedPackage.id,
        packageItemId: modal.item.id,
        payload: {
          decision: "NEEDS_MODIFICATION",
          row_version: modal.item.row_version,
          note,
        },
      });
    } else if (modal.type === "MARK_ALL_NEEDS_MODIFICATION") {
      if (!selectedPackage) return;
      if (!note.trim()) {
        toast.error("CFO note is required");
        return;
      }
      markAllMutation.mutate({
        packageId: selectedPackage.id,
        payload: {
          row_version: selectedPackage.row_version,
          note,
        },
      });
    } else if (modal.type === "RETURN") {
      if (!selectedPackage) return;
      if (!note.trim()) {
        toast.error("Return reason is required");
        return;
      }
      returnMutation.mutate({
        packageId: selectedPackage.id,
        payload: {
          row_version: selectedPackage.row_version,
          reason: note,
        },
      });
    } else if (modal.type === "COMPLETE") {
      if (!selectedPackage) return;
      completeMutation.mutate({
        packageId: selectedPackage.id,
        payload: {
          row_version: selectedPackage.row_version,
          note,
        },
      });
    } else if (modal.type === "REOPEN") {
      if (!note.trim()) {
        toast.error("Reopen reason is required");
        return;
      }
      reopenMutation.mutate({
        packageId: modal.package.id,
        payload: {
          row_version: modal.package.row_version,
          reason: note,
        },
      });
    } else if (modal.type === "FINALIZE_ANNUAL") {
      finalizeAnnualMutation.mutate({
        financialYearId: activeFinancialYearId,
        payload: {
          note: note.trim() || null,
        },
      });
    }
  }

  const modalLoading =
    decisionMutation.isPending ||
    markAllMutation.isPending ||
    returnMutation.isPending ||
    completeMutation.isPending ||
    reopenMutation.isPending ||
    finalizeAnnualMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                <ClipboardCheck size={14} />
                CFO Review
              </div>
              <h1 className="mt-3 text-2xl font-bold text-slate-950">
                Category Package Review
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Review hospital-wide category packages, inspect department demand
                and shared package models, then accept items or return the package
                to the Category Manager with precise notes.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[220px]">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Financial year
                </span>
                <select
                  value={selectedFinancialYearId || ""}
                  onChange={(event) =>
                    setSelectedFinancialYearId(event.target.value || null)
                  }
                  disabled={financialYearsQuery.isLoading}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {financialYears.length === 0 ? (
                    <option value="">No financial years</option>
                  ) : (
                    financialYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        FY {year.year} - {year.status}
                      </option>
                    ))
                  )}
                </select>
              </label>
              {selectedFinancialYear ? (
                <div
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-bold",
                    selectedYearReadOnly
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  {selectedYearReadOnly
                    ? "Read-only historical view"
                    : "Active CFO review year"}
                </div>
              ) : null}
              <button
                type="button"
                disabled={!canFinalizeAnnualReview}
                title={
                  annualCfoReviewFinalized
                    ? "CFO Package Review is already finalized"
                    : allCategoryPackagesCompleted
                      ? "Finalize CFO Package Review for this financial year"
                      : "All three category packages must be CFO review completed"
                }
                onClick={() => setModal({ type: "FINALIZE_ANNUAL" })}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Flag size={16} />
                Finalize CFO Package Review
              </button>
              <button
                type="button"
                onClick={() => invalidatePackageQueries()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
          {annualCfoReviewFinalized ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              CFO Package Review finalized. Pre-Close Year can now be attempted
              from Financial Years, subject to remaining backend readiness
              checks.
            </div>
          ) : null}
          {selectedYearReadOnly && selectedFinancialYear ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              FY {selectedFinancialYear.year} is {selectedFinancialYear.status}.
              CFO package data is available for review only; package decisions,
              returns, reopening, completion, and annual finalization are locked.
            </div>
          ) : null}
        </header>

        <div
          className={[
            "grid min-h-[760px] gap-5 transition-all duration-300 ease-in-out",
            isPackageQueueOpen
              ? "xl:grid-cols-[380px_minmax(0,1fr)]"
              : "xl:grid-cols-[0px_minmax(0,1fr)]",
          ].join(" ")}
        >
          <div
            className={[
              "overflow-hidden",
              isPackageQueueOpen ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            aria-hidden={!isPackageQueueOpen}
          >
            <CfoPackageQueue
              packages={filteredPackages}
              selectedPackageId={effectiveSelectedPackageId}
              totalPackage={totalPackageSummary}
              search={packageSearch}
              onSearchChange={setPackageSearch}
              onSelectPackage={(packageId) => {
                setSelectedPackageId(packageId);
                setSelectedPackageItemId(null);
              }}
            />
          </div>

          <main className="min-w-0">
            {financialYearsQuery.isLoading ||
            packagesQuery.isLoading ||
            (!totalPackageSelected && packageQuery.isLoading) ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                Loading CFO package review...
              </div>
            ) : totalPackageSelected ? (
              <>
                <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <CollapsiblePanelToggle
                    isOpen={isPackageQueueOpen}
                    onToggle={() => setIsPackageQueueOpen((prev) => !prev)}
                    openLabel="Show Package Queue"
                    closeLabel="Hide Package Queue"
                  />
                </div>
                <CfoTotalPackageOverview
                  packages={allPackages}
                  onSelectPackageItem={({ packageId, packageItemId }) => {
                    setSelectedPackageId(packageId);
                    setSelectedPackageItemId(packageItemId);
                    setPerspective("ITEMS");
                  }}
                />
              </>
            ) : !selectedPackage ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
                No CFO package is selected.
              </div>
            ) : (
              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-3">
                        <CollapsiblePanelToggle
                          isOpen={isPackageQueueOpen}
                          onToggle={() => setIsPackageQueueOpen((prev) => !prev)}
                          openLabel="Show Package Queue"
                          closeLabel="Hide Package Queue"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-950">
                          {selectedPackage.category_name} Package
                        </h2>
                        <CfoReviewStatusBadge status={selectedPackage.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        FY {selectedPackage.financial_year} · Submitted by{" "}
                        {selectedPackage.submitted_to_cfo_by_name || "Category Manager"}
                      </p>
                      {selectedPackage.return_reason && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
  <p className="mb-1 text-xs font-black uppercase tracking-wide text-amber-700">
    Last CFO return note
  </p>

  <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words leading-6 [overflow-wrap:anywhere]">
    {selectedPackage.return_reason}
  </p>
</div>
                      )}
                    </div>

                    {canReopenPackage ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setModal({ type: "REOPEN", package: selectedPackage })
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <RotateCcw size={16} />
                          Reopen package review
                        </button>
                      </div>
                    ) : null}

                    {canDecide && !selectedYearReadOnly && packageInReview && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setModal({ type: "MARK_ALL_NEEDS_MODIFICATION" })
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100"
                        >
                          <ListChecks size={16} />
                          Mark all needs modification
                        </button>
                        <button
                          type="button"
                          disabled={!canReturn}
                          title={
                            canReturn
                              ? "Return package to Category Manager"
                              : "All items must be decided and at least one item must need modification"
                          }
                          onClick={() => setModal({ type: "RETURN" })}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RotateCcw size={16} />
                          Return package
                        </button>
                        <button
                          type="button"
                          disabled={!canComplete}
                          title={
                            canComplete
                              ? "Complete CFO review"
                              : "Every package item must be accepted before completion"
                          }
                          onClick={() => setModal({ type: "COMPLETE" })}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} />
                          Complete review
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <CfoMetric
                      label="Package items"
                      value={packageItems.length}
                    />
                    <CfoMetric
                      label="Accepted"
                      value={`${counts.accepted} of ${packageItems.length}`}
                    />
                    <CfoMetric
                      label="Needs modification"
                      value={counts.needsModification}
                    />
                    <CfoMetric
                      label="Approved quantity"
                      value={selectedPackage.summary?.approvedQuantity}
                    />
                    <CfoMetric
                      label="Estimated total"
                      value={getEstimatedTotal(packageItems)}
                      currency
                    />
                  </div>
                </section>

                <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                  <button
                    type="button"
                    onClick={() => setPerspective("ITEMS")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                      perspective === "ITEMS"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Layers3 size={16} />
                    By package item
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerspective("DEPARTMENTS")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                      perspective === "DEPARTMENTS"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ClipboardCheck size={16} />
                    By department
                  </button>
                </div>

                {perspective === "ITEMS" ? (
                  <CfoPackageItemsView
                    items={packageItems}
                    selectedItemId={effectiveSelectedPackageItemId}
                    itemDetail={itemDetailQuery.data}
                    loadingDetail={itemDetailQuery.isLoading}
                    canDecide={canDecide && !selectedYearReadOnly && packageInReview}
                    onSelectItem={setSelectedPackageItemId}
                    onAccept={(item) => setModal({ type: "ACCEPT", item })}
                    onNeedsModification={(item) =>
                      setModal({ type: "NEEDS_MODIFICATION", item })
                    }
                  />
                ) : (
                  <CfoDepartmentView
                    departments={packageData?.departmentView?.departments || []}
                    packageId={selectedPackage.id}
                    onSelectPackageItem={(packageItemId) => {
                      setSelectedPackageItemId(packageItemId);
                      setPerspective("ITEMS");
                    }}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <DecisionModal
        key={`${modal?.type || "none"}-${modal?.item?.id || "package"}`}
        modal={modal}
        loading={modalLoading}
        onCancel={() => setModal(null)}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
}
