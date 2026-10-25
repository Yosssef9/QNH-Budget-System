import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { isCountableUnit } from "../../utils/approvedDistribution";
import {
  AlertCircle,
  ClipboardCheck,
  Lock,
  RotateCcw,
} from "lucide-react";

import ConfirmModal from "../../components/ConfirmModal";
import CategoryReviewWorkflowTabs from "../../components/category-review/CategoryReviewWorkflowTabs";
import { CfoRevisionNotice } from "../../components/category-review/CfoRevisionFeedback.jsx";
import { CategoryBackNavigationProvider, useCategoryBackOverlay } from "../../components/category-review/CategoryBackNavigation";
import CategoryReviewItemDrawer from "../../components/category-review/CategoryReviewItemDrawer";
import DepartmentReviewStage from "../../components/category-review/DepartmentReviewStage";
import CategoryExclusionTabs from "../../components/category-review/CategoryExclusionTabs";
import BudgetExcludedItemsView from "../../components/budgets/shared/exclusions/BudgetExcludedItemsView";
import { groupBudgetExclusions } from "../../components/budgets/shared/exclusions/budgetExclusionGroups";
import { getBudgetExclusions } from "../../api/budgetExclusions.api";
import CategoryPackageSubmissionStage from "../../components/category-review/CategoryPackageSubmissionStage";
import CategoryPackageWorkbench from "../../components/category-packages/CategoryPackageWorkbench";
import {
  closeCategorySubmissionWindow,
  completeDepartmentCategoryReview,
  getCategoryReviewBudget,
  getCategoryReviewQueue,
  reopenCategorySubmissionWindow,
  reopenDepartmentCategoryReview,
  saveCategoryReviewItemDecision,
} from "../../api/categoryReview.api";
import {
  getCurrentCategoryPackage,
  updateDepartmentItemApprovedQuantity,
} from "../../api/categoryPackages.api";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";

const VALID_STAGES = new Set(["departments", "package", "submit"]);
const VALID_DEPARTMENT_VIEWS = new Set(["reviews", "demand"]);
const VALID_PACKAGE_VIEWS = new Set(["items", "departments", "distribution"]);

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeApprovedDistributionDraft(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    period_type: String(row.period_type || "").toUpperCase(),
    period_no: Number(row.period_no),
    quantity: row.quantity,
  }));
}

function distributionDraftSignature(rows = []) {
  return JSON.stringify(
    normalizeApprovedDistributionDraft(rows).map((row) => ({
      period_type: row.period_type,
      period_no: row.period_no,
      quantity: Number(row.quantity || 0),
    })),
  );
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function statusLabel(value) {
  return String(value || "UNKNOWN").replaceAll("_", " ");
}

function StatusPill({ value, tone }) {
  const inferredTone =
    tone ||
    (value === "OPEN"
      ? "emerald"
      : value === "CLOSED"
        ? "rose"
        : value === "DRAFT"
          ? "blue"
          : value === "RETURNED_BY_CFO"
            ? "amber"
            : "slate");
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={classNames(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
        tones[inferredTone] || tones.slate,
      )}
    >
      {statusLabel(value)}
    </span>
  );
}

function StageUnavailable({ title, description }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-1 text-sm leading-6">{description}</p>
        </div>
      </div>
    </section>
  );
}

export default function CategoryReviewPage() {
  return (
    <CategoryBackNavigationProvider>
      <CategoryReviewContent />
    </CategoryBackNavigationProvider>
  );
}

function CategoryReviewContent() {
  const queryClient = useQueryClient();
  const { budgetAccess } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedStage = searchParams.get("stage");
  const activeStage = VALID_STAGES.has(requestedStage)
    ? requestedStage
    : "departments";
  const focusedPackageItemId = Number(searchParams.get("item")) || null;
  const requestedView = searchParams.get("view");
  const activeDepartmentView = VALID_DEPARTMENT_VIEWS.has(requestedView)
    ? requestedView
    : "reviews";
  const activePackageView = VALID_PACKAGE_VIEWS.has(requestedView)
    ? requestedView
    : "items";

  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  // Keep each stage's content tab separate from its existing subview routing.
  const [stageContentTabs, setStageContentTabs] = useState({ departments: "main", package: "main" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [decisionDrafts, setDecisionDrafts] = useState({});
  const [savingItemIds, setSavingItemIds] = useState([]);
  const [reviewItemId, setReviewItemId] = useState(null);
  const [focusedDemandReview, setFocusedDemandReview] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [windowModal, setWindowModal] = useState(null);
  const [closeReason, setCloseReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const initializedBudgetIdRef = useRef(null);

  const canReviewItems = can(
    budgetAccess,
    PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS,
  );
  const canControlSubmissionWindow = can(
    budgetAccess,
    PERMISSION_CODES.CONTROL_CATEGORY_SUBMISSION_WINDOW,
  );
  const canManagePackage = can(
    budgetAccess,
    PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
  );
  const canSubmitPackage = can(
    budgetAccess,
    PERMISSION_CODES.SUBMIT_CATEGORY_BUDGET_PACKAGES_TO_PURCHASING,
  );
  const canViewPackage = canManagePackage;

  const queueQuery = useQuery({
    queryKey: ["category-review", "queue"],
    queryFn: getCategoryReviewQueue,
  });

  const packageQuery = useQuery({
    queryKey: ["category-packages", "current"],
    queryFn: getCurrentCategoryPackage,
    enabled: canViewPackage,
  });

  const budgets = useMemo(
    () => queueQuery.data?.budgets || [],
    [queueQuery.data?.budgets],
  );

  const selectedBudgetIdResolved = useMemo(() => {
    const eligible = statusFilter === "CFO_CHANGES"
      ? budgets.filter(budget => Number(budget.cfo_revision_item_count || 0) > 0)
      : statusFilter === "ALL" ? budgets : budgets.filter(budget => budget.status === statusFilter);
    const selectedStillExists = eligible.some(
      (budget) => Number(budget.id) === Number(selectedBudgetId),
    );
    if (selectedStillExists) return selectedBudgetId;
    return eligible[0]?.id || null;
  }, [budgets, selectedBudgetId, statusFilter]);

  const detailQuery = useQuery({
    queryKey: ["category-review", "budget", selectedBudgetIdResolved],
    queryFn: () => getCategoryReviewBudget(selectedBudgetIdResolved),
    enabled: Boolean(selectedBudgetIdResolved),
  });

  const selectedBudget = detailQuery.data;
  const submissionWindow = queueQuery.data?.submissionWindow || null;
  const packageData = packageQuery.data;

  const activeCategoryName =
    selectedBudget?.category_name ||
    budgets[0]?.category_name ||
    packageData?.category_name ||
    budgetAccess?.category?.name ||
    budgetAccess?.budgetCategory?.name ||
    "Assigned Category";

  const financialYear =
    selectedBudget?.financial_year ||
    budgets[0]?.financial_year ||
    packageData?.financial_year ||
    submissionWindow?.financial_year ||
    "—";

  // The API applies the Category Manager's server-side category scope.
  // Reuse the same query key as the existing Package Preparation workbench.
  const exclusionYearId = activeStage === "package"
    ? packageData?.financial_year_id || selectedBudget?.financial_year_id || budgets[0]?.financial_year_id
    : selectedBudget?.financial_year_id || budgets[0]?.financial_year_id || packageData?.financial_year_id;
  const exclusionsQuery = useQuery({
    queryKey: ["budget-exclusions", Number(exclusionYearId)],
    queryFn: () => getBudgetExclusions(exclusionYearId),
    enabled: Boolean(exclusionYearId) && (activeStage === "departments" || activeStage === "package"),
    staleTime: 10000,
  });
  const exclusionGroups = useMemo(() => groupBudgetExclusions(exclusionsQuery.data || []), [exclusionsQuery.data]);

  const overview = useMemo(() => {
    const result = budgets.reduce(
      (accumulator, budget) => {
        accumulator.departmentsInReview +=
          budget.status === "IN_CATEGORY_REVIEW" ? 1 : 0;
        accumulator.departmentsCompleted +=
          budget.status === "CATEGORY_REVIEW_COMPLETED" ? 1 : 0;
        accumulator.itemsPending += Number(budget.pending_count || 0);
        accumulator.itemsReviewed += Number(budget.reviewed_count || 0);
        accumulator.itemsTotal += Number(budget.item_count || 0);
        accumulator.totalRequested += Number(
          budget.total_requested_quantity || 0,
        );
        accumulator.totalApproved += Number(
          budget.total_approved_quantity || 0,
        );
        return accumulator;
      },
      {
        departmentsInReview: 0,
        departmentsCompleted: 0,
        itemsPending: 0,
        itemsReviewed: 0,
        itemsTotal: 0,
        totalRequested: 0,
        totalApproved: 0,
      },
    );

    result.progress =
      result.itemsTotal > 0
        ? (result.itemsReviewed / result.itemsTotal) * 100
        : 0;

    return result;
  }, [budgets]);

  const coverageRaw = queueQuery.data?.coverage || {};
  const coverage = {
    total: Number(coverageRaw.totalDepartments || 0),
    submitted: Number(coverageRaw.submittedDepartments || 0),
    notSubmitted: Number(coverageRaw.notSubmittedDepartments || 0),
    inReview: Number(coverageRaw.inReviewDepartments || 0),
    completed: Number(coverageRaw.completedDepartments || 0),
  };

  const filterCounts = useMemo(
    () => ({
      ALL: budgets.length,
      IN_CATEGORY_REVIEW: budgets.filter(
        (budget) => budget.status === "IN_CATEGORY_REVIEW",
      ).length,
      CATEGORY_REVIEW_COMPLETED: budgets.filter(
        (budget) => budget.status === "CATEGORY_REVIEW_COMPLETED",
      ).length,
      CFO_CHANGES: budgets.filter(budget => Number(budget.cfo_revision_item_count || 0) > 0).length,
    }),
    [budgets],
  );

  const filteredBudgets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return budgets
      .filter((budget) => {
        const matchesSearch =
          !normalizedSearch ||
          String(budget.department_name || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(budget.department_code || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(budget.hod_name || "")
            .toLowerCase()
            .includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "CFO_CHANGES"
            ? Number(budget.cfo_revision_item_count || 0) > 0
            : budget.status === statusFilter);
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const leftCompleted = left.status === "CATEGORY_REVIEW_COMPLETED";
        const rightCompleted = right.status === "CATEGORY_REVIEW_COMPLETED";

        if (leftCompleted !== rightCompleted) {
          return leftCompleted ? 1 : -1;
        }

        const pendingDifference =
          Number(right.pending_count || 0) - Number(left.pending_count || 0);
        if (pendingDifference !== 0) return pendingDifference;

        return String(left.department_name || "").localeCompare(
          String(right.department_name || ""),
        );
      });
  }, [budgets, search, statusFilter]);

  const reviewIsCompleted =
    selectedBudget?.status === "CATEGORY_REVIEW_COMPLETED";
  const canReopenDepartmentReview =
    canReviewItems &&
    reviewIsCompleted &&
    selectedBudget?.can_reopen_review === true;

  const selectedItemCount = Number(selectedBudget?.summary?.item_count || 0);
  const selectedReviewedCount = Number(
    selectedBudget?.summary?.reviewed_count || 0,
  );
  const canComplete =
    canReviewItems &&
    selectedItemCount > 0 &&
    selectedReviewedCount === selectedItemCount &&
    selectedBudget?.status === "IN_CATEGORY_REVIEW";

  const selectedReviewItem = (selectedBudget?.items || []).find(
    (item) => Number(item.id) === Number(reviewItemId),
  );

  useCategoryBackOverlay(Boolean(selectedReviewItem), () => setReviewItemId(null));
  useCategoryBackOverlay(completeModalOpen, () => setCompleteModalOpen(false));
  useCategoryBackOverlay(Boolean(windowModal), () => {
    setWindowModal(null);
    setCloseReason("");
    setReopenReason("");
  });

  useEffect(() => {
    if (!selectedReviewItem && reviewItemId !== null) {
      setReviewItemId(null);
    }
  }, [reviewItemId, selectedReviewItem]);

  useEffect(() => {
    if (!selectedBudget?.id) return;
    if (Number(initializedBudgetIdRef.current) === Number(selectedBudget.id)) {
      return;
    }
    initializedBudgetIdRef.current = selectedBudget.id;
    setReviewItemId(null);
  }, [selectedBudget?.id]);

  function selectStage(stage) {
    const next = new URLSearchParams(searchParams);
    next.set("stage", stage);

    if (stage === "departments") {
      next.set(
        "view",
        VALID_DEPARTMENT_VIEWS.has(next.get("view"))
          ? next.get("view")
          : "reviews",
      );
      next.delete("item");
    } else if (stage === "package") {
      next.set(
        "view",
        VALID_PACKAGE_VIEWS.has(next.get("view"))
          ? next.get("view")
          : "items",
      );
    } else {
      next.delete("view");
      next.delete("item");
    }

    setSearchParams(next, { replace: true });
  }

  function selectDepartmentView(view) {
    if (view === "demand") setFocusedDemandReview(null);
    const next = new URLSearchParams(searchParams);
    next.set("stage", "departments");
    next.set(
      "view",
      VALID_DEPARTMENT_VIEWS.has(view) ? view : "reviews",
    );
    next.delete("item");
    setSearchParams(next, { replace: true });
  }

  function goToDepartmentReview(departmentCategoryBudgetId, departmentBudgetItemId = null) {
    if (departmentCategoryBudgetId) {
      setSelectedBudgetId(departmentCategoryBudgetId);
    }
    // Requested Demand identifies both the department budget and the exact item.
    // The existing inline editor handles all permissions, saves and read-only states.
    setFocusedDemandReview(
      departmentCategoryBudgetId && departmentBudgetItemId
        ? {
            budgetId: Number(departmentCategoryBudgetId),
            itemId: Number(departmentBudgetItemId),
          }
        : null,
    );
    setSearch("");
    setStatusFilter("ALL");
    setReviewItemId(null);
    setStageContentTabs(current => ({ ...current, departments: "main" }));
    selectDepartmentView("reviews");
  }

  function selectPackageView(view) {
    const next = new URLSearchParams(searchParams);
    next.set("stage", "package");
    next.set("view", VALID_PACKAGE_VIEWS.has(view) ? view : "items");
    next.delete("item");
    setSearchParams(next, { replace: true });
  }

  function focusPackageItem(itemId) {
    setStageContentTabs(current => ({ ...current, package: "main" }));
    const next = new URLSearchParams(searchParams);
    next.set("stage", "package");
    next.set("view", "items");
    if (itemId) next.set("item", String(itemId));
    else next.delete("item");
    setSearchParams(next, { replace: true });
  }

  function clearFocusedPackageItem() {
    const next = new URLSearchParams(searchParams);
    next.delete("item");
    setSearchParams(next, { replace: true });
  }

  function getBaseDraft(item) {
    return {
      category_approved_quantity:
        item?.category_approved_quantity ?? item?.requested_quantity ?? "",
      review_note: item?.review_note || "",
      approved_distribution_mode:
        item?.approved_distribution_mode === "CUSTOM" ? "CUSTOM" : "AUTO",
      approved_distribution: normalizeApprovedDistributionDraft(
        item?.approved_distribution || [],
      ),
    };
  }

  function getDraft(item) {
    if (!item) return getBaseDraft(item);
    return {
      ...getBaseDraft(item),
      ...(decisionDrafts[item.id] || {}),
    };
  }

  function updateDraft(item, patch) {
    if (!item) return;
    setDecisionDrafts((current) => ({
      ...current,
      [item.id]: {
        ...getBaseDraft(item),
        ...(current[item.id] || {}),
        ...patch,
      },
    }));
  }

  function removeDecisionDraft(itemId) {
    setDecisionDrafts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }

  function isDraftDirty(item) {
    if (!item) return false;
    const storedDraft = decisionDrafts[item.id];
    if (!storedDraft) return false;

    const baseline = getBaseDraft(item);
    const storedMode =
      storedDraft.approved_distribution_mode === "CUSTOM" ? "CUSTOM" : "AUTO";
    const baselineMode =
      baseline.approved_distribution_mode === "CUSTOM" ? "CUSTOM" : "AUTO";

    return (
      String(storedDraft.category_approved_quantity ?? "") !==
        String(baseline.category_approved_quantity ?? "") ||
      String(storedDraft.review_note || "") !==
        String(baseline.review_note || "") ||
      storedMode !== baselineMode ||
      (storedMode === "CUSTOM" &&
        distributionDraftSignature(storedDraft.approved_distribution) !==
          distributionDraftSignature(baseline.approved_distribution))
    );
  }

  function isReturnedCfoCorrectionItem(item) {
    return (
      canReviewItems &&
      selectedBudget?.status === "CATEGORY_REVIEW_COMPLETED" &&
      selectedBudget?.category_package_status === "RETURNED_BY_CFO" &&
      item?.package_item_cfo_review_status === "NEEDS_MODIFICATION"
    );
  }

  function isReviewItemLocked(item) {
    if (!canReviewItems) return true;
    if (selectedBudget?.status === "IN_CATEGORY_REVIEW") return false;
    return !isReturnedCfoCorrectionItem(item);
  }

  const decisionMutation = useMutation({
    mutationFn: saveCategoryReviewItemDecision,
  });

  const returnedCorrectionMutation = useMutation({
    mutationFn: updateDepartmentItemApprovedQuantity,
  });

  async function saveDecision(item, { advance = false } = {}) {
    if (!item) return;
    const draft = getDraft(item);
    const approvedQuantity = Number(draft.category_approved_quantity);

    if (
      draft.category_approved_quantity === "" ||
      draft.category_approved_quantity === null ||
      draft.category_approved_quantity === undefined ||
      !Number.isFinite(approvedQuantity) || approvedQuantity < 0
    ) {
      toast.error("Approved quantity must be zero or greater");
      return false;
    }

    const approvedDistributionMode =
      draft.approved_distribution_mode === "CUSTOM" ? "CUSTOM" : "AUTO";
    const approvedDistribution =
      approvedDistributionMode === "CUSTOM"
        ? normalizeApprovedDistributionDraft(draft.approved_distribution).map(
            (row) => ({
              ...row,
              quantity: Number(row.quantity),
            }),
          )
        : [];

    if (
      approvedDistributionMode === "CUSTOM"
    ) {
      const invalidRow = approvedDistribution.some(
        (row) =>
          !row.period_type ||
          !Number.isInteger(row.period_no) ||
          row.period_no <= 0 ||
          !Number.isFinite(row.quantity) ||
          row.quantity < 0,
      );
      const distributedQuantity = roundQuantity(
        approvedDistribution.reduce(
          (sum, row) => sum + Number(row.quantity || 0),
          0,
        ),
      );

      if (invalidRow || distributedQuantity !== roundQuantity(approvedQuantity)) {
        toast.error(
          "Custom approved distribution must be valid and equal the approved quantity",
        );
        return false;
      }
    }

    const budgetId =
      item.department_category_budget_id || selectedBudgetIdResolved;
    setSavingItemIds((current) => [...new Set([...current, item.id])]);

    try {
      if (isReturnedCfoCorrectionItem(item)) {
        await returnedCorrectionMutation.mutateAsync({
          departmentItemId: item.id,
          payload: {
            category_approved_quantity: approvedQuantity,
            approved_distribution_mode: approvedDistributionMode,
            approved_distribution: approvedDistribution,
            row_version: item.row_version,
          },
        });

        toast.success("CFO return correction saved");
        removeDecisionDraft(item.id);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["category-review", "budget", budgetId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["category-review", "queue"],
          }),
          queryClient.invalidateQueries({ queryKey: ["category-packages"] }),
        ]);

        if (advance) {
          const candidates = (selectedBudget?.items || []).filter(
            (currentItem) =>
              Number(currentItem.id) !== Number(item.id) &&
              currentItem.package_item_cfo_review_status ===
                "NEEDS_MODIFICATION",
          );
          if (candidates[0]) setReviewItemId(candidates[0].id);
        }
        return true;
      }

      const data = await decisionMutation.mutateAsync({
        itemId: item.id,
        payload: {
          category_approved_quantity: approvedQuantity,
          review_note: String(draft.review_note || "").trim(),
          approved_distribution_mode: approvedDistributionMode,
          approved_distribution: approvedDistribution,
        },
      });

      toast.success("Review decision saved");
      removeDecisionDraft(item.id);
      queryClient.setQueryData(["category-review", "budget", budgetId], data);
      await queryClient.invalidateQueries({
        queryKey: ["category-review", "queue"],
      });

      if (advance) {
        const items = data?.items || [];
        const currentIndex = items.findIndex(
          (currentItem) => Number(currentItem.id) === Number(item.id),
        );
        const orderedCandidates = [
          ...items.slice(currentIndex + 1),
          ...items.slice(0, Math.max(0, currentIndex)),
        ];
        const nextPending = orderedCandidates.find(
          (currentItem) =>
            currentItem.review_status !== "CATEGORY_REVIEW_COMPLETED",
        );
        const nextItem = nextPending || items[currentIndex + 1] || null;

        if (nextItem) {
          setReviewItemId(nextItem.id);
        } else {
          toast.success("This is the last item in the department");
        }
      }
      return true;
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save review decision",
      );
      return false;
    } finally {
      setSavingItemIds((current) =>
        current.filter((itemId) => Number(itemId) !== Number(item.id)),
      );
    }
  }


  // Requested Demand approves the SAME catalog item across different department
  // budgets. Save against each row's own budget and permission state, not the
  // department currently selected in the left queue.
  async function saveRequestedDemandApprovedQuantity({ budget, item, quantity }) {
    if (!canReviewItems || !budget || !item) return false;
    const returnedCorrection =
      budget.status === "CATEGORY_REVIEW_COMPLETED" &&
      budget.category_package_status === "RETURNED_BY_CFO" &&
      item.package_item_cfo_review_status === "NEEDS_MODIFICATION";
    if (budget.status !== "IN_CATEGORY_REVIEW" && !returnedCorrection) {
      toast.error("This department item is read-only in the current review stage");
      return false;
    }
    const approved = Number(quantity);
    if (quantity === "" || quantity === null || !Number.isFinite(approved) ||
        approved < 0 || (isCountableUnit(item) && !Number.isInteger(approved))) {
      toast.error("Enter a valid approved quantity");
      return false;
    }
    if (!returnedCorrection && item.approved_distribution_mode === "CUSTOM") {
      toast.error("Use View Approval to update custom period distributions");
      return false;
    }
    if (savingItemIds.includes(item.id)) return false;
    setSavingItemIds((current) => [...new Set([...current, item.id])]);
    try {
      if (returnedCorrection) {
        await returnedCorrectionMutation.mutateAsync({
          departmentItemId: item.id,
          payload: { category_approved_quantity: approved, row_version: item.row_version },
        });
      } else {
        await decisionMutation.mutateAsync({
          itemId: item.id,
          payload: {
            category_approved_quantity: approved,
            review_note: item.review_note || "",
            approved_distribution_mode: "AUTO",
            approved_distribution: [],
          },
        });
      }
      removeDecisionDraft(item.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["category-review", "budget", budget.id] }),
        queryClient.invalidateQueries({ queryKey: ["category-review", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["category-packages"] }),
      ]);
      toast.success(returnedCorrection ? "Approved quantity updated" : "Review decision saved");
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save approved quantity");
      return false;
    } finally {
      setSavingItemIds((current) => current.filter((id) => Number(id) !== Number(item.id)));
    }
  }

  const completeMutation = useMutation({
    mutationFn: completeDepartmentCategoryReview,
    onSuccess: async (data) => {
      toast.success("Department category review completed");
      setCompleteModalOpen(false);
      setReviewItemId(null);
      queryClient.setQueryData(
        ["category-review", "budget", selectedBudgetIdResolved],
        data,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["category-review", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["category-packages"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to complete review",
      );
    },
  });

  const reopenReviewMutation = useMutation({
    mutationFn: reopenDepartmentCategoryReview,
    onSuccess: async (data) => {
      toast.success("Department review returned to In Review");
      queryClient.setQueryData(
        ["category-review", "budget", selectedBudgetIdResolved],
        data,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["category-review", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["category-packages"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to return department review to In Review",
      );
    },
  });

  function reopenSelectedDepartmentReview() {
    if (!selectedBudget?.id || !selectedBudget?.row_version) {
      toast.error(
        "The department review data is incomplete. Refresh the page and try again.",
      );
      return;
    }

    reopenReviewMutation.mutate({
      departmentCategoryBudgetId: selectedBudget.id,
      rowVersion: selectedBudget.row_version,
    });
  }

  async function refreshWindowAndPackage() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["category-review"],
        refetchType: "active",
      }),
      queryClient.invalidateQueries({
        queryKey: ["category-packages"],
        refetchType: "active",
      }),
    ]);
  }

  const closeWindowMutation = useMutation({
    mutationFn: closeCategorySubmissionWindow,
    onSuccess: async () => {
      await refreshWindowAndPackage();
      setWindowModal(null);
      setCloseReason("");
      toast.success("Category submission window closed");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to close category submission window",
      );
    },
  });

  const reopenWindowMutation = useMutation({
    mutationFn: reopenCategorySubmissionWindow,
    onSuccess: async () => {
      await refreshWindowAndPackage();
      setWindowModal(null);
      setReopenReason("");
      toast.success("Category submission window reopened");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to reopen category submission window",
      );
    },
  });

  const windowIsOpen = submissionWindow?.status === "OPEN";
  const windowMutationPending =
    closeWindowMutation.isPending || reopenWindowMutation.isPending;

  const packageReady = Boolean(packageData?.readiness?.ready);
  const packagePreparationBlockers = (packageData?.readiness?.blockers || []).filter(
    (blocker) => blocker.packageItemId || blocker.packageSubItemId,
  );
  const packagePreparationReady =
    Boolean(packageData?.items?.length) && packagePreparationBlockers.length === 0;
  const packagePreparationBlockerCount = packagePreparationBlockers.length;
  const submittedCount = coverage.submitted;
  const departmentStageComplete =
    submittedCount > 0 && coverage.completed === submittedCount;

  const stageMeta = {
    departments: {
      complete: departmentStageComplete,
      badge:
        overview.itemsPending > 0
          ? `${overview.itemsPending} pending`
          : budgets.length
            ? "Reviewed"
            : "No submissions",
      tone: overview.itemsPending > 0 ? "warning" : "success",
    },
    package: {
      complete: packagePreparationReady,
      badge: packageQuery.isLoading
        ? "Loading"
        : packageQuery.isError
          ? "Unavailable"
          : packagePreparationReady
            ? "Prepared"
            : `${packagePreparationBlockerCount} item blocker${packagePreparationBlockerCount === 1 ? "" : "s"}`,
      tone: packagePreparationReady
        ? "success"
        : packagePreparationBlockerCount
          ? "warning"
          : "slate",
    },
    submit: {
      complete: packageData?.status === "IN_PURCHASING_REVIEW" ||
        packageData?.status === "IN_CFO_REVIEW" ||
        packageData?.status === "CFO_REVIEW_COMPLETED",
      badge:
        packageData?.status && packageData.status !== "DRAFT"
          ? statusLabel(packageData.status)
          : packageReady
            ? "Ready"
            : "Not ready",
      tone:
        packageReady ||
        ["IN_PURCHASING_REVIEW", "IN_CFO_REVIEW", "CFO_REVIEW_COMPLETED"].includes(
          packageData?.status,
        )
          ? "success"
          : "danger",
    },
  };

  const disabledStages = [];
  if (!canViewPackage) disabledStages.push("package", "submit");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <ClipboardCheck className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  Category Budget Manager Workspace
                </p>
                <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {activeCategoryName} Category Review
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Move freely between department review, package preparation and submission readiness. Final actions remain protected by the existing backend workflow rules.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:max-w-xl xl:justify-end">
              <StatusPill value={`FY ${financialYear}`} tone="slate" />
              <StatusPill value={submissionWindow?.status || "UNKNOWN"} />
              {packageData?.status ? <StatusPill value={packageData.status} /> : null}
              {canControlSubmissionWindow && submissionWindow ? (
                <button
                  type="button"
                  disabled={windowMutationPending}
                  onClick={() => setWindowModal(windowIsOpen ? "CLOSE" : "REOPEN")}
                  className={classNames(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                    windowIsOpen
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                  )}
                >
                  {windowIsOpen ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  {windowIsOpen ? "Close Submissions" : "Reopen Submissions"}
                </button>
              ) : null}
            </div>
          </div>

          {activeStage !== "package" && packageData?.status === "RETURNED_BY_CFO" ? (
            <div className="mt-4">
              <CfoRevisionNotice categoryName={packageData.category_name} items={packageData.items || []}
                returnReason={packageData.return_reason} compact
                onReviewAffected={() => focusPackageItem(null)} />
            </div>
          ) : null}
        </header>

        <CategoryReviewWorkflowTabs
          value={activeStage}
          onChange={selectStage}
          meta={stageMeta}
          disabledStages={disabledStages}
        />

        {(activeStage === "departments" || (activeStage === "package" && canViewPackage)) ? (
          <CategoryExclusionTabs
            stage={activeStage}
            value={stageContentTabs[activeStage]}
            onChange={tab => setStageContentTabs(current => ({ ...current, [activeStage]: tab }))}
            count={exclusionGroups.length}
            loading={exclusionsQuery.isLoading}
          />
        ) : null}

        {activeStage === "departments" ? (
          <section
            id="category-workflow-panel-departments"
            role="tabpanel"
            aria-labelledby="category-workflow-tab-departments"
            className="min-w-0"
          >
          <div
            id="category-exclusion-panel-departments-main"
            role="tabpanel"
            aria-labelledby="category-exclusion-tab-departments-main"
            className={stageContentTabs.departments === "main" ? "" : "hidden"}
          >
          <DepartmentReviewStage
            activeView={activeDepartmentView}
            onViewChange={selectDepartmentView}
            requestedDemand={queueQuery.data?.requestedDemand}
            onGoToDepartmentReview={goToDepartmentReview}
            onSaveRequestedDemandApprovedQuantity={saveRequestedDemandApprovedQuantity}
            queueLoading={queueQuery.isLoading}
            queueError={queueQuery.error}
            onRetryQueue={() => queueQuery.refetch()}
            budgets={budgets}
            filteredBudgets={filteredBudgets}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            filterCounts={filterCounts}
            cfoPackageItems={packageData?.items || []}
            cfoPackageStatus={packageData?.status}
            onOpenPackageItem={canViewPackage ? focusPackageItem : null}
            selectedBudget={selectedBudget}
            selectedBudgetId={selectedBudgetIdResolved}
            onSelectBudget={(budgetId) => {
              setSelectedBudgetId(budgetId);
              setFocusedDemandReview(null);
              setReviewItemId(null);
            }}
            detailLoading={detailQuery.isLoading}
            detailError={detailQuery.error}
            onRetryDetail={() => detailQuery.refetch()}
            overview={overview}
            coverage={coverage}
            onReviewItem={setReviewItemId}
            focusedDemandItemId={
              focusedDemandReview &&
              Number(focusedDemandReview.budgetId) === Number(selectedBudget?.id)
                ? focusedDemandReview.itemId
                : null
            }
            canReviewItems={canReviewItems}
            onInlineSave={(item) => saveDecision(item)}
            getItemDraft={getDraft}
            onItemDraftChange={updateDraft}
            isItemSaving={(item) => savingItemIds.includes(item.id)}
            isItemDraftDirty={isDraftDirty}
            canComplete={canComplete}
            onCompleteReview={() => setCompleteModalOpen(true)}
            canReopenReview={canReopenDepartmentReview}
            onReopenReview={reopenSelectedDepartmentReview}
            reopenPending={reopenReviewMutation.isPending}
          />
          </div>
          <div
            id="category-exclusion-panel-departments-excluded"
            role="tabpanel"
            aria-labelledby="category-exclusion-tab-departments-excluded"
            className={stageContentTabs.departments === "excluded" ? "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" : "hidden"}
          >
            {stageContentTabs.departments === "excluded" ? <BudgetExcludedItemsView financialYearId={exclusionYearId} audience="Category Manager" query={exclusionsQuery}/> : null}
          </div>
          </section>
        ) : null}

        {activeStage === "package" ? (
          canViewPackage ? (
            <section
              id="category-workflow-panel-package"
              role="tabpanel"
              aria-labelledby="category-workflow-tab-package"
              className="min-w-0"
            >
              <div
                id="category-exclusion-panel-package-main"
                role="tabpanel"
                aria-labelledby="category-exclusion-tab-package-main"
                className={stageContentTabs.package === "main" ? "" : "hidden"}
              >
              <CategoryPackageWorkbench
                focusItemId={focusedPackageItemId}
                onClearFocusItem={clearFocusedPackageItem}
                view={activePackageView}
                onViewChange={selectPackageView}
              />
              </div>
              <div
                id="category-exclusion-panel-package-excluded"
                role="tabpanel"
                aria-labelledby="category-exclusion-tab-package-excluded"
                className={stageContentTabs.package === "excluded" ? "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" : "hidden"}
              >
                {stageContentTabs.package === "excluded" ? <BudgetExcludedItemsView financialYearId={exclusionYearId} audience="Category Manager" query={exclusionsQuery}/> : null}
              </div>
            </section>
          ) : (
            <StageUnavailable
              title="Package Preparation is not available"
              description="Your current workspace does not have the package-management permission required for this stage."
            />
          )
        ) : null}

        {activeStage === "submit" ? (
          canViewPackage ? (
            <CategoryPackageSubmissionStage
              packageData={packageData}
              loading={packageQuery.isLoading}
              error={packageQuery.error}
              onRetry={() => packageQuery.refetch()}
              canSubmit={canSubmitPackage}
              canControlSubmissionWindow={canControlSubmissionWindow}
              onCloseSubmissionWindow={() => setWindowModal("CLOSE")}
              windowMutationPending={windowMutationPending}
              onResolveBlocker={(blocker) =>
                focusPackageItem(blocker.packageItemId)
              }
            />
          ) : (
            <StageUnavailable
              title="Submission Readiness is not available"
              description="Your current workspace does not have access to the category package workflow."
            />
          )
        ) : null}
      </div>

      <CategoryReviewItemDrawer
        open={Boolean(selectedReviewItem)}
        onClose={() => setReviewItemId(null)}
        item={selectedReviewItem}
        departmentName={selectedBudget?.department_name}
        hodName={selectedBudget?.hod_name}
        draft={getDraft(selectedReviewItem)}
        dirty={isDraftDirty(selectedReviewItem)}
        locked={isReviewItemLocked(selectedReviewItem)}
        returnedCorrection={isReturnedCfoCorrectionItem(selectedReviewItem)}
        saving={savingItemIds.some(
          (itemId) => Number(itemId) === Number(selectedReviewItem?.id),
        )}
        onDraftChange={(patch) => updateDraft(selectedReviewItem, patch)}
        onSave={() => saveDecision(selectedReviewItem)}
        onSaveAndNext={() => saveDecision(selectedReviewItem, { advance: true })}
      />

      <ConfirmModal
        open={completeModalOpen}
        title="Complete Department Category Review"
        message={`Complete the ${selectedBudget?.category_name || "category"} review for ${selectedBudget?.department_name || "this department"}? Every active item must already be reviewed.`}
        confirmText="Complete Review"
        cancelText="Cancel"
        loading={completeMutation.isPending}
        onCancel={() => setCompleteModalOpen(false)}
        onConfirm={() => completeMutation.mutate(selectedBudget?.id)}
      >
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>{selectedReviewedCount}</strong> of <strong>{selectedItemCount}</strong> items are reviewed.
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={windowModal === "CLOSE"}
        title="Close Category Submission Window?"
        message={`Close ${activeCategoryName} submissions for FY ${financialYear}? Departments that have not submitted will no longer be able to submit this category through the normal window.`}
        confirmText="Close Submissions"
        cancelText="Cancel"
        loading={closeWindowMutation.isPending}
        onCancel={() => {
          setWindowModal(null);
          setCloseReason("");
        }}
        onConfirm={() =>
          closeWindowMutation.mutate({ closeReason: closeReason.trim() })
        }
      >
        <label className="mt-4 block text-sm font-black text-slate-700">
          Close reason <span className="font-medium text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={closeReason}
          onChange={(event) => setCloseReason(event.target.value)}
          placeholder="Optional reason or cutoff note"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        />
      </ConfirmModal>

      <ConfirmModal
        open={windowModal === "REOPEN"}
        title="Reopen Category Submission Window?"
        message={`Reopen ${activeCategoryName} submissions for FY ${financialYear}? Departments will be able to submit again if the backend workflow still allows reopening.`}
        confirmText="Reopen Submissions"
        cancelText="Cancel"
        loading={reopenWindowMutation.isPending}
        onCancel={() => {
          setWindowModal(null);
          setReopenReason("");
        }}
        onConfirm={() => {
          const reason = reopenReason.trim();
          if (!reason) {
            toast.error("A reopen reason is required");
            return;
          }
          reopenWindowMutation.mutate({ reopenReason: reason });
        }}
      >
        <label className="mt-4 block text-sm font-black text-slate-700">
          Reopen reason
        </label>
        <textarea
          rows={3}
          value={reopenReason}
          onChange={(event) => setReopenReason(event.target.value)}
          placeholder="Explain why submissions need to reopen"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        />
      </ConfirmModal>
    </main>
  );
}
