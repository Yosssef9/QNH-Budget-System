/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Download,
  Eye,
  FileText,
  FilePlus2,
  History,
  Layers3,
  Loader2,
  Lock,
  PackageCheck,
  PackagePlus,
  Paperclip,
  Pencil,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import ConfirmModal from "../ConfirmModal";
import CurrencyText from "../CurrencyText";
import Input from "../Input";
import SearchableMultiSelect from "../SearchableMultiSelect";
import CatalogSubItemFields from "../catalog/CatalogSubItemFields";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import BudgetItemRequestNoteDrawer from "../budgets/shared/drawers/BudgetItemRequestNoteDrawer";
import PackageSubItemPriceIntelligenceDrawer from "../budgets/price-intelligence/PackageSubItemPriceIntelligenceDrawer";
import PackageDistributionDrawer from "./PackageDistributionDrawer";
import PackageSubItemPriceHistoryDrawer from "./PackageSubItemPriceHistoryDrawer";
import { usePackageSubItemPriceHistory } from "../../hooks/category-packages/usePackageSubItemPriceHistory";
import {
  downloadBlobAttachment,
  viewBlobAttachment,
} from "../../helpers/attachmentPreview.helper";
import {
  createPackageSubItem,
  deletePackageSubItemAttachment,
  downloadPackageSubItemAttachment,
  getCategoryPackageDepartments,
  getCategoryPackageDistribution,
  getCategoryPackageItemDetail,
  getCurrentCategoryPackage,
  getPackageSubItemAttachments,
  removePackageSubItem,
  replaceDepartmentItemAllocations,
  uploadPackageSubItemAttachment,
  updatePackageSubItem,
} from "../../api/categoryPackages.api";
import {
  createSetupSubItem,
  getSetupSubItemsByCatalogItem,
  getSetupUnitsOfMeasure,
} from "../../api/budgetSetup.api";

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

const EMPTY_REUSABLE_MODEL = {
  name: "",
  default_specification: "",
  default_unit_of_measure_id: "",
};

const PACKAGE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "NEEDS_MODIFICATION", label: "CFO Changes" },
  { value: "NEEDS_SETUP", label: "Needs Setup" },
  { value: "NEEDS_ATTENTION", label: "Needs Attention" },
  { value: "RECONCILED", label: "Reconciled" },
];

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function isValidUnitPrice(value) {
  if (value === null || value === undefined || value === "") return false;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0;
}

function getManagerUnitPrice(subItem) {
  return subItem?.category_manager_unit_price ?? subItem?.unit_price ?? null;
}

function formatNumber(value) {
  return numberFormatter.format(toNumber(value));
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(status) {
  return String(status || "UNKNOWN").replaceAll("_", " ");
}

function isPackageItemEditable(packageStatus, item) {
  if (packageStatus === "DRAFT") return true;
  return (
    packageStatus === "RETURNED_BY_CFO" &&
    item?.cfo_review_status === "NEEDS_MODIFICATION"
  );
}

function getStatusMeta(status) {
  const statusMap = {
    RECONCILED: {
      border: "border-emerald-200",
      background: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    SHORT: {
      border: "border-amber-200",
      background: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    EXCESS: {
      border: "border-rose-200",
      background: "bg-rose-50",
      text: "text-rose-700",
      dot: "bg-rose-500",
    },
    NOT_CONFIGURED: {
      border: "border-slate-200",
      background: "bg-slate-50",
      text: "text-slate-700",
      dot: "bg-slate-400",
    },
    NEEDS_RECONCILIATION: {
      border: "border-violet-200",
      background: "bg-violet-50",
      text: "text-violet-700",
      dot: "bg-violet-500",
    },
    DRAFT: {
      border: "border-blue-200",
      background: "bg-blue-50",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    RETURNED_BY_CFO: {
      border: "border-amber-200",
      background: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    IN_CFO_REVIEW: {
      border: "border-indigo-200",
      background: "bg-indigo-50",
      text: "text-indigo-700",
      dot: "bg-indigo-500",
    },
    IN_PURCHASING_REVIEW: {
      border: "border-violet-200",
      background: "bg-violet-50",
      text: "text-violet-700",
      dot: "bg-violet-500",
    },
    CFO_REVIEW_COMPLETED: {
      border: "border-emerald-200",
      background: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    PENDING_CFO_REVIEW: {
      border: "border-indigo-200",
      background: "bg-indigo-50",
      text: "text-indigo-700",
      dot: "bg-indigo-500",
    },
    CFO_ACCEPTED: {
      border: "border-emerald-200",
      background: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    NEEDS_MODIFICATION: {
      border: "border-amber-200",
      background: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
  };

  return (
    statusMap[status] || {
      border: "border-slate-200",
      background: "bg-slate-50",
      text: "text-slate-700",
      dot: "bg-slate-400",
    }
  );
}

function StatusBadge({ status, compact = false }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full border font-bold",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        meta.border,
        meta.background,
        meta.text,
      )}
    >
      <span className={classNames("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {formatStatus(status)}
    </span>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone = "slate" }) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-700",
    blue: "border-blue-200 bg-blue-50/70 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/70 text-amber-700",
    rose: "border-rose-200 bg-rose-50/70 text-rose-700",
  };

  const title =
    typeof value === "string" || typeof value === "number"
      ? String(value)
      : undefined;

  return (
    <div className={classNames("rounded-2xl border p-4", toneMap[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide opacity-75">
            {label}
          </p>
          <div
            title={title}
            className="mt-1 min-w-0 max-w-full break-words text-2xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere]"
          >
            {value}
          </div>
          {helper ? (
            <p className="mt-1 min-w-0 break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
              {helper}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function QuantityProgress({ approved, allocated }) {
  const approvedValue = toNumber(approved);
  const allocatedValue = toNumber(allocated);
  const percentage =
    approvedValue <= 0
      ? allocatedValue > 0
        ? 100
        : 0
      : Math.min((allocatedValue / approvedValue) * 100, 100);
  const excess = allocatedValue > approvedValue;

  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={classNames(
            "h-full rounded-full transition-[width] duration-300",
            excess
              ? "bg-rose-500"
              : percentage === 100
                ? "bg-emerald-500"
                : "bg-blue-500",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-slate-500">
        <span>{formatNumber(allocatedValue)} allocated</span>
        <span>{formatNumber(approvedValue)} approved</span>
      </div>
    </div>
  );
}

function EmptyQueue({ icon: Icon, title, message }) {
  return (
    <div className="flex min-h-64 items-center justify-center p-6 text-center">
      <div>
        <Icon className="mx-auto h-11 w-11 text-slate-300" />
        <h3 className="mt-3 text-base font-black text-slate-900">{title}</h3>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

function DrawerHeader({ eyebrow, title, description, onClose, children }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close drawer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function AddModelDrawer({
  open,
  onClose,
  packageItem,
  existingPackageSubItems,
  onAddPackageModel,
  addingPackageModel,
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("SELECT");
  const [catalogSubItemId, setCatalogSubItemId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [specification, setSpecification] = useState("");
  const [note, setNote] = useState("");
  const [reusableForm, setReusableForm] = useState(EMPTY_REUSABLE_MODEL);

  useEffect(() => {
    if (!open) return;

    setMode("SELECT");
    setCatalogSubItemId("");
    setUnitPrice("");
    setSpecification("");
    setNote("");
    setReusableForm(EMPTY_REUSABLE_MODEL);
  }, [open, packageItem?.id]);

  const reusableQuery = useQuery({
    queryKey: ["budget-setup", "sub-items", packageItem?.catalog_item_id],
    queryFn: () => getSetupSubItemsByCatalogItem(packageItem.catalog_item_id),
    enabled: open && Boolean(packageItem?.catalog_item_id),
  });

  const unitsQuery = useQuery({
    queryKey: ["budget-setup", "units-of-measure"],
    queryFn: getSetupUnitsOfMeasure,
    enabled: open && mode === "CREATE",
  });

  const usedReusableIds = useMemo(
    () =>
      new Set(
        (existingPackageSubItems || []).map((subItem) =>
          Number(subItem.catalog_sub_item_id),
        ),
      ),
    [existingPackageSubItems],
  );

  const availableReusableModels = useMemo(
    () =>
      (reusableQuery.data || []).filter(
        (subItem) =>
          subItem.is_active !== false &&
          !usedReusableIds.has(Number(subItem.id)),
      ),
    [reusableQuery.data, usedReusableIds],
  );

  const selectedReusableModel = availableReusableModels.find(
    (subItem) => Number(subItem.id) === Number(catalogSubItemId),
  );

  const createReusableMutation = useMutation({
    mutationFn: createSetupSubItem,
    onSuccess: async (created) => {
      toast.success("Reusable model created");
      await queryClient.invalidateQueries({
        queryKey: ["budget-setup", "sub-items", packageItem.catalog_item_id],
      });
      setCatalogSubItemId(String(created.id));
      setSpecification(created.default_specification || "");
      setReusableForm(EMPTY_REUSABLE_MODEL);
      setMode("SELECT");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to create reusable model",
      );
    },
  });

  function selectReusableModel(nextId) {
    setCatalogSubItemId(nextId);
    const selected = availableReusableModels.find(
      (subItem) => Number(subItem.id) === Number(nextId),
    );
    setSpecification(selected?.default_specification || "");
  }

  function submitPackageModel() {
    if (!catalogSubItemId) {
      toast.error("Select a reusable model");
      return;
    }

    if (unitPrice === "" || toNumber(unitPrice) <= 0) {
      toast.error("Enter a valid shared unit price");
      return;
    }

    onAddPackageModel({
      catalog_sub_item_id: Number(catalogSubItemId),
      category_manager_unit_price: Number(unitPrice),
      specification: specification.trim() || null,
      note: note.trim() || null,
    });
  }

  function submitReusableModel() {
    if (!reusableForm.name.trim() || !reusableForm.default_unit_of_measure_id) {
      toast.error("Complete the reusable model name and unit");
      return;
    }

    createReusableMutation.mutate({
      catalogItemId: packageItem.catalog_item_id,
      payload: {
        name: reusableForm.name.trim(),
        default_specification:
          reusableForm.default_specification.trim() || null,
        default_unit_of_measure_id: Number(
          reusableForm.default_unit_of_measure_id,
        ),
        is_default_general: false,
      },
    });
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-white">
        <DrawerHeader
          eyebrow="Add Hospital Package Model"
          title={packageItem?.catalog_item_name || "Package item"}
          description="Select an existing reusable catalog model, or create a new reusable model under this generic item. The model identity is locked after it is added to the package."
          onClose={onClose}
        >
          <div
            role="tablist"
            aria-label="Add package model method"
            className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-200/70 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "SELECT"}
              onClick={() => setMode("SELECT")}
              className={classNames(
                "rounded-lg px-3 py-2 text-sm font-bold transition",
                mode === "SELECT"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Select Existing
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "CREATE"}
              onClick={() => setMode("CREATE")}
              className={classNames(
                "rounded-lg px-3 py-2 text-sm font-bold transition",
                mode === "CREATE"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Create Reusable Model
            </button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {mode === "SELECT" ? (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Reusable catalog model
                  <span className="ml-1 text-rose-500">*</span>
                </label>
                <SearchableMultiSelect
                  multiple={false}
                  value={catalogSubItemId}
                  onChange={(event) => selectReusableModel(event.target.value)}
                  options={availableReusableModels}
                  loading={reusableQuery.isLoading}
                  disabled={reusableQuery.isLoading}
                  placeholder={
                    reusableQuery.isLoading
                      ? "Loading reusable models..."
                      : "Select reusable model"
                  }
                  searchPlaceholder="Search model name or code..."
                  noResultsText="No unused reusable models found"
                  getOptionLabel={(subItem) =>
                    `${subItem.name}${
                      subItem.sub_item_code ? ` (${subItem.sub_item_code})` : ""
                    }${subItem.is_default_general ? " — General" : ""}`
                  }
                  getOptionValue={(subItem) => String(subItem.id)}
                />
                {reusableQuery.isError ? (
                  <p className="mt-2 text-sm font-semibold text-rose-600">
                    The reusable-model lookup failed. Apply the Master Catalog
                    lookup permission fix described with this file.
                  </p>
                ) : null}
              </div>

              {selectedReusableModel ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        Selected reusable model
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        {selectedReusableModel.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {selectedReusableModel.sub_item_code || "No code"} ·{" "}
                        {selectedReusableModel.unit_name || "No unit"}
                        {selectedReusableModel.unit_code
                          ? ` (${selectedReusableModel.unit_code})`
                          : ""}
                      </p>
                    </div>
                    {selectedReusableModel.is_default_general ? (
                      <StatusBadge status="GENERAL" compact />
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedReusableModel.default_specification ||
                      "No default specification is stored for this reusable model."}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Category Manager proposed price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  placeholder="Enter the proposed hospital-wide price"
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Quantity
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    System calculated
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    The package quantity is calculated from department
                    allocations and cannot be entered separately.
                  </p>
                </div>
              </div>

              <Input
                label="Shared package specification"
                multiline
                rows={5}
                value={specification}
                onChange={(event) => setSpecification(event.target.value)}
                placeholder="Year-specific specification shared by every department receiving this model"
              />

              <Input
                label="Shared package note"
                multiline
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional warranty, delivery, or procurement note"
              />

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p className="font-black">Shared model rule</p>
                <p className="mt-1">
                  This model, price, specification, note, and attachment set are
                  shared for all departments. Departments only receive different
                  allocation quantities.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-black text-slate-950">
                  Create under{" "}
                  {packageItem?.catalog_item_name || "catalog item"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This creates a reusable catalog model using the same
                  validation and database records as Catalog Administration.
                  After it is created, it will be selected automatically so you
                  can add the year-specific package snapshot.
                </p>
              </div>

              <CatalogSubItemFields
                value={reusableForm}
                onChange={setReusableForm}
                unitsOfMeasure={unitsQuery.data || []}
                loadingUnitsOfMeasure={unitsQuery.isLoading}
                disabled={createReusableMutation.isPending}
              />

              <button
                type="button"
                disabled={
                  createReusableMutation.isPending ||
                  unitsQuery.isLoading ||
                  !reusableForm.name.trim() ||
                  !reusableForm.default_unit_of_measure_id
                }
                onClick={submitReusableModel}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {createReusableMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePlus2 className="h-4 w-4" />
                )}
                Create Reusable Model
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={addingPackageModel || createReusableMutation.isPending}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {mode === "SELECT" ? (
              <button
                type="button"
                disabled={
                  addingPackageModel ||
                  !catalogSubItemId ||
                  unitPrice === "" ||
                  toNumber(unitPrice) <= 0
                }
                onClick={submitPackageModel}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {addingPackageModel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="h-4 w-4" />
                )}
                Add Model to Package
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </AnimatedDrawer>
  );
}

function PackageAttachmentManager({ subItem, open, editable }) {
  const queryClient = useQueryClient();
  const [removeCandidate, setRemoveCandidate] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [attachmentNote, setAttachmentNote] = useState("");

  const packageSubItemId = subItem?.id;
  useEffect(() => {
    if (open) setAttachmentNote("");
  }, [open, packageSubItemId]);

  const attachmentsQuery = useQuery({
    queryKey: [
      "category-packages",
      "sub-items",
      packageSubItemId,
      "attachments",
    ],
    queryFn: () => getPackageSubItemAttachments(packageSubItemId),
    enabled: open && Boolean(packageSubItemId),
  });

  async function invalidateAttachments() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          "category-packages",
          "sub-items",
          packageSubItemId,
          "attachments",
        ],
      }),
      queryClient.invalidateQueries({ queryKey: ["category-packages"] }),
    ]);
  }

  const uploadMutation = useMutation({
    mutationFn: ({ file, description }) =>
      uploadPackageSubItemAttachment({
        packageSubItemId,
        file,
        payload: { description: description || null },
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        },
      }),
    onSuccess: async () => {
      toast.success("Attachment uploaded");
      setUploadProgress(null);
      setAttachmentNote("");
      await invalidateAttachments();
    },
    onError: (error) => {
      setUploadProgress(null);
      toast.error(
        error?.response?.data?.message || "Failed to upload attachment",
      );
    },
  });

  const downloadMutation = useMutation({
    mutationFn: downloadPackageSubItemAttachment,
    onSuccess: (response, variables) => {
      const attachment = (attachmentsQuery.data || []).find(
        (item) => Number(item.id) === Number(variables.attachmentId),
      );
      downloadBlobAttachment({
        blob: response.data,
        fileName: attachment?.original_file_name || "attachment",
      });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to download attachment",
      );
    },
  });

  const viewMutation = useMutation({
    mutationFn: downloadPackageSubItemAttachment,
    onSuccess: (response, variables) => {
      const attachment = (attachmentsQuery.data || []).find(
        (item) => Number(item.id) === Number(variables.attachmentId),
      );
      viewBlobAttachment({
        blob: response.data,
        fileName: attachment?.original_file_name || "attachment",
      });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to view attachment",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePackageSubItemAttachment,
    onSuccess: async () => {
      toast.success("Attachment removed");
      setRemoveCandidate(null);
      await invalidateAttachments();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to remove attachment",
      );
    },
  });

  const attachments = attachmentsQuery.data || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black text-slate-950">Shared attachments</p>
          <p className="mt-1 text-sm text-slate-500">
            These files apply to this package model for every department
            allocation.
          </p>
        </div>
        {editable ? (
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800">
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Upload
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              disabled={uploadMutation.isPending}
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                const description = attachmentNote.trim();
                files.forEach((file) =>
                  uploadMutation.mutate({ file, description }),
                );
                event.target.value = "";
              }}
            />
          </label>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
            <Lock className="h-4 w-4" />
            Read-only
          </span>
        )}
      </div>

      {editable ? (
        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3">
          <Input
            label="Attachment note"
            value={attachmentNote}
            maxLength={500}
            onChange={(event) => setAttachmentNote(event.target.value)}
            placeholder="Optional context explaining this evidence"
          />
          <p className="mt-1 text-xs font-medium text-slate-500">
            This note applies to every file selected in the next upload.
          </p>
        </div>
      ) : null}

      {uploadProgress !== null ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Uploading {uploadProgress}%
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {attachmentsQuery.isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
            Loading attachments...
          </div>
        ) : attachmentsQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {attachmentsQuery.error?.response?.data?.message ||
              "Failed to load attachments"}
          </div>
        ) : attachments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center">
            <Paperclip className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700">
              No attachments yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Upload quotations, specifications, or supporting documents for
              this shared model.
            </p>
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {attachment.original_file_name}
                  </p>
                  {attachment.description ? (
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2 text-xs font-medium leading-5 text-violet-900">
                      {attachment.description}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {attachment.mime_type || "File"} ·{" "}
                    {formatFileSize(attachment.file_size_bytes)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Uploaded by {attachment.uploaded_by_name || "Unknown"} ·{" "}
                    {formatDateTime(attachment.uploaded_at)}
                  </p>
                  <span
                    className={classNames(
                      "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase",
                      attachment.attachment_source === "PURCHASING"
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-blue-200 bg-blue-50 text-blue-700",
                    )}
                  >
                    {attachment.attachment_source === "PURCHASING"
                      ? "Purchasing"
                      : "Category Manager"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    viewMutation.mutate({
                      packageSubItemId,
                      attachmentId: attachment.id,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadMutation.mutate({
                      packageSubItemId,
                      attachmentId: attachment.id,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                {editable &&
                attachment.attachment_source !== "PURCHASING" ? (
                  <button
                    type="button"
                    onClick={() => setRemoveCandidate(attachment)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={Boolean(removeCandidate)}
        title="Remove Attachment?"
        message={`Remove ${removeCandidate?.original_file_name || "this attachment"} from this shared package model?`}
        confirmText="Remove Attachment"
        cancelText="Cancel"
        loading={deleteMutation.isPending}
        onCancel={() => setRemoveCandidate(null)}
        onConfirm={() => {
          if (!removeCandidate?.row_version) {
            toast.error(
              "Attachment row version is missing. Refresh and try again.",
            );
            return;
          }

          deleteMutation.mutate({
            packageSubItemId,
            attachmentId: removeCandidate.id,
            payload: {
              row_version: removeCandidate.row_version,
              reason: "Removed by Category Manager",
            },
          });
        }}
      />
    </div>
  );
}

function EditModelDrawer({
  open,
  onClose,
  subItem,
  onSubmit,
  loading,
  editable,
  isReturnedCorrection,
}) {
  const [unitPrice, setUnitPrice] = useState("");
  const [specification, setSpecification] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    const managerPrice = subItem?.category_manager_unit_price;
    const previousSubmittedManagerPrice =
      subItem?.last_submitted_category_manager_unit_price;
    const lastPurchasingPrice = subItem?.last_purchasing_unit_price;
    const hasSavedRevision =
      previousSubmittedManagerPrice !== null &&
      previousSubmittedManagerPrice !== undefined &&
      managerPrice !== null &&
      managerPrice !== undefined &&
      Number(managerPrice) !== Number(previousSubmittedManagerPrice);
    const initialPrice =
      isReturnedCorrection && !hasSavedRevision && lastPurchasingPrice != null
        ? lastPurchasingPrice
        : getManagerUnitPrice(subItem);

    setUnitPrice(
      initialPrice === null || initialPrice === undefined
        ? ""
        : String(Number(initialPrice)),
    );
    setSpecification(subItem?.specification || "");
    setNote(subItem?.note || "");
  }, [isReturnedCorrection, open, subItem]);

  function submit() {
    if (!subItem?.row_version) {
      toast.error(
        "Model row version is missing. Refresh the package and try again.",
      );
      return;
    }

    if (unitPrice === "" || toNumber(unitPrice) <= 0) {
      toast.error("Enter a valid shared unit price");
      return;
    }

    onSubmit({
      row_version: subItem.row_version,
      category_manager_unit_price: Number(unitPrice),
      specification: specification.trim() || null,
      note: note.trim() || null,
    });
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-white">
        <DrawerHeader
          eyebrow="Edit Shared Package Model"
          title={subItem?.name || "Package model"}
          description="These details apply once to the hospital package model and are reused for every receiving department."
          onClose={onClose}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              <div>
                <p className="font-black text-slate-950">
                  Model identity locked
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  To use another reusable model, remove this package model and
                  add the correct model. Existing department allocations will be
                  shown before removal.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={
                isReturnedCorrection
                  ? "Revised Category Manager price"
                  : "Category Manager proposed price"
              }
              required
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              disabled={!editable}
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Current allocation
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {formatNumber(subItem?.quantity)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                System-calculated from department allocations
              </p>
            </div>
          </div>

          {isReturnedCorrection &&
          subItem?.latest_accepted_review_round != null ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-amber-950">
                    Price baseline reviewed by CFO
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Your revised price starts from the last Purchasing price unless you already saved a correction.
                  </p>
                </div>
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-black text-amber-800">
                  Round {subItem.latest_accepted_review_round}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-200 bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Previous manager proposal
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    <CurrencyText
                      value={
                        subItem.last_submitted_category_manager_unit_price
                      }
                    />
                  </p>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-black uppercase text-violet-700">
                    Purchasing price reviewed by CFO
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    <CurrencyText value={subItem.last_purchasing_unit_price} />
                  </p>
                  {subItem.last_purchasing_reviewed_by_name ? (
                    <p className="mt-1 text-xs font-semibold text-violet-700">
                      {subItem.last_purchasing_reviewed_by_name}
                      {subItem.last_purchasing_reviewed_at
                        ? ` · ${formatDateTime(subItem.last_purchasing_reviewed_at)}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <Input
            label="Shared specification"
            multiline
            rows={6}
            value={specification}
            onChange={(event) => setSpecification(event.target.value)}
          />

          <Input
            label="Shared package note"
            multiline
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <PackageAttachmentManager
            subItem={subItem}
            open={open}
            editable={editable}
          />
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Shared Details
            </button>
          </div>
        </div>
      </div>
    </AnimatedDrawer>
  );
}

function AllocationDrawer({
  open,
  onClose,
  department,
  packageItem,
  subItems,
  loadingDetail,
  onSubmit,
  saving,
}) {
  const [values, setValues] = useState({});

  useEffect(() => {
    if (!open || !department) return;

    const nextValues = {};
    for (const subItem of subItems || []) {
      const allocation = department.allocations?.find(
        (row) =>
          Number(row.category_budget_package_sub_item_id) ===
          Number(subItem.id),
      );
      nextValues[subItem.id] = allocation
        ? String(Number(allocation.allocated_quantity || 0))
        : "";
    }
    setValues(nextValues);
  }, [department, open, subItems]);

  const totalAllocated = Object.values(values).reduce(
    (sum, value) => sum + toNumber(value),
    0,
  );
  const approvedQuantity = toNumber(department?.approved_quantity);
  const requestedQuantity = toNumber(department?.requested_quantity);
  const remainingQuantity = approvedQuantity - totalAllocated;

  function updateAllocation(subItemId, value) {
    if (value !== "" && !/^\d+$/.test(value)) return;

    setValues((current) => ({
      ...current,
      [subItemId]: value,
    }));
  }

  function applyRemaining(subItemId) {
    if (remainingQuantity <= 0) return;
    const currentValue = toNumber(values[subItemId]);
    setValues((current) => ({
      ...current,
      [subItemId]: String(currentValue + remainingQuantity),
    }));
  }

  function submit() {
    if (!department) return;

    const unpricedAllocation = subItems.find(
      (subItem) =>
        toNumber(values[subItem.id]) > 0 &&
        !isValidUnitPrice(getManagerUnitPrice(subItem)),
    );

    if (unpricedAllocation) {
      toast.error(
        `Set a shared unit price for ${unpricedAllocation.name} before allocating it.`,
      );
      return;
    }

    if (remainingQuantity < 0) {
      toast.error(
        `Allocation exceeds the approved quantity by ${formatNumber(
          Math.abs(remainingQuantity),
        )}`,
      );
      return;
    }

    onSubmit({
      row_version: department.row_version,

      allocations: Object.entries(values).map(([packageSubItemId, value]) => ({
        package_sub_item_id: Number(packageSubItemId),

        allocated_quantity: toNumber(value),
      })),
    });
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-white">
        <DrawerHeader
          eyebrow="Department Model Allocation"
          title={department?.department_name || "Department"}
          description={`Split this department's approved ${
            packageItem?.catalog_item_name || "item"
          } quantity across the shared hospital package models.`}
          onClose={onClose}
        >
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Requested"
              value={formatNumber(requestedQuantity)}
              icon={ClipboardList}
            />
            <MetricCard
              label="Approved"
              value={formatNumber(approvedQuantity)}
              icon={CheckCircle2}
              tone="blue"
            />
            <MetricCard
              label="Allocated"
              value={formatNumber(totalAllocated)}
              icon={Layers3}
              tone={remainingQuantity < 0 ? "rose" : "emerald"}
            />
            <MetricCard
              label={remainingQuantity < 0 ? "Excess" : "Remaining"}
              value={formatNumber(Math.abs(remainingQuantity))}
              icon={AlertCircle}
              tone={
                remainingQuantity === 0
                  ? "emerald"
                  : remainingQuantity < 0
                    ? "rose"
                    : "amber"
              }
            />
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loadingDetail ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : subItems.length === 0 ? (
            <EmptyQueue
              icon={PackagePlus}
              title="No package models configured"
              message="Add at least one shared package model before allocating this department's approved quantity."
            />
          ) : (
            <div className="space-y-3">
              {subItems.map((subItem) => {
                const allocationValue = values[subItem.id] ?? "";

                const hasValidUnitPrice = isValidUnitPrice(
                  getManagerUnitPrice(subItem),
                );

                return (
                  <article
                    key={subItem.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-950">
                            {subItem.name}
                          </h3>
                          {subItem.is_default_general ? (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              General
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                          <span>
                            Manager proposed price:{" "}
                            {hasValidUnitPrice ? (
                              <CurrencyText value={getManagerUnitPrice(subItem)} />
                            ) : (
                              <span className="font-black text-amber-700">
                                Price required
                              </span>
                            )}
                          </span>
                          <span>
                            Unit: {subItem.unit_of_measure_name || "-"}
                            {subItem.unit_of_measure_code
                              ? ` (${subItem.unit_of_measure_code})`
                              : ""}
                          </span>
                          <span>
                            Hospital allocation:{" "}
                            {formatNumber(subItem.quantity)}
                          </span>
                          <span>
                            Attachments: {subItem.attachment_count || 0}
                          </span>
                        </div>
                        {subItem.specification ? (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                            {subItem.specification}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm italic text-slate-400">
                            No shared specification entered.
                          </p>
                        )}
                      </div>
                      <div>
                        {!hasValidUnitPrice ? (
                          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                              <div>
                                <p className="text-xs font-black text-amber-900">
                                  Proposed unit price required
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-800">
                                  Set the model unit price from Shared Models
                                  and Pricing before allocating it to
                                  departments.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <Input
                          label="Department quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={allocationValue}
                          onChange={(event) =>
                            updateAllocation(subItem.id, event.target.value)
                          }
                          disabled={saving || !hasValidUnitPrice}
                        />

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => applyRemaining(subItem.id)}
                            disabled={
                              saving ||
                              remainingQuantity <= 0 ||
                              !hasValidUnitPrice
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Use remaining
                          </button>

                          <button
                            type="button"
                            onClick={() => updateAllocation(subItem.id, "")}
                            disabled={saving || allocationValue === ""}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="mb-3">
            <QuantityProgress
              approved={approvedQuantity}
              allocated={totalAllocated}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={classNames(
                  "text-sm font-black",
                  remainingQuantity === 0
                    ? "text-emerald-700"
                    : remainingQuantity < 0
                      ? "text-rose-700"
                      : "text-amber-700",
                )}
              >
                {remainingQuantity === 0
                  ? "Department allocation is reconciled"
                  : remainingQuantity < 0
                    ? `Reduce allocations by ${formatNumber(
                        Math.abs(remainingQuantity),
                      )}`
                    : `${formatNumber(
                        remainingQuantity,
                      )} approved units remain unallocated`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Partial under-allocation may be saved while the package is a
                draft. New over-allocation is blocked.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={
                  saving ||
                  loadingDetail ||
                  subItems.length === 0 ||
                  remainingQuantity < 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Allocation
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimatedDrawer>
  );
}

function SharedModelsPanel({
  packageItem,
  subItems,
  editable,
  onAdd,
  onEdit,
  onRemove,
  onViewPriceContext,
  onViewPriceHistory,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-slate-950">
            Shared Models and Pricing
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Each reusable model has one hospital-wide price, specification,
            note, and attachment set. Quantity is calculated from department
            allocations.
          </p>
        </div>

        <button
          type="button"
          disabled={!editable}
          onClick={onAdd}
          className="
      inline-flex
      shrink-0
      items-center
      gap-2
      whitespace-nowrap
      rounded-lg
      bg-blue-600
      px-4
      py-2
      text-sm
      font-semibold
      text-white
      shadow-sm
      transition-all
      hover:bg-blue-700
      hover:shadow-md
      focus:outline-none
      focus:ring-2
      focus:ring-blue-500
      disabled:cursor-not-allowed
      disabled:bg-slate-300
      disabled:shadow-none
    "
        >
          <PackagePlus className="h-4 w-4" />
          Add Model
        </button>
      </div>

      {subItems.length === 0 ? (
        <EmptyQueue
          icon={PackagePlus}
          title="No shared models configured"
          message={`Add at least one reusable model under ${
            packageItem?.catalog_item_name || "this requested item"
          } before allocating department demand.`}
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {subItems.map((subItem) => (
            <article key={subItem.id} className="p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(120px,0.55fr))_auto] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">{subItem.name}</p>
                    {subItem.is_default_general ? (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        General
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {subItem.sub_item_code || "No model code"} ·{" "}
                    {subItem.unit_of_measure_name || "No unit"}
                    {subItem.unit_of_measure_code
                      ? ` (${subItem.unit_of_measure_code})`
                      : ""}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {subItem.specification ||
                      "No shared specification entered."}
                  </p>
                  {subItem.note ? (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                      {subItem.note}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Manager proposed price
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {getManagerUnitPrice(subItem) === null ? (
                      "Not set"
                    ) : (
                      <CurrencyText value={getManagerUnitPrice(subItem)} />
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Allocated quantity
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {formatNumber(subItem.quantity)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    System calculated
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Estimated value
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {subItem.category_manager_line_total === null ? (
                      "-"
                    ) : (
                      <CurrencyText
                        value={subItem.category_manager_line_total}
                      />
                    )}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Paperclip className="h-3.5 w-3.5" />
                    {subItem.attachment_count || 0} attachment
                    {Number(subItem.attachment_count) === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => onViewPriceContext(subItem, subItems)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    Price Context
                  </button>
                  <button
                    type="button"
                    title="View quantity and price history"
                    onClick={() => onViewPriceHistory(subItem)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
                  >
                    <History className="h-3.5 w-3.5" />
                    History
                  </button>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => onEdit(subItem)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => onRemove(subItem)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DepartmentDemandPanel({
  departments,
  subItems,
  editable,
  onAllocate,
  onViewHodNote,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-black text-slate-950">
          Department Demand Breakdown
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          See where the hospital demand came from and split each department's
          approved quantity across the shared package models.
        </p>
      </div>

      {departments.length === 0 ? (
        <EmptyQueue
          icon={Building2}
          title="No reviewed department demand"
          message="This package item currently has no completed department review rows."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Requested</th>
                <th className="px-5 py-3">Approved</th>
                <th className="px-5 py-3">Model split</th>
                <th className="px-5 py-3">Allocated</th>
                <th className="px-5 py-3">Remaining</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((department) => {
                const allocationBySubItem = new Map(
                  (department.allocations || []).map((allocation) => [
                    Number(allocation.category_budget_package_sub_item_id),
                    allocation,
                  ]),
                );
                const splitRows = subItems
                  .map((subItem) => ({
                    subItem,
                    quantity: toNumber(
                      allocationBySubItem.get(Number(subItem.id))
                        ?.allocated_quantity,
                    ),
                  }))
                  .filter((row) => row.quantity > 0);

                return (
                  <tr key={department.department_item_id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">
                        {department.department_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {department.department_code || "Department"}
                      </p>
                      {department.review_note ? (
                        <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                          Review note: {department.review_note}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onViewHodNote?.(department)}
                        className={[
                          "mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-black transition",
                          department.hod_item_note || department.hodItemNote
                            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {department.hod_item_note || department.hodItemNote
                          ? "HOD note"
                          : "No HOD note"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      {formatNumber(department.requested_quantity)}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-950">
                      {formatNumber(department.approved_quantity)}
                    </td>
                    <td className="min-w-64 px-5 py-4">
                      {splitRows.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {splitRows.map(({ subItem, quantity }) => (
                            <span
                              key={subItem.id}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700"
                            >
                              {subItem.name}: {formatNumber(quantity)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          Not allocated
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {formatNumber(department.allocated_quantity)}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {formatNumber(
                        Math.abs(toNumber(department.remaining_quantity)),
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={department.reconciliation_status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={!editable || subItems.length === 0}
                        onClick={() => onAllocate(department)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        {department.allocated_quantity > 0
                          ? "Edit split"
                          : "Allocate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


function PackageItemOverview({ item, detail, blockers, onViewDistribution }) {
  const subItems = detail?.sub_items || [];
  const departments = detail?.departments || [];
  const itemBlockers = blockers.filter(
    (blocker) => Number(blocker.packageItemId) === Number(item?.id),
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requested"
          value={formatNumber(item?.requested_quantity)}
          icon={ClipboardList}
        />
        <MetricCard
          label="Approved"
          value={formatNumber(item?.approved_quantity)}
          icon={CheckCircle2}
          tone="blue"
        />
        <MetricCard
          label="Allocated"
          value={formatNumber(item?.allocated_quantity)}
          icon={Layers3}
          tone="emerald"
        />
        <MetricCard
          label="Estimated Value"
          value={
            <CurrencyText
              value={
                item?.category_manager_estimated_total ?? item?.estimated_total ?? 0
              }
            />
          }
          icon={CircleDollarSign}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Package Setup
              </p>
              <h3 className="mt-1 font-black text-slate-950">
                Models and department demand
              </h3>
            </div>
            <StatusBadge status={item?.reconciliation_status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Package models</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {subItems.length}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Departments</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {departments.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewDistribution?.(item)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
          >
            <CalendarDays className="h-4 w-4" /> View Item Distribution
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Readiness
              </p>
              <h3 className="mt-1 font-black text-slate-950">
                Item-specific blockers
              </h3>
            </div>
            <span
              className={classNames(
                "rounded-full px-2.5 py-1 text-xs font-black",
                itemBlockers.length
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700",
              )}
            >
              {itemBlockers.length
                ? `${itemBlockers.length} issue${itemBlockers.length === 1 ? "" : "s"}`
                : "Ready"}
            </span>
          </div>
          {itemBlockers.length ? (
            <div className="mt-4 space-y-2">
              {itemBlockers.map((blocker, index) => (
                <div
                  key={`${blocker.code}-${index}`}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
                >
                  <span className="font-black">{formatStatus(blocker.code)}:</span>{" "}
                  {blocker.message}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">This item is ready</p>
                <p className="mt-1 text-sm leading-6">
                  Models, quantities, prices and allocations currently satisfy the package checks.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {item?.cfo_review_note ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">CFO modification note</p>
              <p className="mt-1 text-sm leading-6">{item.cfo_review_note}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PackagePricingPanel({
  subItems,
  editable,
  onEdit,
  onViewPriceContext,
  onViewPriceHistory,
}) {
  if (!subItems.length) {
    return (
      <EmptyQueue
        icon={CircleDollarSign}
        title="No package models to price"
        message="Add a package model first, then enter the Category Manager proposed price."
      />
    );
  }

  return (
    <div className="space-y-3">
      {subItems.map((subItem) => {
        const price = getManagerUnitPrice(subItem);
        const priceValid = isValidUnitPrice(price);

        return (
          <section
            key={subItem.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-slate-950">{subItem.name}</h3>
                  <span
                    className={classNames(
                      "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase",
                      priceValid
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    {priceValid ? "Price Ready" : "Price Required"}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {subItem.sub_item_code || "No model code"} · {formatNumber(subItem.quantity)} {subItem.unit_of_measure_code || subItem.unit_of_measure_name || "units"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                    CM Proposed Price
                  </p>
                  <p className="mt-1 text-base font-black text-slate-950">
                    {priceValid ? <CurrencyText value={price} /> : "Not set"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Allocated Qty
                  </p>
                  <p className="mt-1 text-base font-black text-slate-950">
                    {formatNumber(subItem.quantity)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Estimated Value
                  </p>
                  <p className="mt-1 text-base font-black text-slate-950">
                    {subItem.category_manager_line_total === null ? (
                      "—"
                    ) : (
                      <CurrencyText value={subItem.category_manager_line_total} />
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => onViewPriceContext(subItem, subItems)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
              >
                <CircleDollarSign className="h-3.5 w-3.5" /> Price Context
              </button>
              <button
                type="button"
                onClick={() => onViewPriceHistory(subItem)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
              >
                <History className="h-3.5 w-3.5" /> History
              </button>
              <button
                type="button"
                disabled={!editable}
                onClick={() => onEdit(subItem)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Price & Details
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PackageDocumentsPanel({ subItems, editable, open }) {
  if (!subItems.length) {
    return (
      <EmptyQueue
        icon={Paperclip}
        title="No package models yet"
        message="Documents are stored against package models. Add a model before uploading supporting documents."
      />
    );
  }

  return (
    <div className="space-y-4">
      {subItems.map((subItem) => (
        <section key={subItem.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-950">{subItem.name}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {subItem.sub_item_code || "Package model"}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
              {subItem.attachment_count || 0} file{Number(subItem.attachment_count) === 1 ? "" : "s"}
            </span>
          </div>
          <PackageAttachmentManager subItem={subItem} open={open} editable={editable} />
        </section>
      ))}
    </div>
  );
}

function PackageItemWorkspaceDrawer({
  open,
  onClose,
  packageData,
  item,
  detail,
  loading,
  blockers,
  editable,
  onAddModel,
  onEditModel,
  onRemoveModel,
  onAllocate,
  onViewPriceContext,
  onViewPriceHistory,
  onViewDistribution,
  onViewHodNote,
}) {
  const [tab, setTab] = useState("OVERVIEW");

  useEffect(() => {
    if (open) setTab("OVERVIEW");
  }, [open, item?.id]);

  const subItems = detail?.sub_items || [];
  const departments = detail?.departments || [];
  const tabs = [
    { key: "OVERVIEW", label: "Overview" },
    { key: "MODELS", label: "Models & Allocation" },
    { key: "PRICING", label: "Pricing" },
    { key: "DOCUMENTS", label: "Documents" },
  ];

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Manage Package Item
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-2xl font-black text-slate-950">
                  {item?.catalog_item_name || "Package Item"}
                </h2>
                {item ? <StatusBadge status={item.reconciliation_status} /> : null}
                {item?.cfo_review_status ? <StatusBadge status={item.cfo_review_status} /> : null}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {packageData?.category_name} package · FY {packageData?.financial_year} · {item?.department_count || 0} requesting department{Number(item?.department_count || 0) === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close package item workspace"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Package item workspace">
            {tabs.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={tab === entry.key}
                onClick={() => setTab(entry.key)}
                className={classNames(
                  "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-black transition",
                  tab === entry.key
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-2xl bg-white" />
              <div className="h-72 animate-pulse rounded-2xl bg-white" />
            </div>
          ) : !item ? (
            <EmptyQueue
              icon={Boxes}
              title="Package item not found"
              message="Close this workspace and select another package item."
            />
          ) : tab === "OVERVIEW" ? (
            <PackageItemOverview
              item={item}
              detail={detail}
              blockers={blockers}
              onViewDistribution={onViewDistribution}
            />
          ) : tab === "MODELS" ? (
            <div className="space-y-5">
              <SharedModelsPanel
                packageItem={item}
                subItems={subItems}
                editable={editable}
                onAdd={onAddModel}
                onEdit={onEditModel}
                onRemove={onRemoveModel}
                onViewPriceContext={onViewPriceContext}
                onViewPriceHistory={onViewPriceHistory}
              />
              <DepartmentDemandPanel
                departments={departments}
                subItems={subItems}
                editable={editable}
                onAllocate={onAllocate}
                onViewHodNote={onViewHodNote}
              />
            </div>
          ) : tab === "PRICING" ? (
            <PackagePricingPanel
              subItems={subItems}
              editable={editable}
              onEdit={onEditModel}
              onViewPriceContext={onViewPriceContext}
              onViewPriceHistory={onViewPriceHistory}
            />
          ) : (
            <PackageDocumentsPanel
              subItems={subItems}
              editable={editable}
              open={open && tab === "DOCUMENTS"}
            />
          )}
        </main>

        <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_16px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </div>
    </AnimatedDrawer>
  );
}

const PACKAGE_VIEWS = [
  {
    value: "items",
    label: "Package Items",
    description: "Models, prices and item reconciliation",
    icon: Boxes,
  },
  {
    value: "departments",
    label: "Department Breakdown",
    description: "Approved demand by department",
    icon: Building2,
  },
  {
    value: "distribution",
    label: "Package Distribution",
    description: "Approved value across the year",
    icon: CalendarDays,
  },
];

function PackagePreparationNavigation({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Package preparation views"
      className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-3"
    >
      {PACKAGE_VIEWS.map((entry) => {
        const Icon = entry.icon;
        const active = value === entry.value;
        return (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(entry.value)}
            className={classNames(
              "relative flex items-center gap-3 border-b border-slate-200 px-5 py-4 text-left transition last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0",
              active
                ? "bg-blue-50/70 text-blue-800"
                : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
            )}
          >
            <span
              className={classNames(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                active
                  ? "border-blue-200 bg-blue-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-500",
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">{entry.label}</span>
              <span
                className={classNames(
                  "mt-0.5 block truncate text-xs font-semibold",
                  active ? "text-blue-600" : "text-slate-400",
                )}
              >
                {entry.description}
              </span>
            </span>
            {active ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function DepartmentBreakdownView({ data, loading, error, onOpenDepartment }) {
  const departments = data?.departments || [];
  const summary = data?.summary || {};

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-[420px] animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
        {error?.response?.data?.message || "Failed to load department package view."}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Departments"
          value={summary.department_count || 0}
          helper="with approved package demand"
          icon={Building2}
        />
        <MetricCard
          label="Approved Qty"
          value={formatNumber(summary.approved_quantity)}
          helper="approved across departments"
          icon={CheckCircle2}
          tone="blue"
        />
        <MetricCard
          label="Allocated Qty"
          value={formatNumber(summary.allocated_quantity)}
          helper="assigned to package models"
          icon={Layers3}
          tone="emerald"
        />
        <MetricCard
          label="Allocation Issues"
          value={summary.issue_count || 0}
          helper="departments/items needing attention"
          icon={AlertCircle}
          tone={Number(summary.issue_count) > 0 ? "amber" : "emerald"}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">Department Breakdown</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a department to review its approved package items and allocation status.
          </p>
        </div>

        {departments.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Approved</th>
                  <th className="px-5 py-3">Allocated</th>
                  <th className="px-5 py-3">Remaining</th>
                  <th className="px-5 py-3">Issues</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((department) => (
                  <tr key={department.department_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{department.department_name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {department.department_code || "Department"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {department.item_count || 0}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-950">
                      {formatNumber(department.approved_quantity)}
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-700">
                      {formatNumber(department.allocated_quantity)}
                    </td>
                    <td className="px-5 py-4 font-bold text-amber-700">
                      {formatNumber(Math.abs(toNumber(department.remaining_quantity)))}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={classNames(
                          "rounded-full border px-2.5 py-1 text-xs font-black",
                          Number(department.issue_count || 0) > 0
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {department.issue_count || 0} issue{Number(department.issue_count || 0) === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={department.reconciliation_status} compact />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenDepartment(department.department_id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700"
                      >
                        View Items <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyQueue
            icon={Building2}
            title="No approved department demand"
            message="Completed department reviews with approved package demand will appear here."
          />
        )}
      </section>
    </section>
  );
}

function DepartmentItemsDrawer({ open, onClose, department, onManageItem }) {
  if (!department) return null;

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <DrawerHeader
          eyebrow="Package Department Items"
          title={department.department_name || "Department"}
          description="Review this department's approved package demand and open any item that needs model, price, or allocation work."
          onClose={onClose}
        >
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Items" value={department.item_count || 0} icon={Boxes} />
            <MetricCard label="Approved" value={formatNumber(department.approved_quantity)} icon={CheckCircle2} tone="blue" />
            <MetricCard label="Allocated" value={formatNumber(department.allocated_quantity)} icon={Layers3} tone="emerald" />
            <MetricCard label="Remaining" value={formatNumber(Math.abs(toNumber(department.remaining_quantity)))} icon={AlertCircle} tone={toNumber(department.remaining_quantity) === 0 ? "emerald" : "amber"} />
            <MetricCard label="Issues" value={department.issue_count || 0} icon={AlertCircle} tone={Number(department.issue_count || 0) > 0 ? "amber" : "emerald"} />
          </div>
        </DrawerHeader>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">Approved Package Items</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {department.department_code || "Department"} · {department.item_count || 0} item{Number(department.item_count || 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusBadge status={department.reconciliation_status} compact />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Item</th>
                    <th className="px-5 py-3">Approved</th>
                    <th className="px-5 py-3">Allocated</th>
                    <th className="px-5 py-3">Remaining</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(department.items || []).map((item) => (
                    <tr key={item.department_item_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">{item.catalog_item_name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {item.catalog_item_code || "Catalog item"}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-950">
                        {formatNumber(item.approved_quantity)}
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-700">
                        {formatNumber(item.allocated_quantity)}
                      </td>
                      <td className="px-5 py-4 font-bold text-amber-700">
                        {formatNumber(Math.abs(toNumber(item.remaining_quantity)))}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.reconciliation_status} compact />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          disabled={!item.package_item_id}
                          onClick={() => onManageItem(item.package_item_id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          Manage Item <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_16px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </div>
    </AnimatedDrawer>
  );
}

export default function CategoryPackageWorkbench({
  focusItemId = null,
  onClearFocusItem,
  view = "items",
  onViewChange = () => {},
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [editingSubItem, setEditingSubItem] = useState(null);
  const [removeCandidate, setRemoveCandidate] = useState(null);
  const [allocationContext, setAllocationContext] = useState(null);
  const [priceContext, setPriceContext] = useState(null);
  const [priceHistorySubItem, setPriceHistorySubItem] = useState(null);
  const [distributionContext, setDistributionContext] = useState(null);
  const [hodNoteContext, setHodNoteContext] = useState(null);

  const packageQuery = useQuery({
    queryKey: ["category-packages", "current"],
    queryFn: getCurrentCategoryPackage,
  });

  const packageData = packageQuery.data;
  const items = useMemo(() => packageData?.items || [], [packageData?.items]);
  const blockers = packageData?.readiness?.blockers || [];
  const itemPreparationBlockers = blockers.filter(
    (blocker) => blocker.packageItemId || blocker.packageSubItemId,
  );
  const preparationReady = Boolean(packageData?.items?.length) && itemPreparationBlockers.length === 0;
  const packageEditable = ["DRAFT", "RETURNED_BY_CFO"].includes(packageData?.status);

  useEffect(() => {
    if (!packageData?.id) return;
    setFilter(packageData.status === "RETURNED_BY_CFO" ? "NEEDS_MODIFICATION" : "ALL");
  }, [packageData?.id, packageData?.status]);

  useEffect(() => {
    if (!focusItemId || !items.length) return;
    const target = items.find((item) => Number(item.id) === Number(focusItemId));
    if (!target) return;
    setSelectedItemId(target.id);
    setWorkspaceOpen(true);
  }, [focusItemId, items]);

  const itemBlockersById = useMemo(() => {
    const map = new Map();
    for (const blocker of blockers) {
      if (!blocker.packageItemId) continue;
      const key = Number(blocker.packageItemId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(blocker);
    }
    return map;
  }, [blockers]);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !normalized ||
        String(item.catalog_item_name || "").toLowerCase().includes(normalized) ||
        String(item.catalog_item_code || "").toLowerCase().includes(normalized);
      const itemBlockers = itemBlockersById.get(Number(item.id)) || [];
      const hasSetupIssue =
        Number(item.approved_quantity || 0) > 0 && Number(item.active_sub_item_count || 0) === 0;
      const needsAttention =
        item.reconciliation_status !== "RECONCILED" || itemBlockers.length > 0;
      const matchesFilter =
        filter === "ALL" ||
        (filter === "NEEDS_MODIFICATION" && item.cfo_review_status === "NEEDS_MODIFICATION") ||
        (filter === "NEEDS_SETUP" && hasSetupIssue) ||
        (filter === "NEEDS_ATTENTION" && needsAttention) ||
        (filter === "RECONCILED" && item.reconciliation_status === "RECONCILED");
      return matchesSearch && matchesFilter;
    });
  }, [filter, itemBlockersById, items, search]);

  const selectedItem =
    items.find((item) => Number(item.id) === Number(selectedItemId)) || null;
  const selectedItemEditable =
    packageEditable && isPackageItemEditable(packageData?.status, selectedItem);

  const itemDetailQuery = useQuery({
    queryKey: ["category-packages", "items", selectedItem?.id || null],
    queryFn: () => getCategoryPackageItemDetail(selectedItem.id),
    enabled: workspaceOpen && Boolean(selectedItem?.id),
  });

  const departmentViewQuery = useQuery({
    queryKey: ["category-packages", "departments"],
    queryFn: getCategoryPackageDepartments,
    enabled: (view === "departments" || Boolean(selectedDepartmentId)) && Boolean(packageData?.id),
  });

  const packageDistributionQuery = useQuery({
    queryKey: ["category-packages", "distribution", "category"],
    queryFn: () => getCategoryPackageDistribution(),
    enabled: view === "distribution" && Boolean(packageData?.id),
  });

  const selectedDepartment =
    (departmentViewQuery.data?.departments || []).find(
      (department) =>
        Number(department.department_id) === Number(selectedDepartmentId),
    ) || null;

  const allocationDetailQuery = useQuery({
    queryKey: ["category-packages", "items", allocationContext?.packageItemId || null],
    queryFn: () => getCategoryPackageItemDetail(allocationContext.packageItemId),
    enabled: Boolean(allocationContext?.packageItemId),
  });

  const allocationDepartment = allocationDetailQuery.data?.departments?.find(
    (department) =>
      Number(department.department_item_id) ===
      Number(allocationContext?.departmentItemId),
  );
  const allocationPackageItem = allocationDetailQuery.data?.package_item || null;
  const allocationSubItems = allocationDetailQuery.data?.sub_items || [];

  const distributionQuery = useQuery({
    queryKey: [
      "category-packages",
      "distribution",
      distributionContext?.packageItemId || "category",
    ],
    queryFn: () =>
      getCategoryPackageDistribution({
        packageItemId: distributionContext?.packageItemId || null,
      }),
    enabled: Boolean(distributionContext),
  });

  const priceHistoryQuery = usePackageSubItemPriceHistory(
    priceHistorySubItem?.id,
    Boolean(priceHistorySubItem),
  );

  async function invalidatePackageWorkspace() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["category-packages"] }),
      queryClient.invalidateQueries({ queryKey: ["category-review"] }),
    ]);
  }

  const createSubItemMutation = useMutation({
    mutationFn: createPackageSubItem,
    onSuccess: async () => {
      toast.success("Shared package model added");
      setAddModelOpen(false);
      await invalidatePackageWorkspace();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to add package model");
    },
  });

  const updateSubItemMutation = useMutation({
    mutationFn: updatePackageSubItem,
    onSuccess: async () => {
      toast.success("Shared model details saved");
      setEditingSubItem(null);
      await invalidatePackageWorkspace();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to update package model");
    },
  });

  const removeSubItemMutation = useMutation({
    mutationFn: removePackageSubItem,
    onSuccess: async () => {
      toast.success("Package model removed");
      setRemoveCandidate(null);
      await invalidatePackageWorkspace();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to remove package model");
    },
  });

  const allocationMutation = useMutation({
    mutationFn: replaceDepartmentItemAllocations,
    onSuccess: async () => {
      toast.success("Department allocation saved");
      setAllocationContext(null);
      await invalidatePackageWorkspace();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to save department allocation");
    },
  });

  function openItem(itemId) {
    setSelectedItemId(itemId);
    setWorkspaceOpen(true);
  }

  function closeItemWorkspace() {
    setWorkspaceOpen(false);
    onClearFocusItem?.();
  }

  function openAllocation(department) {
    if (!selectedItemEditable) return;
    setAllocationContext({
      packageItemId: selectedItem?.id,
      departmentItemId: department.department_item_id,
    });
  }

  function openPriceContext(subItem, subItems = [], view = "MODEL") {
    setPriceContext({ subItem, subItems, view });
  }

  if (packageQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-[620px] animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (packageQuery.isError || !packageData) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-black">Failed to load category package</p>
            <p className="mt-1 text-sm">
              {packageQuery.error?.response?.data?.message || "Refresh the page and try again."}
            </p>
            <button
              type="button"
              onClick={() => packageQuery.refetch()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const approvedTotal = toNumber(packageData.summary?.approvedQuantity);
  const allocatedTotal = toNumber(packageData.summary?.allocatedQuantity);
  const modelCount = items.reduce(
    (sum, item) => sum + Number(item.active_sub_item_count || 0),
    0,
  );
  const reconciledCount = items.filter(
    (item) => item.reconciliation_status === "RECONCILED",
  ).length;
  const estimatedPackageTotal = items.reduce(
    (sum, item) =>
      sum + toNumber(item.category_manager_estimated_total ?? item.estimated_total),
    0,
  );

  const filterCounts = Object.fromEntries(
    PACKAGE_FILTERS.map((entry) => {
      if (entry.value === "ALL") return [entry.value, items.length];
      const count = items.filter((item) => {
        const itemBlockers = itemBlockersById.get(Number(item.id)) || [];
        const hasSetupIssue =
          Number(item.approved_quantity || 0) > 0 && Number(item.active_sub_item_count || 0) === 0;
        const needsAttention =
          item.reconciliation_status !== "RECONCILED" || itemBlockers.length > 0;
        if (entry.value === "NEEDS_MODIFICATION") return item.cfo_review_status === "NEEDS_MODIFICATION";
        if (entry.value === "NEEDS_SETUP") return hasSetupIssue;
        if (entry.value === "NEEDS_ATTENTION") return needsAttention;
        return item.reconciliation_status === "RECONCILED";
      }).length;
      return [entry.value, count];
    }),
  );

  return (
    <section className="space-y-4">
      {packageData.status === "RETURNED_BY_CFO" && packageData.return_reason ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">CFO returned this package for modification</p>
              <p className="mt-1 text-sm leading-6">{packageData.return_reason}</p>
              <p className="mt-1 text-xs font-semibold text-amber-700">
                Only package items marked Needs Modification are editable.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Approved Demand" value={formatNumber(approvedTotal)} helper="approved quantity" icon={CheckCircle2} tone="blue" />
        <MetricCard label="Package Models" value={modelCount} helper={`${items.length} package items`} icon={PackageCheck} />
        <MetricCard label="Allocated" value={formatNumber(allocatedTotal)} helper="across departments" icon={Layers3} tone="emerald" />
        <MetricCard label="Reconciled Items" value={`${reconciledCount}/${items.length}`} icon={CheckCircle2} tone={reconciledCount === items.length && items.length ? "emerald" : "amber"} />
        <MetricCard label="Item Blockers" value={preparationReady ? "Prepared" : `${itemPreparationBlockers.length} blocker${itemPreparationBlockers.length === 1 ? "" : "s"}`} helper={<CurrencyText compact value={estimatedPackageTotal} />} icon={preparationReady ? CheckCircle2 : AlertCircle} tone={preparationReady ? "emerald" : "amber"} />
      </section>

      <PackagePreparationNavigation value={view} onChange={onViewChange} />

      {view === "items" ? (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-950">Package Items</h2>
              <StatusBadge status={packageData.status} compact />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Configure hospital-wide models, prices and allocations without mixing them into department review.
            </p>
          </div>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search package items"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PACKAGE_FILTERS.filter(
                (entry) =>
                  entry.value !== "NEEDS_MODIFICATION" ||
                  packageData.status === "RETURNED_BY_CFO",
              ).map((entry) => {
                const active = filter === entry.value;
                return (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setFilter(entry.value)}
                    className={classNames(
                      "rounded-xl border px-3 py-2 text-xs font-black transition",
                      active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {entry.label} {filterCounts[entry.value]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredItems.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Approved Demand</th>
                  <th className="px-5 py-3">Departments</th>
                  <th className="px-5 py-3">Models</th>
                  <th className="px-5 py-3">Reconciliation</th>
                  <th className="px-5 py-3">Estimated Value</th>
                  <th className="px-5 py-3">Issues</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const itemBlockers = itemBlockersById.get(Number(item.id)) || [];
                  const editable = isPackageItemEditable(packageData.status, item) && packageEditable;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">{item.catalog_item_name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {item.catalog_item_code || "Catalog item"}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-950">{formatNumber(item.approved_quantity)}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => onViewChange("departments")}
                          className="font-black text-blue-700 underline decoration-dotted underline-offset-4"
                        >
                          {item.department_count} department{Number(item.department_count) === 1 ? "" : "s"}
                        </button>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">{item.active_sub_item_count || 0}</td>
                      <td className="px-5 py-4"><StatusBadge status={item.reconciliation_status} compact /></td>
                      <td className="px-5 py-4 font-black text-slate-950">
                        <CurrencyText compact value={item.category_manager_estimated_total ?? item.estimated_total ?? 0} />
                      </td>
                      <td className="px-5 py-4">
                        {itemBlockers.length ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                            {itemBlockers.length} issue{itemBlockers.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                            Ready
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openItem(item.id)}
                          className={classNames(
                            "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition",
                            editable
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          {editable ? "Manage" : "View"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyQueue
            icon={Boxes}
            title="No matching package items"
            message="Change the search or package filter to see other items."
          />
        )}
      </section>

      ) : null}

      {view === "departments" ? (
        <DepartmentBreakdownView
          data={departmentViewQuery.data}
          loading={departmentViewQuery.isLoading}
          error={departmentViewQuery.error}
          onOpenDepartment={setSelectedDepartmentId}
        />
      ) : null}

      {view === "distribution" ? (
        <PackageDistributionDrawer
          embedded
          open
          onClose={() => onViewChange("items")}
          title={`${packageData.category_name} Package Distribution`}
          subtitle={`FY ${packageData.financial_year} approved package value across the year`}
          data={packageDistributionQuery.data}
          loading={packageDistributionQuery.isLoading}
          error={packageDistributionQuery.error}
        />
      ) : null}

      <PackageItemWorkspaceDrawer
        open={workspaceOpen}
        onClose={closeItemWorkspace}
        packageData={packageData}
        item={selectedItem}
        detail={itemDetailQuery.data}
        loading={itemDetailQuery.isLoading}
        blockers={blockers}
        editable={selectedItemEditable}
        onAddModel={() => setAddModelOpen(true)}
        onEditModel={setEditingSubItem}
        onRemoveModel={setRemoveCandidate}
        onAllocate={openAllocation}
        onViewPriceContext={openPriceContext}
        onViewPriceHistory={setPriceHistorySubItem}
        onViewDistribution={(item) =>
          setDistributionContext({
            type: "PACKAGE_ITEM",
            packageItemId: item.id,
            title: `${item.catalog_item_name} Distribution`,
            subtitle: `${packageData.category_name} package · FY ${packageData.financial_year}`,
          })
        }
        onViewHodNote={setHodNoteContext}
      />

      <DepartmentItemsDrawer
        open={Boolean(selectedDepartment)}
        onClose={() => setSelectedDepartmentId(null)}
        department={selectedDepartment}
        onManageItem={(itemId) => openItem(itemId)}
      />

      <AddModelDrawer
        open={addModelOpen}
        onClose={() => setAddModelOpen(false)}
        packageItem={selectedItem}
        existingPackageSubItems={itemDetailQuery.data?.sub_items || []}
        addingPackageModel={createSubItemMutation.isPending}
        onAddPackageModel={(payload) =>
          selectedItemEditable
            ? createSubItemMutation.mutate({ packageItemId: selectedItem.id, payload })
            : toast.error("This package item is locked")
        }
      />

      <EditModelDrawer
        open={Boolean(editingSubItem)}
        onClose={() => setEditingSubItem(null)}
        subItem={editingSubItem}
        loading={updateSubItemMutation.isPending}
        editable={Boolean(
          editingSubItem &&
            packageEditable &&
            isPackageItemEditable(
              packageData.status,
              items.find(
                (item) =>
                  Number(item.id) === Number(editingSubItem.category_budget_package_item_id),
              ),
            ),
        )}
        isReturnedCorrection={
          packageData.status === "RETURNED_BY_CFO" &&
          items.find(
            (item) =>
              Number(item.id) === Number(editingSubItem?.category_budget_package_item_id),
          )?.cfo_review_status === "NEEDS_MODIFICATION"
        }
        onSubmit={(payload) =>
          updateSubItemMutation.mutate({
            packageSubItemId: editingSubItem.id,
            payload,
          })
        }
      />

      <AllocationDrawer
        open={Boolean(allocationContext)}
        onClose={() => setAllocationContext(null)}
        department={allocationDepartment}
        packageItem={allocationPackageItem}
        subItems={allocationSubItems}
        loadingDetail={allocationDetailQuery.isLoading}
        saving={allocationMutation.isPending}
        onSubmit={(payload) =>
          allocationMutation.mutate({
            departmentItemId: allocationContext.departmentItemId,
            payload,
          })
        }
      />

      <PackageDistributionDrawer
        open={Boolean(distributionContext)}
        onClose={() => setDistributionContext(null)}
        showFooterClose
        title={distributionContext?.title}
        subtitle={distributionContext?.subtitle}
        data={distributionQuery.data}
        loading={distributionQuery.isLoading}
        error={distributionQuery.error}
      />

      <ConfirmModal
        open={Boolean(removeCandidate)}
        title="Remove Package Model?"
        message={`Remove ${removeCandidate?.name || "this package model"}? Its department allocations will also be removed and the package item will require reconciliation.`}
        confirmText="Remove Model"
        cancelText="Cancel"
        loading={removeSubItemMutation.isPending}
        onCancel={() => setRemoveCandidate(null)}
        onConfirm={() => {
          if (!removeCandidate?.row_version) {
            toast.error("Model row version is missing. Refresh and try again.");
            return;
          }
          removeSubItemMutation.mutate({
            packageSubItemId: removeCandidate.id,
            payload: {
              row_version: removeCandidate.row_version,
              confirm_allocations: true,
            },
          });
        }}
      />

      <PackageSubItemPriceIntelligenceDrawer
        open={Boolean(priceContext?.subItem)}
        subItem={priceContext?.subItem}
        subItems={priceContext?.subItems || []}
        initialView={priceContext?.view || "MODEL"}
        onSelectSubItem={(subItem) =>
          setPriceContext((current) => ({
            subItem,
            subItems: current?.subItems || [],
            view: "MODEL",
          }))
        }
        onClose={() => setPriceContext(null)}
        showFooterClose
      />

      <PackageSubItemPriceHistoryDrawer
        open={Boolean(priceHistorySubItem)}
        onClose={() => setPriceHistorySubItem(null)}
        subItem={priceHistorySubItem}
        query={priceHistoryQuery}
        showFooterClose
      />

      {hodNoteContext ? (
        <BudgetItemRequestNoteDrawer
          open={Boolean(hodNoteContext)}
          onClose={() => setHodNoteContext(null)}
          itemName={hodNoteContext.catalog_item_name || selectedItem?.catalog_item_name}
          categoryName={packageData.category_name}
          departmentName={hodNoteContext.department_name}
          requestedQuantity={hodNoteContext.requested_quantity}
          distributionMethod={null}
          note={hodNoteContext.hod_item_note || hodNoteContext.hodItemNote || ""}
          editable={false}
          showFooterClose
        />
      ) : null}
    </section>
  );
}
