/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileText,
  FilePlus2,
  Layers3,
  Loader2,
  Lock,
  PackagePlus,
  Paperclip,
  Pencil,
  RefreshCw,
  Save,
  Send,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import ConfirmModal from "../ConfirmModal";
import CurrencyText from "../CurrencyText";
import EnterpriseSearch from "../EnterpriseSearch";
import Input from "../Input";
import SearchableMultiSelect from "../SearchableMultiSelect";
import CatalogSubItemFields from "../catalog/CatalogSubItemFields";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CollapsiblePanelToggle from "../layout/CollapsiblePanelToggle";

import {
  createPackageSubItem,
  deletePackageSubItemAttachment,
  downloadPackageSubItemAttachment,
  getCategoryPackageDepartments,
  getCategoryPackageItemDetail,
  getCurrentCategoryPackage,
  getPackageSubItemAttachments,
  removePackageSubItem,
  replaceDepartmentItemAllocations,
  submitCategoryPackageToCfo,
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

const ITEM_FILTERS = [
  { value: "ALL", label: "All" },
  {
    value: "NEEDS_MODIFICATION",
    label: "Needs modification",
    tone: "amber",
  },
  { value: "NEEDS_RECONCILIATION", label: "Needs attention" },
  { value: "NOT_CONFIGURED", label: "Not configured" },
  { value: "SHORT", label: "Short" },
  { value: "EXCESS", label: "Excess" },
  { value: "RECONCILED", label: "Reconciled" },
];

const DEPARTMENT_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "NEEDS_ALLOCATION", label: "Needs allocation" },
  { value: "RECONCILED", label: "Fully allocated" },
];

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}
function isValidUnitPrice(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0;
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

function getAllocationEstimatedTotal(allocations = []) {
  return allocations.reduce(
    (sum, allocation) =>
      sum +
      toNumber(allocation.allocated_quantity) * toNumber(allocation.unit_price),
    0,
  );
}

function getDepartmentEstimatedTotal(department) {
  return (department?.items || []).reduce(
    (sum, item) => sum + getAllocationEstimatedTotal(item.allocations),
    0,
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

function PerspectiveTabs({ value, onChange }) {
  const tabs = [
    {
      value: "ITEM",
      label: "By Requested Item",
      helper: "Configure shared models, pricing, and department demand",
      icon: Boxes,
    },
    {
      value: "DEPARTMENT",
      label: "By Department",
      helper: "Review every approved item and model split per department",
      icon: Building2,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Category package workspace perspective"
      className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1.5 md:grid-cols-2"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.value;

        return (
          <button
            key={tab.value}
            id={`category-package-${tab.value.toLowerCase()}-tab`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`category-package-${tab.value.toLowerCase()}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={classNames(
              "flex min-w-0 items-start gap-3 rounded-xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              selected
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
            )}
          >
            <span
              className={classNames(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                selected ? "bg-blue-100" : "bg-slate-200/70",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">{tab.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                {tab.helper}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        const isAmber = option.tone === "amber";

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={classNames(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2",
              selected && isAmber
                ? "border-amber-400 bg-amber-400 text-amber-950 shadow-sm focus-visible:ring-amber-400"
                : selected
                  ? "border-blue-600 bg-blue-600 text-white focus-visible:ring-blue-500"
                  : isAmber
                    ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 focus-visible:ring-amber-400"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-blue-500",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ItemQueueCard({ item, selected, onClick }) {
  const remaining = toNumber(item.remaining_quantity);

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        selected
          ? "border-blue-300 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {item.catalog_item_name}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {item.department_count} department
            {Number(item.department_count) === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {item.cfo_review_status ? (
            <StatusBadge status={item.cfo_review_status} compact />
          ) : null}
          <StatusBadge status={item.reconciliation_status} compact />
        </div>
      </div>

      {item.cfo_review_note ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
          CFO note: {item.cfo_review_note}
        </p>
      ) : null}

      <div className="mt-3">
        <QuantityProgress
          approved={item.approved_quantity}
          allocated={item.allocated_quantity}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/80 px-2.5 py-2">
          <span className="block font-black text-slate-900">
            {formatNumber(item.requested_quantity)}
          </span>
          <span className="text-slate-500">Requested</span>
        </div>
        <div className="rounded-xl bg-white/80 px-2.5 py-2">
          <span className="block font-black text-slate-900">
            {formatNumber(item.approved_quantity)}
          </span>
          <span className="text-slate-500">Approved</span>
        </div>
        <div className="rounded-xl bg-white/80 px-2.5 py-2">
          <span className="block font-black text-slate-900">
            <CurrencyText compact value={item.estimated_total || 0} />
          </span>
          <span className="text-slate-500">Value</span>
        </div>
        <div className="rounded-xl bg-white/80 px-2.5 py-2">
          <span
            className={classNames(
              "block font-black",
              remaining === 0
                ? "text-emerald-700"
                : remaining < 0
                  ? "text-rose-700"
                  : "text-amber-700",
            )}
          >
            {formatNumber(Math.abs(remaining))}
          </span>
          <span className="text-slate-500">
            {remaining < 0 ? "Excess" : "Remaining"}
          </span>
        </div>
      </div>
    </button>
  );
}

function DepartmentQueueCard({ department, selected, onClick }) {
  const remaining = toNumber(department.remaining_quantity);
  const estimatedTotal = getDepartmentEstimatedTotal(department);

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        selected
          ? "border-blue-300 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {department.department_name}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {department.department_code || "Department"} ·{" "}
            {department.item_count} item
            {Number(department.item_count) === 1 ? "" : "s"}
          </p>
        </div>
        <StatusBadge status={department.reconciliation_status} compact />
      </div>

      <div className="mt-3">
        <QuantityProgress
          approved={department.approved_quantity}
          allocated={department.allocated_quantity}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-500">Allocation issues</span>
        <span
          className={classNames(
            "font-black",
            remaining === 0 ? "text-emerald-700" : "text-amber-700",
          )}
        >
          {department.issue_count || 0}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-white/80 px-2.5 py-2 text-xs">
        <span className="font-semibold text-slate-500">Department total</span>
        <span className="font-black text-slate-900">
          <CurrencyText compact value={estimatedTotal} />
        </span>
      </div>
    </button>
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
      unit_price: Number(unitPrice),
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
                  label="Shared unit price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  placeholder="Enter one hospital-wide price"
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

  const packageSubItemId = subItem?.id;
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
    mutationFn: ({ file }) =>
      uploadPackageSubItemAttachment({
        packageSubItemId,
        file,
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        },
      }),
    onSuccess: async () => {
      toast.success("Attachment uploaded");
      setUploadProgress(null);
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
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment?.original_file_name || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to download attachment",
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
                files.forEach((file) => uploadMutation.mutate({ file }));
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
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {attachment.mime_type || "File"} ·{" "}
                    {formatFileSize(attachment.file_size_bytes)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Uploaded by {attachment.uploaded_by_name || "Unknown"} ·{" "}
                    {formatDateTime(attachment.uploaded_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
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
                {editable ? (
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
}) {
  const [unitPrice, setUnitPrice] = useState("");
  const [specification, setSpecification] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setUnitPrice(
      subItem?.unit_price === null || subItem?.unit_price === undefined
        ? ""
        : String(Number(subItem.unit_price)),
    );
    setSpecification(subItem?.specification || "");
    setNote(subItem?.note || "");
  }, [open, subItem]);

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
      unit_price: Number(unitPrice),
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
              label="Shared unit price"
              required
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
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
        !isValidUnitPrice(subItem.unit_price),
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

                const hasValidUnitPrice = isValidUnitPrice(subItem.unit_price);

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
                            Shared price:{" "}
                            {hasValidUnitPrice ? (
                              <CurrencyText value={subItem.unit_price} />
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
                                  Shared unit price required
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
                    Shared price
                  </p>
                  <p className="mt-1 font-black text-slate-950">
                    {subItem.unit_price === null ? (
                      "Not set"
                    ) : (
                      <CurrencyText value={subItem.unit_price} />
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
                    {subItem.line_total === null ? (
                      "-"
                    ) : (
                      <CurrencyText value={subItem.line_total} />
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

function ItemPerspective({
  filteredItems,
  selectedItem,
  selectedItemDetail,
  loadingDetail,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onSelectItem,
  editable,
  onAddModel,
  onEditModel,
  onRemoveModel,
  onAllocate,
}) {
  const subItems = selectedItemDetail?.sub_items || [];
  const departments = selectedItemDetail?.departments || [];
  const [isItemListOpen, setIsItemListOpen] = useState(true);

  return (
    <div
      id="category-package-item-panel"
      role="tabpanel"
      aria-labelledby="category-package-item-tab"
      className={[
        "grid min-h-[720px] transition-all duration-300 ease-in-out",
        isItemListOpen
          ? "xl:grid-cols-[350px_minmax(0,1fr)]"
          : "xl:grid-cols-[0px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <aside
        className={[
         "flex flex-col overflow-hidden border-b border-slate-200 bg-white xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:self-start xl:border-b-0 xl:border-r xl:rounded-l-[1.75rem]",
          isItemListOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!isItemListOpen}
      >
        <div className="space-y-3 border-b border-slate-200 p-4">
          <EnterpriseSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Search requested items"
            size="sm"
          />
          <FilterChips
            options={ITEM_FILTERS}
            value={filter}
            onChange={onFilterChange}
          />
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <ItemQueueCard
                key={item.id}
                item={item}
                selected={Number(selectedItem?.id) === Number(item.id)}
                onClick={() => onSelectItem(item.id)}
              />
            ))
          ) : (
            <EmptyQueue
              icon={Boxes}
              title="No matching requested items"
              message="Change the search or status filter to see other package items."
            />
          )}
        </div>
      </aside>

      <main className="min-w-0 bg-slate-50 p-4 sm:p-5">
        <div className="mb-4">
          <CollapsiblePanelToggle
            isOpen={isItemListOpen}
            onToggle={() => setIsItemListOpen((prev) => !prev)}
            openLabel="Show Requested Items"
            closeLabel="Hide Requested Items"
          />
        </div>
        {!selectedItem ? (
          <EmptyQueue
            icon={Boxes}
            title="No package items yet"
            message="Completed department reviews will create hospital package-item demand."
          />
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-950">
                      {selectedItem.catalog_item_name}
                    </h2>
                    {selectedItem.cfo_review_status ? (
                      <StatusBadge status={selectedItem.cfo_review_status} />
                    ) : null}
                    <StatusBadge status={selectedItem.reconciliation_status} />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Configure shared hospital models, then allocate each
                    department's approved demand across those models.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  {selectedItem.department_count} requesting department
                  {Number(selectedItem.department_count) === 1 ? "" : "s"}
                </div>
              </div>

              {selectedItem.cfo_review_note ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-black">CFO modification note</p>
                  <p className="mt-1 leading-6">
                    {selectedItem.cfo_review_note}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="Requested"
                  value={formatNumber(selectedItem.requested_quantity)}
                  icon={ClipboardList}
                />
                <MetricCard
                  label="Approved"
                  value={formatNumber(selectedItem.approved_quantity)}
                  icon={CheckCircle2}
                  tone="blue"
                />
                <MetricCard
                  label="Allocated"
                  value={formatNumber(selectedItem.allocated_quantity)}
                  icon={Layers3}
                  tone="emerald"
                />
                <MetricCard
                  label={
                    toNumber(selectedItem.remaining_quantity) < 0
                      ? "Excess"
                      : "Remaining"
                  }
                  value={formatNumber(
                    Math.abs(toNumber(selectedItem.remaining_quantity)),
                  )}
                  icon={AlertCircle}
                  tone={
                    toNumber(selectedItem.remaining_quantity) === 0
                      ? "emerald"
                      : toNumber(selectedItem.remaining_quantity) < 0
                        ? "rose"
                        : "amber"
                  }
                />
                <MetricCard
                  label="Estimated value"
                  value={
                    <CurrencyText value={selectedItem.estimated_total || 0} />
                  }
                  // icon={CircleDollarSign}
                />
              </div>
            </section>

            {loadingDetail ? (
              <div className="space-y-4">
                <div className="h-72 animate-pulse rounded-2xl bg-white" />
                <div className="h-72 animate-pulse rounded-2xl bg-white" />
              </div>
            ) : (
              <>
                <SharedModelsPanel
                  packageItem={selectedItem}
                  subItems={subItems}
                  editable={editable}
                  onAdd={onAddModel}
                  onEdit={onEditModel}
                  onRemove={onRemoveModel}
                />
                <DepartmentDemandPanel
                  departments={departments}
                  subItems={subItems}
                  editable={editable}
                  onAllocate={onAllocate}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ModelSplit({ allocations }) {
  if (!allocations?.length) {
    return <span className="text-xs italic text-slate-400">Not allocated</span>;
  }

  return (
    <div className="space-y-2">
      {allocations.map((allocation) => (
        <div
          key={allocation.allocation_id || allocation.package_sub_item_id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <div>
            <p className="text-xs font-black text-slate-800">
              {allocation.package_sub_item_name}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {allocation.unit_price === null ? (
                "Price not set"
              ) : (
                <CurrencyText value={allocation.unit_price} />
              )}
            </p>
          </div>
          <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-900 shadow-sm">
            {formatNumber(allocation.allocated_quantity)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DepartmentPerspective({
  filteredDepartments,
  selectedDepartment,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onSelectDepartment,
  editable,
  packageStatus,
  onEditAllocation,
  loading,
}) {
  const [isDepartmentListOpen, setIsDepartmentListOpen] = useState(true);

  return (
    <div
      id="category-package-department-panel"
      role="tabpanel"
      aria-labelledby="category-package-department-tab"
      className={[
        "grid min-h-[720px] transition-all duration-300 ease-in-out",
        isDepartmentListOpen
          ? "xl:grid-cols-[350px_minmax(0,1fr)]"
          : "xl:grid-cols-[0px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <aside
        className={[
        "flex flex-col overflow-hidden border-b border-slate-200 bg-white xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:self-start xl:border-b-0 xl:border-r xl:rounded-l-[1.75rem]",
          isDepartmentListOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!isDepartmentListOpen}
      >
        <div className="space-y-3 border-b border-slate-200 p-4">
          <EnterpriseSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Search departments"
            size="sm"
          />
          <FilterChips
            options={DEPARTMENT_FILTERS}
            value={filter}
            onChange={onFilterChange}
          />
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {loading ? (
            [1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-2xl bg-slate-100"
              />
            ))
          ) : filteredDepartments.length > 0 ? (
            filteredDepartments.map((department) => (
              <DepartmentQueueCard
                key={department.department_id}
                department={department}
                selected={
                  Number(selectedDepartment?.department_id) ===
                  Number(department.department_id)
                }
                onClick={() => onSelectDepartment(department.department_id)}
              />
            ))
          ) : (
            <EmptyQueue
              icon={Building2}
              title="No matching departments"
              message="Change the search or allocation filter to see other departments."
            />
          )}
        </div>
      </aside>

      <main className="min-w-0 bg-slate-50 p-4 sm:p-5">
        <div className="mb-4">
          <CollapsiblePanelToggle
            isOpen={isDepartmentListOpen}
            onToggle={() => setIsDepartmentListOpen((prev) => !prev)}
            openLabel="Show Departments"
            closeLabel="Hide Departments"
          />
        </div>
        {loading ? (
          <div className="space-y-4">
            <div className="h-52 animate-pulse rounded-2xl bg-white" />
            <div className="h-96 animate-pulse rounded-2xl bg-white" />
          </div>
        ) : !selectedDepartment ? (
          <EmptyQueue
            icon={Building2}
            title="No department demand available"
            message="Completed category reviews will appear here grouped by department."
          />
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-950">
                      {selectedDepartment.department_name}
                    </h2>
                    <StatusBadge
                      status={selectedDepartment.reconciliation_status}
                    />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Review every approved generic item and the exact shared
                    models assigned to this department.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  {selectedDepartment.department_code || "Department"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard
                  label="Requested items"
                  value={selectedDepartment.item_count}
                  icon={Boxes}
                />
                <MetricCard
                  label="Requested quantity"
                  value={formatNumber(selectedDepartment.requested_quantity)}
                  icon={ClipboardList}
                />
                <MetricCard
                  label="Approved quantity"
                  value={formatNumber(selectedDepartment.approved_quantity)}
                  icon={CheckCircle2}
                  tone="blue"
                />
                <MetricCard
                  label="Allocated quantity"
                  value={formatNumber(selectedDepartment.allocated_quantity)}
                  icon={Layers3}
                  tone="emerald"
                />
                <MetricCard
                  label="Department total"
                  value={
                    <CurrencyText
                      value={getDepartmentEstimatedTotal(selectedDepartment)}
                    />
                  }
                  icon={CircleDollarSign}
                />
                <MetricCard
                  label="Allocation issues"
                  value={selectedDepartment.issue_count || 0}
                  icon={AlertCircle}
                  tone={
                    Number(selectedDepartment.issue_count) > 0
                      ? "amber"
                      : "emerald"
                  }
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-black text-slate-950">
                  Approved Items and Model Splits
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Prices and specifications are shared on the package model.
                  This view only changes how the department's approved quantity
                  is distributed across those models.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {(selectedDepartment.items || []).map((item) => {
                  const itemEditable =
                    editable && isPackageItemEditable(packageStatus, item);
                  const itemTotal = getAllocationEstimatedTotal(
                    item.allocations,
                  );

                  return (
                    <article key={item.department_item_id} className="p-5">
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.9fr)_auto] xl:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-slate-950">
                              {item.catalog_item_name}
                            </h4>
                            <StatusBadge
                              status={item.reconciliation_status}
                              compact
                            />
                            {item.cfo_review_status ? (
                              <StatusBadge
                                status={item.cfo_review_status}
                                compact
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {item.catalog_item_code || "Catalog item"}
                          </p>

                          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <span className="block font-black text-slate-950">
                                {formatNumber(item.requested_quantity)}
                              </span>
                              <span className="text-slate-500">Requested</span>
                            </div>
                            <div className="rounded-xl bg-blue-50 px-3 py-2">
                              <span className="block font-black text-blue-800">
                                {formatNumber(item.approved_quantity)}
                              </span>
                              <span className="text-blue-600">Approved</span>
                            </div>
                            <div className="rounded-xl bg-emerald-50 px-3 py-2">
                              <span className="block font-black text-emerald-800">
                                {formatNumber(item.allocated_quantity)}
                              </span>
                              <span className="text-emerald-600">
                                Allocated
                              </span>
                            </div>
                            <div className="rounded-xl bg-amber-50 px-3 py-2">
                              <span className="block font-black text-amber-800">
                                {formatNumber(
                                  Math.abs(toNumber(item.remaining_quantity)),
                                )}
                              </span>
                              <span className="text-amber-600">
                                {toNumber(item.remaining_quantity) < 0
                                  ? "Excess"
                                  : "Remaining"}
                              </span>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <span className="block font-black text-slate-950">
                                <CurrencyText compact value={itemTotal} />
                              </span>
                              <span className="text-slate-500">Value</span>
                            </div>
                          </div>

                          {item.review_note ? (
                            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                              Category review note: {item.review_note}
                            </p>
                          ) : null}
                          {item.cfo_review_note ? (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                              <span className="font-black">CFO note:</span>{" "}
                              {item.cfo_review_note}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                            Current model split
                          </p>
                          <ModelSplit allocations={item.allocations} />
                        </div>

                        <button
                          type="button"
                          disabled={!itemEditable}
                          onClick={() => onEditAllocation(item)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          Edit Allocation
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CategoryPackageWorkbench() {
  const queryClient = useQueryClient();

  const [perspective, setPerspective] = useState("ITEM");
  const [itemSearch, setItemSearch] = useState("");
  const [itemFilter, setItemFilter] = useState("ALL");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

  const [addModelOpen, setAddModelOpen] = useState(false);
  const [editingSubItem, setEditingSubItem] = useState(null);
  const [removeCandidate, setRemoveCandidate] = useState(null);
  const [allocationContext, setAllocationContext] = useState(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [showAllBlockers, setShowAllBlockers] = useState(false);

  const packageQuery = useQuery({
    queryKey: ["category-packages", "current"],
    queryFn: getCurrentCategoryPackage,
  });

  const departmentViewQuery = useQuery({
    queryKey: ["category-packages", "departments"],
    queryFn: getCategoryPackageDepartments,
    enabled: perspective === "DEPARTMENT" && Boolean(packageQuery.data?.id),
  });

  const packageData = packageQuery.data;
  const items = useMemo(() => packageData?.items || [], [packageData?.items]);
useEffect(() => {
  if (!packageData?.id) return;

  setItemFilter(
    packageData.status === "RETURNED_BY_CFO"
      ? "NEEDS_MODIFICATION"
      : "ALL",
  );

  setSelectedItemId(null);
}, [packageData?.id, packageData?.status]);
  const filteredItems = useMemo(() => {
  const query = itemSearch.trim().toLowerCase();

  return items.filter((item) => {
    const matchesSearch =
      !query ||
      item.catalog_item_name?.toLowerCase().includes(query) ||
      item.catalog_item_code?.toLowerCase().includes(query);

    const matchesFilter =
      itemFilter === "ALL" ||
      (itemFilter === "NEEDS_MODIFICATION" &&
        item.cfo_review_status === "NEEDS_MODIFICATION") ||
      (itemFilter !== "NEEDS_MODIFICATION" &&
        item.reconciliation_status === itemFilter);

    return matchesSearch && matchesFilter;
  });
}, [itemFilter, itemSearch, items]);

const selectedItem =
  filteredItems.find(
    (item) => Number(item.id) === Number(selectedItemId),
  ) ||
  filteredItems[0] ||
  null;
  const effectiveSelectedItemId = selectedItem?.id || null;

  const itemDetailQuery = useQuery({
    queryKey: ["category-packages", "items", effectiveSelectedItemId],
    queryFn: () => getCategoryPackageItemDetail(effectiveSelectedItemId),
    enabled: perspective === "ITEM" && Boolean(effectiveSelectedItemId),
  });

  const departmentViewData = departmentViewQuery.data;
  const departments = useMemo(
    () => departmentViewData?.departments || [],
    [departmentViewData?.departments],
  );

  const filteredDepartments = useMemo(() => {
    const query = departmentSearch.trim().toLowerCase();

    return departments.filter((department) => {
      const matchesSearch =
        !query ||
        department.department_name?.toLowerCase().includes(query) ||
        department.department_code?.toLowerCase().includes(query);
      const matchesFilter =
        departmentFilter === "ALL" ||
        (departmentFilter === "RECONCILED" &&
          department.reconciliation_status === "RECONCILED") ||
        (departmentFilter === "NEEDS_ALLOCATION" &&
          department.reconciliation_status !== "RECONCILED");
      return matchesSearch && matchesFilter;
    });
  }, [departmentFilter, departmentSearch, departments]);

  const selectedDepartment =
    departments.find(
      (department) =>
        Number(department.department_id) === Number(selectedDepartmentId),
    ) ||
    filteredDepartments[0] ||
    departments[0] ||
    null;

  const allocationDetailQuery = useQuery({
    queryKey: [
      "category-packages",
      "items",
      allocationContext?.packageItemId || null,
    ],
    queryFn: () =>
      getCategoryPackageItemDetail(allocationContext.packageItemId),
    enabled: Boolean(allocationContext?.packageItemId),
  });

  const allocationDepartment = allocationDetailQuery.data?.departments?.find(
    (department) =>
      Number(department.department_item_id) ===
      Number(allocationContext?.departmentItemId),
  );
  const allocationPackageItem =
    allocationDetailQuery.data?.package_item || null;
  const allocationSubItems = allocationDetailQuery.data?.sub_items || [];

  const blockers = packageData?.readiness?.blockers || [];
  const ready = Boolean(packageData?.readiness?.ready);
  const packageEditable = ["DRAFT", "RETURNED_BY_CFO"].includes(
    packageData?.status,
  );
  const selectedItemEditable =
    packageEditable && isPackageItemEditable(packageData?.status, selectedItem);
  const editingSubItemPackageItem = items.find(
    (item) =>
      Number(item.id) ===
      Number(editingSubItem?.category_budget_package_item_id),
  );
  const editingSubItemEditable =
    packageEditable &&
    isPackageItemEditable(packageData?.status, editingSubItemPackageItem);
  const removeCandidatePackageItem = items.find(
    (item) =>
      Number(item.id) ===
      Number(removeCandidate?.category_budget_package_item_id),
  );
  const removeCandidateEditable =
    packageEditable &&
    isPackageItemEditable(packageData?.status, removeCandidatePackageItem);

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
      toast.error(
        error?.response?.data?.message || "Failed to add package model",
      );
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
      toast.error(
        error?.response?.data?.message || "Failed to update package model",
      );
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
      toast.error(
        error?.response?.data?.message || "Failed to remove package model",
      );
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
      toast.error(
        error?.response?.data?.message ||
          "Failed to save department allocation",
      );
    },
  });

  const submitMutation = useMutation({
    mutationFn: submitCategoryPackageToCfo,
    onSuccess: async () => {
      toast.success("Category package submitted to CFO");
      setSubmitOpen(false);
      await invalidatePackageWorkspace();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to submit package to CFO",
      );
    },
  });

  function openAllocationForItemDepartment(department) {
    if (!selectedItemEditable) return;
    setAllocationContext({
      packageItemId: effectiveSelectedItemId,
      departmentItemId: department.department_item_id,
    });
  }

  function openAllocationFromDepartmentView(item) {
    if (!isPackageItemEditable(packageData?.status, item)) return;
    setAllocationContext({
      packageItemId: item.package_item_id,
      departmentItemId: item.department_item_id,
    });
  }

  if (packageQuery.isLoading) {
    return (
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-8 w-72 rounded bg-slate-200" />
          <div className="grid gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-28 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-[620px] rounded-2xl bg-slate-100" />
        </div>
      </section>
    );
  }

  if (packageQuery.isError || !packageData) {
    return (
      <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-black">
              Failed to load category package workspace
            </p>
            <p className="mt-1 text-sm">
              {packageQuery.error?.response?.data?.message ||
                "Refresh the page after checking the Category Packages API."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const approvedTotal = toNumber(packageData.summary?.approvedQuantity);
  const allocatedTotal = toNumber(packageData.summary?.allocatedQuantity);
  const remainingTotal = approvedTotal - allocatedTotal;
  const estimatedPackageTotal = items.reduce(
    (sum, item) => sum + toNumber(item.estimated_total),
    0,
  );
  const displayedBlockers = showAllBlockers ? blockers : blockers.slice(0, 4);

  return (
   <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-sm">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                Category Package Workbench
              </p>
              <StatusBadge status={packageData.status} compact />
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              {packageData.category_name} Package
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Build one hospital-wide package from approved department demand.
              Configure each shared model once, then allocate department
              quantities without duplicating prices or specifications.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                FY {packageData.financial_year}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                Window: {formatStatus(packageData.submission_window?.status)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {items.length} requested item{items.length === 1 ? "" : "s"}
              </span>
              {packageData.returned_at ? (
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">
                  Returned by CFO on {formatDateTime(packageData.returned_at)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => invalidatePackageWorkspace()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              disabled={!ready || submitMutation.isPending || !packageEditable}
              onClick={() => setSubmitOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" />
              Submit Package to CFO
            </button>
          </div>
        </div>

     {packageData.status === "RETURNED_BY_CFO" &&
packageData.return_reason ? (
  <div className="mt-5 min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
    <p className="text-sm font-black">
      CFO return reason
    </p>

    <div className="mt-3 max-h-32 w-full overflow-y-auto rounded-xl border border-amber-200 bg-white/70 px-3 py-2.5">
      <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
        {packageData.return_reason}
      </p>
    </div>
  </div>
) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Package total"
            value={<CurrencyText value={estimatedPackageTotal} />}
            // icon={CircleDollarSign}
            tone="blue"
          />
          <MetricCard
            label="Approved demand"
            value={formatNumber(approvedTotal)}
            icon={CheckCircle2}
          />
          <MetricCard
            label="Allocated"
            value={formatNumber(allocatedTotal)}
            icon={Layers3}
            tone="emerald"
          />
          <MetricCard
            label={remainingTotal < 0 ? "Excess" : "Remaining"}
            value={formatNumber(Math.abs(remainingTotal))}
            icon={AlertCircle}
            tone={
              remainingTotal === 0
                ? "emerald"
                : remainingTotal < 0
                  ? "rose"
                  : "amber"
            }
          />
          <MetricCard
            label="Reconciled items"
            value={`${items.filter((item) => item.reconciliation_status === "RECONCILED").length}/${items.length}`}
            icon={Check}
          />
          <MetricCard
            label="Submission readiness"
            value={
              ready
                ? "Ready"
                : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`
            }
            icon={ready ? CheckCircle2 : AlertCircle}
            tone={ready ? "emerald" : "amber"}
          />
        </div>

        <div className="mt-5">
          <PerspectiveTabs value={perspective} onChange={setPerspective} />
        </div>
      </header>

      {!ready ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-amber-950">
                    Package cannot be submitted yet
                  </p>
                  <p className="mt-0.5 text-sm text-amber-800">
                    Resolve the following package, price, or allocation issues.
                  </p>
                </div>
                {blockers.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllBlockers((current) => !current)}
                    className="text-xs font-black text-amber-900 underline underline-offset-4"
                  >
                    {showAllBlockers
                      ? "Show fewer"
                      : `Show all ${blockers.length}`}
                  </button>
                ) : null}
              </div>
              <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                {displayedBlockers.map((blocker, index) => (
                  <li
                    key={`${blocker.code}-${blocker.packageItemId || "package"}-${index}`}
                    className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-900"
                  >
                    <span className="font-black">
                      {formatStatus(blocker.code)}:
                    </span>{" "}
                    {blocker.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            All package models, prices, and department allocations are ready for
            CFO submission.
          </div>
        </div>
      )}

      {perspective === "ITEM" ? (
        <ItemPerspective
          filteredItems={filteredItems}
          selectedItem={selectedItem}
          selectedItemDetail={itemDetailQuery.data}
          loadingDetail={itemDetailQuery.isLoading}
          search={itemSearch}
          onSearchChange={setItemSearch}
          filter={itemFilter}
          onFilterChange={setItemFilter}
          onSelectItem={setSelectedItemId}
          editable={selectedItemEditable}
          onAddModel={() => setAddModelOpen(true)}
          onEditModel={setEditingSubItem}
          onRemoveModel={setRemoveCandidate}
          onAllocate={openAllocationForItemDepartment}
        />
      ) : (
        <DepartmentPerspective
          filteredDepartments={filteredDepartments}
          selectedDepartment={selectedDepartment}
          search={departmentSearch}
          onSearchChange={setDepartmentSearch}
          filter={departmentFilter}
          onFilterChange={setDepartmentFilter}
          onSelectDepartment={setSelectedDepartmentId}
          editable={packageEditable}
          packageStatus={packageData.status}
          onEditAllocation={openAllocationFromDepartmentView}
          loading={departmentViewQuery.isLoading}
        />
      )}

      <AddModelDrawer
        open={addModelOpen}
        onClose={() => setAddModelOpen(false)}
        packageItem={selectedItem}
        existingPackageSubItems={itemDetailQuery.data?.sub_items || []}
        addingPackageModel={createSubItemMutation.isPending}
        onAddPackageModel={(payload) =>
          selectedItemEditable
            ? createSubItemMutation.mutate({
                packageItemId: effectiveSelectedItemId,
                payload,
              })
            : toast.error("This package item is locked by the CFO decision")
        }
      />

      <EditModelDrawer
        open={Boolean(editingSubItem)}
        onClose={() => setEditingSubItem(null)}
        subItem={editingSubItem}
        loading={updateSubItemMutation.isPending}
        editable={editingSubItemEditable}
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

          if (!removeCandidateEditable) {
            toast.error("This package item is locked by the CFO decision");
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
      >
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-black">Affected allocation summary</p>
          <p className="mt-1">
            {removeCandidate?.allocations?.length || 0} department allocation
            row
            {Number(removeCandidate?.allocations?.length) === 1 ? "" : "s"},
            totaling {formatNumber(removeCandidate?.quantity)} units.
          </p>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={submitOpen}
        title="Submit Category Package to CFO?"
        message={`Submit the ${packageData.category_name} package to CFO review? Shared models, prices, specifications, attachments, and allocations will be locked while the package is in CFO review.`}
        confirmText="Submit to CFO"
        cancelText="Cancel"
        loading={submitMutation.isPending}
        onCancel={() => setSubmitOpen(false)}
        onConfirm={() =>
          submitMutation.mutate({
            packageId: packageData.id,
            payload: {
              row_version: packageData.row_version,
            },
          })
        }
      >
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-black">Package readiness confirmed</p>
              <p className="mt-1">
                {formatNumber(approvedTotal)} approved units are fully
                reconciled across {items.length} requested item
                {items.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
        </div>
      </ConfirmModal>
    </section>
  );
}
