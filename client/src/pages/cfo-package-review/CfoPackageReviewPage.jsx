import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  CalendarDays,
  ClipboardCheck,
  Flag,
  Building2,
  Layers3,
  ListChecks,
  PanelRightOpen,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { PERMISSION_CODES, hasPermission } from "@qnh/permissions";

import {
  completeCfoPackageReview,
  finalizeAnnualCfoPackageReview,
  getCfoFinancialYears,
  getCfoFinancialYearDistribution,
  getCfoPackage,
  getCfoPackageDistribution,
  getCfoPackageItemDetail,
  getCfoPackageTimeline,
  getCfoPackages,
  markAllCfoPackageItemsNeedModification,
  reopenCfoPackageReview,
  returnCfoPackageToCategoryManager,
  setCfoPackageItemDecision,
} from "../../api/cfoPackageReview.api";
import ConfirmModal from "../../components/ConfirmModal";
import BudgetTimeline from "../../components/BudgetTimeline";
import Input from "../../components/Input";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import CfoDepartmentView from "../../components/cfo-package-review/CfoDepartmentView";
import CfoMetric from "../../components/cfo-package-review/CfoMetric";
import CfoPackageItemsView from "../../components/cfo-package-review/CfoPackageItemsView";
import CfoPackageQueue from "../../components/cfo-package-review/CfoPackageQueue";
import CfoReviewStatusBadge from "../../components/cfo-package-review/CfoReviewStatusBadge";
import CfoTotalPackageOverview from "../../components/cfo-package-review/CfoTotalPackageOverview";
import PackageDistributionDrawer from "../../components/category-packages/PackageDistributionDrawer";
import CollapsibleSection from "../../components/CollapsibleSection";
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

function CoverageTile({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black leading-none">{value}</p>
    </div>
  );
}

function DepartmentCoveragePanel({
  financialYear,
  coverage,
  packageBreakdown = [],
}) {
  const progress =
    coverage.total > 0 ? (coverage.submitted / coverage.total) * 100 : 0;

  return (
    <CollapsibleSection
      title="Department-category coverage"
      description={`FY ${financialYear || "-"} - Visible category packages`}
      icon={<Building2 className="h-5 w-5" />}
      defaultOpen={false}
      openText="Hide coverage"
      closedText="Show coverage"
      className="rounded-2xl border-blue-100"
      headerClassName="bg-gradient-to-br from-white via-blue-50/40 to-slate-50"
    >
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <p className="text-sm font-black text-slate-950">
                Department-category coverage
              </p>
              <p className="text-xs font-medium text-slate-500">
                FY {financialYear || "-"} · Visible category packages
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Tracks how many department submissions are included in the CFO
            package set, and how many department-category budgets did not submit
            before package review.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[560px]">
          <CoverageTile label="Coverage slots" value={coverage.total} />
          <CoverageTile
            label="Submitted"
            value={coverage.submitted}
            tone="blue"
          />
          <CoverageTile
            label="Not submitted"
            value={coverage.notSubmitted}
            tone="amber"
          />
          <CoverageTile
            label="Review complete"
            value={coverage.completed}
            tone="emerald"
          />
        </div>
      </div>

      <div className="border-t border-blue-100 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600">
          <span>
            {coverage.submitted} of {coverage.total} department-category budgets
            submitted
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        {packageBreakdown.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {packageBreakdown.map((pkg) => {
              const packageProgress =
                pkg.total > 0 ? (pkg.submitted / pkg.total) * 100 : 0;
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-700">
                    <span className="truncate">{pkg.categoryName}</span>
                    <span>
                      {pkg.submitted}/{pkg.total}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, packageProgress))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
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
        <Input
          label={
            modal.type === "RETURN"
              ? "Return reason"
              : modal.type === "REOPEN"
                ? "Reopen reason"
                : "CFO note"
          }
          multiline
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Explain what the Category Manager needs to change."
          required
        />
      )}
      {modal.type === "COMPLETE" && (
        <Input
          label="Completion note"
          multiline
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for the completed CFO review."
        />
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
  const [isPackageTimelineOpen, setIsPackageTimelineOpen] = useState(false);
  const [selectedFinancialYearId, setSelectedFinancialYearId] = useState(null);
  const [distributionContext, setDistributionContext] = useState(null);

  const financialYearsQuery = useQuery({
    queryKey: ["cfo-package-review", "financial-years"],
    queryFn: getCfoFinancialYears,
  });

  const financialYears = useMemo(
    () => financialYearsQuery.data || [],
    [financialYearsQuery.data],
  );

  const defaultFinancialYearId = useMemo(() => {
    if (financialYears.length === 0) return null;

    return (
      financialYears.find((year) => year.status === "OPEN") ||
      financialYears.find((year) => year.status === "PRE_CLOSING") ||
      financialYears[0]
    )?.id;
  }, [financialYears]);

  const effectiveFinancialYearId =
    selectedFinancialYearId || defaultFinancialYearId || null;

  const selectedFinancialYear = useMemo(
    () =>
      financialYears.find(
        (year) => Number(year.id) === Number(effectiveFinancialYearId),
      ) || null,
    [financialYears, effectiveFinancialYearId],
  );

  const selectedYearReadOnly = selectedFinancialYear?.status !== "OPEN";
  const packagesQuery = useQuery({
    queryKey: ["cfo-package-review", "packages", effectiveFinancialYearId],
    queryFn: () => getCfoPackages(effectiveFinancialYearId),
    enabled: Boolean(effectiveFinancialYearId),
  });

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
  const activeFinancialYearId = effectiveFinancialYearId;
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
        summary.totalDepartments += Number(pkg.summary?.total_departments || 0);
        summary.submittedDepartments += Number(
          pkg.summary?.submitted_departments || 0,
        );
        summary.notSubmittedDepartments += Number(
          pkg.summary?.not_submitted_departments || 0,
        );
        summary.completedDepartments += Number(
          pkg.summary?.completed_departments || 0,
        );
        return summary;
      },
      {
        id: TOTAL_PACKAGE_ID,
        packageCount: 0,
        packageItems: 0,
        acceptedItems: 0,
        needsModificationItems: 0,
        estimatedTotal: 0,
        totalDepartments: 0,
        submittedDepartments: 0,
        notSubmittedDepartments: 0,
        completedDepartments: 0,
      },
    );
  }, [allPackages, showTotalPackage]);

  const annualDepartmentCoverage = useMemo(() => {
    const coverage = allPackages.reduce(
      (summary, pkg) => {
        summary.total += Number(pkg.summary?.total_departments || 0);
        summary.submitted += Number(pkg.summary?.submitted_departments || 0);
        summary.notSubmitted += Number(
          pkg.summary?.not_submitted_departments || 0,
        );
        summary.inReview += Number(pkg.summary?.in_review_departments || 0);
        summary.completed += Number(pkg.summary?.completed_departments || 0);
        return summary;
      },
      {
        total: 0,
        submitted: 0,
        notSubmitted: 0,
        inReview: 0,
        completed: 0,
      },
    );

    return {
      ...coverage,
      packages: allPackages.map((pkg) => ({
        id: pkg.id,
        categoryName: pkg.category_name,
        total: Number(pkg.summary?.total_departments || 0),
        submitted: Number(pkg.summary?.submitted_departments || 0),
      })),
    };
  }, [allPackages]);

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

  const distributionQuery = useQuery({
    queryKey: [
      "cfo-package-review",
      "distribution",
      distributionContext?.type || null,
      distributionContext?.financialYearId || null,
      distributionContext?.packageId || null,
      distributionContext?.packageItemId || null,
    ],
    queryFn: () =>
      distributionContext?.type === "FINANCIAL_YEAR"
        ? getCfoFinancialYearDistribution(distributionContext.financialYearId)
        : getCfoPackageDistribution({
            packageId: distributionContext.packageId,
            packageItemId: distributionContext.packageItemId || null,
          }),
    enabled: Boolean(distributionContext),
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
    <div className="min-h-screen  p-4 lg:p-6">
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
            <div className="block min-w-[220px]">
  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
    Financial year
  </span>

  <div className="mt-1">
    <SearchableMultiSelect
      name="financialYearId"
      multiple={false}
      disableClear
      value={effectiveFinancialYearId || ""}
      options={financialYears}
      disabled={
        financialYearsQuery.isLoading ||
        financialYears.length === 0
      }
      loading={financialYearsQuery.isLoading}
      placeholder={
        financialYearsQuery.isLoading
          ? "Loading financial years..."
          : financialYears.length === 0
            ? "No financial years"
            : "Select financial year"
      }
      searchPlaceholder="Search financial year..."
      noResultsText="No financial years found"
      maxVisibleBadges={1}
      getOptionValue={(year) => year.id}
      getOptionLabel={(year) =>
        `FY ${year.year} - ${year.status}`
      }
      onChange={(event) => {
        setSelectedFinancialYearId(
          event.target.value || null,
        );
        setSelectedPackageId(null);
        setSelectedPackageItemId(null);
        setIsPackageTimelineOpen(false);
        setDistributionContext(null);
        setPerspective("ITEMS");
      }}
    />
  </div>
</div>
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
                disabled={!activeFinancialYearId}
                onClick={() =>
                  setDistributionContext({
                    type: "FINANCIAL_YEAR",
                    financialYearId: activeFinancialYearId,
                    title: `FY ${selectedFinancialYear?.year || ""} Distribution`,
                    subtitle:
                      "All submitted category packages across IT, Biomedical, and General",
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays size={16} />
                Year Distribution
              </button>
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

        {allPackages.length > 0 ? (
          <DepartmentCoveragePanel
            financialYear={selectedFinancialYear?.year}
            coverage={annualDepartmentCoverage}
            packageBreakdown={annualDepartmentCoverage.packages}
          />
        ) : null}

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
                setIsPackageTimelineOpen(false);
                setDistributionContext(null);
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
              <div
                className={`grid gap-5 transition-all duration-300 ${
                  isPackageTimelineOpen
                    ? "xl:grid-cols-[minmax(0,1fr)_380px]"
                    : "grid-cols-1"
                }`}
              >
                <div className="min-w-0 space-y-5">
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

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDistributionContext({
                            type: "CATEGORY_PACKAGE",
                            packageId: selectedPackage.id,
                            title: `${selectedPackage.category_name} Package Distribution`,
                            subtitle: `FY ${selectedPackage.financial_year} approved package value across the year`,
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100"
                      >
                        <CalendarDays size={16} />
                        Package Distribution
                      </button>
                    </div>

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

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
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
                    <CfoMetric
                      label="Departments submitted"
                      value={`${
                        selectedPackage.summary?.departmentCoverage
                          ?.submittedDepartments || 0
                      } of ${
                        selectedPackage.summary?.departmentCoverage
                          ?.totalDepartments || 0
                      }`}
                    />
                    <CfoMetric
                      label="Not submitted"
                      value={
                        selectedPackage.summary?.departmentCoverage
                          ?.notSubmittedDepartments || 0
                      }
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

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={perspective}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {perspective === "ITEMS" ? (
                      <CfoPackageItemsView
                        packageId={selectedPackage.id}
                        items={packageItems}
                        selectedItemId={effectiveSelectedPackageItemId}
                        itemDetail={itemDetailQuery.data}
                        loadingDetail={itemDetailQuery.isLoading}
                        canDecide={
                          canDecide && !selectedYearReadOnly && packageInReview
                        }
                        onSelectItem={setSelectedPackageItemId}
                        onAccept={(item) => setModal({ type: "ACCEPT", item })}
                        onNeedsModification={(item) =>
                          setModal({ type: "NEEDS_MODIFICATION", item })
                        }
                        onViewDistribution={(item) =>
                          setDistributionContext({
                            type: "PACKAGE_ITEM",
                            packageId: selectedPackage.id,
                            packageItemId: item.id,
                            title: `${item.catalog_item_name} Distribution`,
                            subtitle: `${selectedPackage.category_name} package - FY ${selectedPackage.financial_year}`,
                          })
                        }
                      />
                    ) : (
                      <CfoDepartmentView
                        departments={
                          packageData?.departmentView?.departments || []
                        }
                        packageId={selectedPackage.id}
                        onSelectPackageItem={(packageItemId) => {
                          setSelectedPackageItemId(packageItemId);
                          setPerspective("ITEMS");
                        }}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                  {isPackageTimelineOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 380, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="hidden overflow-hidden xl:block"
                    >
                      <div className="sticky top-6 h-[calc(100vh-120px)]">
                        <BudgetTimeline
                          budgetId={selectedPackage.id}
                          queryKey={[
                            "cfo-package-review",
                            "timeline",
                            selectedPackage.id,
                          ]}
                          queryFn={() => getCfoPackageTimeline(selectedPackage.id)}
                          enabled={Boolean(selectedPackage.id)}
                          title={`${selectedPackage.category_name} Timeline`}
                          subtitle={`FY ${selectedPackage.financial_year} package workflow history`}
                          emptyMessage="CFO package workflow actions will appear here."
                          onToggle={() => setIsPackageTimelineOpen(false)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isPackageTimelineOpen && (
                  <button
                    type="button"
                    onClick={() => setIsPackageTimelineOpen(true)}
                    className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl transition hover:scale-105"
                  >
                    <PanelRightOpen size={18} />
                    <span className="text-sm font-semibold">Timeline</span>
                  </button>
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

      <PackageDistributionDrawer
        open={Boolean(distributionContext)}
        onClose={() => setDistributionContext(null)}
        title={distributionContext?.title}
        subtitle={distributionContext?.subtitle}
        data={distributionQuery.data}
        loading={distributionQuery.isLoading}
        error={distributionQuery.error}
      />
    </div>
  );
}
