import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import ConfirmModal from "../../components/ConfirmModal";
import CurrencyText from "../../components/CurrencyText";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import { useAuth } from "../../context/AuthContext";
import {
  useBudgetSubItems,
  useCreateBudgetSubItem,
} from "../../hooks/budget-sub-items/useBudgetSubItems";
import {
  useCategoryReviewDetails,
  useCategoryReviews,
  useCreateReviewSubItem,
  useDeleteReviewAttachment,
  useDeleteReviewSubItem,
  useDeleteReviewSubItemAttachment,
  useDepartmentRequestItemsForReview,
  useDownloadReviewAttachment,
  useDownloadReviewSubItemAttachment,
  useReviewAttachments,
  useReviewSubItemAttachments,
  useReturnDepartmentCategoryBudget,
  useSubmitCategoryReviewPackageToCfo,
  useUpdateApprovedQuantity,
  useUpdateCategoryReviewStatus,
  useUpdateDepartmentRequestItemReview,
  useUpdateReviewSubItem,
  useUploadReviewAttachment,
  useUploadReviewSubItemAttachment,
} from "../../hooks/category-reviews/useCategoryReviews";
import { toNumber } from "../../utils/number";

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

function statusBadgeClass(status) {
  switch (status) {
    case "REVIEWED_ACCEPTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "NEEDS_MODIFICATION":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "SUBMITTED_TO_CFO":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "RETURNED":
      return "border-red-200 bg-red-50 text-red-700";
    case "IN_REVIEW":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatStatus(status) {
  return String(status || "NOT_REVIEWED")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName || "attachment";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function validateAttachmentFile(file) {
  if (!file) return false;

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    toast.error("Attachment file size must not exceed 5 MB");
    return false;
  }

  return true;
}

export default function CategoryBudgetManagementPage() {
  const { activeWorkspace } = useAuth();
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [approvedQuantity, setApprovedQuantity] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnNote, setReturnNote] = useState("");
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const { data: reviewListData, isLoading: loadingReviews } =
    useCategoryReviews();
  const reviews = reviewListData?.reviews || [];
  const packageRow = reviewListData?.package;

  const { data: detailsData, isLoading: loadingDetails } =
    useCategoryReviewDetails(selectedReviewId);
  const { data: departmentRequestData } =
    useDepartmentRequestItemsForReview(selectedReviewId);
  const { data: attachments = [] } = useReviewAttachments(selectedReviewId);

  const selectedReview = detailsData?.review;
  const departmentContributions = detailsData?.departmentContributions || [];
  const selectedSubItems = detailsData?.selectedSubItems || [];
  const departmentRequestItems =
    departmentRequestData?.departmentRequestItems || [];

  const { data: subItemMasterData } = useBudgetSubItems(
    selectedReview?.budget_type_id
      ? { budgetTypeId: selectedReview.budget_type_id }
      : {},
  );
  const reusableSubItems = subItemMasterData?.subItems || [];

  const updateApprovedQuantityMutation = useUpdateApprovedQuantity();
  const updateCategoryReviewStatusMutation = useUpdateCategoryReviewStatus();
  const updateDepartmentRequestItemReviewMutation =
    useUpdateDepartmentRequestItemReview();
  const returnDepartmentCategoryBudgetMutation =
    useReturnDepartmentCategoryBudget();
  const submitPackageMutation = useSubmitCategoryReviewPackageToCfo();

  const selectedSubItemQuantity = useMemo(
    () =>
      selectedSubItems.reduce(
        (sum, line) => sum + toNumber(line.quantity),
        0,
      ),
    [selectedSubItems],
  );

  const selectedSubItemTotal = useMemo(
    () =>
      selectedSubItems.reduce(
        (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unit_cost),
        0,
      ),
    [selectedSubItems],
  );

  const quantityMatches =
    Number.isFinite(toNumber(selectedReview?.approved_quantity)) &&
    Math.abs(
      toNumber(selectedReview?.approved_quantity) - selectedSubItemQuantity,
    ) < 0.0001;

  useEffect(() => {
    if (!selectedReviewId && reviews.length > 0) {
      setSelectedReviewId(reviews[0].id);
    }
  }, [reviews, selectedReviewId]);

  useEffect(() => {
    setApprovedQuantity(
      selectedReview?.approved_quantity === null ||
        selectedReview?.approved_quantity === undefined
        ? ""
        : String(Number(selectedReview.approved_quantity)),
    );
    setReviewNote(selectedReview?.category_note || "");
  }, [selectedReview]);

  async function saveApprovedQuantity() {
    if (!selectedReviewId) return;

    try {
      await updateApprovedQuantityMutation.mutateAsync({
        reviewId: selectedReviewId,
        approvedQuantity: toNumber(approvedQuantity),
      });
      toast.success("Approved quantity saved");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save approved quantity",
      );
    }
  }

  async function setReviewStatus(status) {
    if (!selectedReviewId) return;

    if (status === "REVIEWED_ACCEPTED" && !quantityMatches) {
      toast.error("Selected sub-item quantity must equal approved quantity");
      return;
    }

    if (status === "NEEDS_MODIFICATION" && !reviewNote.trim()) {
      toast.error("A note is required when the item needs modification");
      return;
    }

    try {
      await updateCategoryReviewStatusMutation.mutateAsync({
        reviewId: selectedReviewId,
        payload: {
          status,
          note: reviewNote.trim() || null,
        },
      });
      toast.success("Review status updated");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update review status",
      );
    }
  }

  async function submitPackageToCfo() {
    if (!packageRow?.id) return;

    try {
      await submitPackageMutation.mutateAsync({ packageId: packageRow.id });
      toast.success("Category package submitted to CFO");
      setConfirmSubmitOpen(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to submit package to CFO",
        { duration: 7000 },
      );
    }
  }

  async function returnDepartmentBudget() {
    if (!returnTarget) return;

    if (!returnNote.trim()) {
      toast.error("Return note is required");
      return;
    }

    try {
      await returnDepartmentCategoryBudgetMutation.mutateAsync({
        categoryBudgetId: returnTarget.department_category_budget_id,
        payload: { returnNote: returnNote.trim() },
      });
      toast.success("Department category budget returned");
      setReturnTarget(null);
      setReturnNote("");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to return department budget",
      );
    }
  }

  return (
    <div className="space-y-6 p-6 text-slate-800">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <PackageCheck size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Category Budget Management
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Acting as {activeWorkspace?.title || "Category Budget Manager"}.
                Review consolidated requests, prepare sub-items and pricing,
                then submit the package to CFO.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!packageRow?.id || submitPackageMutation.isPending}
            onClick={() => setConfirmSubmitOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={18} />
            Submit Package to CFO
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">
              Consolidated Items
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              One record per budget type in this category.
            </p>
          </div>

          <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-4">
            {loadingReviews ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={18} />
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
                No submitted department requests are available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const active = Number(review.id) === Number(selectedReviewId);

                  return (
                    <button
                      key={review.id}
                      type="button"
                      onClick={() => setSelectedReviewId(review.id)}
                      className={[
                        "w-full rounded-2xl border p-4 text-left transition",
                        active
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {review.budget_type_name}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {review.department_count || 0} department(s)
                          </p>
                        </div>

                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                            statusBadgeClass(review.category_review_status),
                          ].join(" ")}
                        >
                          {formatStatus(review.category_review_status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <Metric label="Requested" value={review.total_requested_quantity} />
                        <Metric label="Approved" value={review.approved_quantity ?? "-"} />
                        <Metric label="Sub Qty" value={review.total_selected_sub_item_quantity} />
                        <Metric
                          label="Total"
                          value={<CurrencyText value={review.total_price || 0} />}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {!selectedReviewId ? (
            <EmptyState />
          ) : loadingDetails ? (
            <div className="flex min-h-[480px] items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Loading review details...
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {selectedReview?.budget_type_name}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {selectedReview?.category_name} / Financial Year{" "}
                      {selectedReview?.financial_year}
                    </p>
                  </div>

                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-bold",
                      statusBadgeClass(selectedReview?.category_review_status),
                    ].join(" ")}
                  >
                    {formatStatus(selectedReview?.category_review_status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <MetricCard
                    label="Total Requested"
                    value={selectedReview?.total_requested_quantity}
                  />
                  <MetricCard
                    label="Approved Quantity"
                    value={selectedReview?.approved_quantity ?? "-"}
                  />
                  <MetricCard label="Selected Sub-Item Qty" value={selectedSubItemQuantity} />
                  <MetricCard
                    label="Total Price"
                    value={<CurrencyText value={selectedSubItemTotal} />}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Department Contributions
                </h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3 text-right">
                          Requested Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departmentContributions.map((row) => (
                        <tr key={row.department_id}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {row.department_name}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">
                            {Number(row.requested_quantity || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Approved Quantity & Review Status
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Approved quantity may be greater than requested, but it
                      must equal selected sub-item quantity before submission.
                    </p>
                  </div>

                  {!quantityMatches && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                      <AlertCircle size={15} />
                      Approved quantity and sub-item quantity do not match.
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[260px_1fr_auto] xl:items-start">
                  <label>
                    <span className="text-xs font-bold uppercase text-slate-500">
                      Approved Quantity
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={approvedQuantity}
                      onChange={(event) => setApprovedQuantity(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-bold uppercase text-slate-500">
                      Review Note
                    </span>
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      rows={3}
                      placeholder="Optional when accepted. Required when marked needs modification."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2 xl:pt-6">
                    <button
                      type="button"
                      onClick={saveApprovedQuantity}
                      disabled={updateApprovedQuantityMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Save size={16} />
                      Save Qty
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatus("REVIEWED_ACCEPTED")}
                      disabled={updateCategoryReviewStatusMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatus("NEEDS_MODIFICATION")}
                      disabled={updateCategoryReviewStatusMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      Needs Modification
                    </button>
                  </div>
                </div>
              </section>

              <SubItemsSection
                review={selectedReview}
                reusableSubItems={reusableSubItems}
                selectedSubItems={selectedSubItems}
              />

              <AttachmentsSection
                reviewId={selectedReviewId}
                attachments={attachments}
              />

              <DepartmentRequestReviewSection
                rows={departmentRequestItems}
                onReturn={(target) => {
                  setReturnTarget(target);
                  setReturnNote("");
                }}
                mutation={updateDepartmentRequestItemReviewMutation}
              />
            </>
          )}
        </main>
      </div>

      <ConfirmModal
        open={confirmSubmitOpen}
        title="Submit category package to CFO?"
        message="The CFO will review the consolidated package. Package submission is blocked if any item is not accepted or selected sub-item quantities do not match approved quantities."
        confirmText="Submit to CFO"
        loading={submitPackageMutation.isPending}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={submitPackageToCfo}
      />

      <ConfirmModal
        open={Boolean(returnTarget)}
        title="Return department category budget?"
        message={
          returnTarget
            ? `Return ${returnTarget.department_name}'s category budget so the department can edit only items marked as needing modification.`
            : ""
        }
        confirmText="Return Budget"
        loading={returnDepartmentCategoryBudgetMutation.isPending}
        onCancel={() => setReturnTarget(null)}
        onConfirm={returnDepartmentBudget}
      >
        <textarea
          value={returnNote}
          onChange={(event) => setReturnNote(event.target.value)}
          rows={4}
          placeholder="Explain what the department must modify."
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </ConfirmModal>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[480px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-blue-700">
          <PackageCheck size={28} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900">
          Select a consolidated item
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose a budget type from the left list to review department
          contributions, sub-items, pricing, and attachments.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value ?? 0}</p>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value ?? 0}</p>
    </div>
  );
}

function SubItemsSection({ review, reusableSubItems, selectedSubItems }) {
  const [newMasterOpen, setNewMasterOpen] = useState(false);
  const [masterName, setMasterName] = useState("");
  const [masterSpec, setMasterSpec] = useState("");
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");
  const [editingLines, setEditingLines] = useState({});

  const createBudgetSubItemMutation = useCreateBudgetSubItem();
  const createReviewSubItemMutation = useCreateReviewSubItem();
  const updateReviewSubItemMutation = useUpdateReviewSubItem();
  const deleteReviewSubItemMutation = useDeleteReviewSubItem();

  async function createMasterSubItem() {
    if (!masterName.trim()) {
      toast.error("Sub-item name is required");
      return;
    }

    try {
      const created = await createBudgetSubItemMutation.mutateAsync({
        budgetTypeId: review.budget_type_id,
        name: masterName.trim(),
        specificationSummary: masterSpec.trim() || null,
      });

      setSelectedMasterId(created.id);
      setMasterName("");
      setMasterSpec("");
      setNewMasterOpen(false);
      toast.success("Reusable sub-item created");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create sub-item");
    }
  }

  async function addSelectedSubItem() {
    if (!selectedMasterId) {
      toast.error("Select a reusable sub-item");
      return;
    }

    if (toNumber(quantity) <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    try {
      await createReviewSubItemMutation.mutateAsync({
        reviewId: review.id,
        payload: {
          budgetSubItemId: Number(selectedMasterId),
          quantity: toNumber(quantity),
          unitCost: toNumber(unitCost),
          note: note.trim() || null,
        },
      });

      setSelectedMasterId("");
      setQuantity("");
      setUnitCost("");
      setNote("");
      toast.success("Sub-item added to review");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add sub-item");
    }
  }

  async function saveLine(line) {
    const draft = editingLines[line.id] || {};

    try {
      await updateReviewSubItemMutation.mutateAsync({
        reviewId: review.id,
        lineId: line.id,
        payload: {
          quantity: toNumber(draft.quantity ?? line.quantity),
          unitCost: toNumber(draft.unit_cost ?? line.unit_cost),
          note: draft.note ?? line.note ?? null,
        },
      });

      setEditingLines((current) => {
        const next = { ...current };
        delete next[line.id];
        return next;
      });
      toast.success("Sub-item line saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save sub-item");
    }
  }

  async function deleteLine(line) {
    try {
      await deleteReviewSubItemMutation.mutateAsync({
        reviewId: review.id,
        lineId: line.id,
      });
      toast.success("Sub-item removed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove sub-item");
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Selected Sub-Items & Pricing
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Pricing exists only on selected sub-item lines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setNewMasterOpen((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
        >
          <Plus size={16} />
          New Reusable Sub-Item
        </button>
      </div>

      {newMasterOpen && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
          <label>
            <span className="text-xs font-bold uppercase text-slate-500">
              Name
            </span>
            <input
              value={masterName}
              onChange={(event) => setMasterName(event.target.value)}
              placeholder="Dell Latitude 16GB"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="text-xs font-bold uppercase text-slate-500">
              Specification
            </span>
            <input
              value={masterSpec}
              onChange={(event) => setMasterSpec(event.target.value)}
              placeholder="Short technical summary"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={createMasterSubItem}
            disabled={createBudgetSubItemMutation.isPending}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1.4fr_120px_140px_1fr_auto] xl:items-end">
        <SearchableMultiSelect
          multiple={false}
          disableClear
          value={selectedMasterId}
          onChange={(event) => setSelectedMasterId(event.target.value)}
          options={reusableSubItems}
          getOptionValue={(item) => item.id}
          getOptionLabel={(item) => item.name}
          placeholder="Select reusable sub-item"
          searchPlaceholder="Search sub-items..."
        />
        <input
          type="number"
          min="0"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="Qty"
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
        <input
          type="number"
          min="0"
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
          placeholder="Unit cost"
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={addSelectedSubItem}
          disabled={createReviewSubItemMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Sub-Item</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Unit Cost</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Attachments</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {selectedSubItems.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                  No sub-items selected yet.
                </td>
              </tr>
            ) : (
              selectedSubItems.map((line) => {
                const draft = editingLines[line.id] || {};

                return (
                  <tr key={line.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {line.sub_item_name_snapshot}
                      </p>
                      {line.specification_snapshot && (
                        <p className="mt-1 text-xs text-slate-500">
                          {line.specification_snapshot}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={draft.quantity ?? Number(line.quantity || 0)}
                        onChange={(event) =>
                          setEditingLines((current) => ({
                            ...current,
                            [line.id]: {
                              ...current[line.id],
                              quantity: event.target.value,
                            },
                          }))
                        }
                        className="h-10 w-24 rounded-lg border border-slate-200 px-2 text-center text-sm font-bold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={draft.unit_cost ?? Number(line.unit_cost || 0)}
                        onChange={(event) =>
                          setEditingLines((current) => ({
                            ...current,
                            [line.id]: {
                              ...current[line.id],
                              unit_cost: event.target.value,
                            },
                          }))
                        }
                        className="h-10 w-28 rounded-lg border border-slate-200 px-2 text-center text-sm font-bold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-700">
                      <CurrencyText
                        value={
                          toNumber(draft.quantity ?? line.quantity) *
                          toNumber(draft.unit_cost ?? line.unit_cost)
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={draft.note ?? line.note ?? ""}
                        onChange={(event) =>
                          setEditingLines((current) => ({
                            ...current,
                            [line.id]: {
                              ...current[line.id],
                              note: event.target.value,
                            },
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <SubItemAttachments reviewId={review.id} line={line} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => saveLine(line)}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLine(line)}
                          className="rounded-lg bg-red-50 p-2 text-red-500 transition hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AttachmentsSection({ reviewId, attachments }) {
  const [description, setDescription] = useState("");
  const fileInputRef = useRef(null);
  const uploadMutation = useUploadReviewAttachment();
  const deleteMutation = useDeleteReviewAttachment();
  const downloadMutation = useDownloadReviewAttachment();

  async function uploadFile(file) {
    if (!validateAttachmentFile(file)) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);

    try {
      await uploadMutation.mutateAsync({ reviewId, formData });
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Attachment uploaded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload attachment");
    }
  }

  async function downloadAttachment(attachment) {
    try {
      const blob = await downloadMutation.mutateAsync({
        reviewId,
        attachmentId: attachment.id,
      });
      downloadBlob(blob, attachment.original_file_name);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download file");
    }
  }

  async function deleteAttachment(attachment) {
    try {
      await deleteMutation.mutateAsync({
        reviewId,
        attachmentId: attachment.id,
      });
      toast.success("Attachment removed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove attachment");
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">
        Consolidated Item Attachments
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Attachments explain the consolidated type-level recommendation for CFO.
        Maximum file size is 5 MB.
      </p>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional description"
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100">
          <FileUp size={16} />
          Upload Attachment
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(event) => uploadFile(event.target.files?.[0])}
          />
        </label>
      </div>

      <AttachmentList
        attachments={attachments}
        onDownload={downloadAttachment}
        onDelete={deleteAttachment}
      />
    </section>
  );
}

function SubItemAttachments({ reviewId, line }) {
  const fileInputRef = useRef(null);
  const { data: attachments = [] } = useReviewSubItemAttachments(
    reviewId,
    line.id,
  );
  const uploadMutation = useUploadReviewSubItemAttachment();
  const downloadMutation = useDownloadReviewSubItemAttachment();
  const deleteMutation = useDeleteReviewSubItemAttachment();

  async function uploadFile(file) {
    if (!validateAttachmentFile(file)) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadMutation.mutateAsync({
        reviewId,
        lineId: line.id,
        formData,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Sub-item attachment uploaded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload attachment");
    }
  }

  async function downloadAttachment(attachment) {
    try {
      const blob = await downloadMutation.mutateAsync({
        reviewId,
        lineId: line.id,
        attachmentId: attachment.id,
      });
      downloadBlob(blob, attachment.original_file_name);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download file");
    }
  }

  async function deleteAttachment(attachment) {
    try {
      await deleteMutation.mutateAsync({
        reviewId,
        lineId: line.id,
        attachmentId: attachment.id,
      });
      toast.success("Attachment removed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove attachment");
    }
  }

  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
        Upload
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(event) => uploadFile(event.target.files?.[0])}
        />
      </label>
      <AttachmentList
        compact
        attachments={attachments}
        onDownload={downloadAttachment}
        onDelete={deleteAttachment}
      />
    </div>
  );
}

function AttachmentList({ attachments, onDownload, onDelete, compact = false }) {
  if (!attachments.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm font-semibold text-slate-500">
        No attachments.
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "mt-4 space-y-2"}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        >
          <button
            type="button"
            onClick={() => onDownload(attachment)}
            className="min-w-0 truncate text-left font-bold text-blue-700 hover:text-blue-800"
          >
            {attachment.original_file_name}
          </button>

          <button
            type="button"
            onClick={() => onDelete(attachment)}
            className="shrink-0 rounded-lg bg-red-50 p-1.5 text-red-500 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function DepartmentRequestReviewSection({ rows, onReturn, mutation }) {
  const [notes, setNotes] = useState({});
  const departments = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const key = row.department_category_budget_id;
      if (!map.has(key)) {
        map.set(key, {
          department_category_budget_id: row.department_category_budget_id,
          department_name: row.department_name,
          rows: [],
        });
      }
      map.get(key).rows.push(row);
    });

    return Array.from(map.values());
  }, [rows]);

  async function updateItem(row, reviewStatus) {
    const note = notes[row.request_item_id] || "";

    if (reviewStatus === "NEEDS_MODIFICATION" && !note.trim()) {
      toast.error("A note is required when an item needs modification");
      return;
    }

    try {
      await mutation.mutateAsync({
        requestItemId: row.request_item_id,
        payload: {
          reviewStatus,
          note: note.trim() || null,
        },
      });
      toast.success("Department request item reviewed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to review item");
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">
        Department Request Review
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Accepted items become read-only if the budget is returned. Items marked
        needs modification remain editable for the department.
      </p>

      <div className="mt-4 space-y-4">
        {departments.map((department) => {
          const hasNeedsModification = department.rows.some(
            (row) => row.review_status === "NEEDS_MODIFICATION",
          );

          return (
            <div
              key={department.department_category_budget_id}
              className="overflow-hidden rounded-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                <h4 className="font-bold text-slate-900">
                  {department.department_name}
                </h4>
                <button
                  type="button"
                  disabled={!hasNeedsModification}
                  onClick={() => onReturn(department)}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Return Budget
                </button>
              </div>

              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-white text-left text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Requested</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {department.rows.map((row) => (
                    <tr key={row.request_item_id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {row.budget_type_name}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">
                        {Number(row.requested_quantity || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-xs font-bold",
                            statusBadgeClass(row.review_status),
                          ].join(" ")}
                        >
                          {formatStatus(row.review_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={notes[row.request_item_id] ?? row.review_note ?? ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [row.request_item_id]: event.target.value,
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                          placeholder="Review note"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(row, "REVIEWED_ACCEPTED")
                            }
                            className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(row, "NEEDS_MODIFICATION")
                            }
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                          >
                            Needs Changes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}
