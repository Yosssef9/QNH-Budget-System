import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Layers3,
  Loader2,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Save,
  Search,
  Tag,
  Trash2,
  X,
  XCircle,
  ChevronDown,
} from "lucide-react";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../theme/statusStyles";
import CollapsiblePanelToggle from "../components/layout/CollapsiblePanelToggle";
import ConfirmModal from "../components/ConfirmModal";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import {
  useApproveItemRequest,
  useCreateSetupCategory,
  useCreateSetupType,
  useDeleteSetupCategory,
  useDeleteSetupType,
  useItemRequests,
  useRejectItemRequest,
  useSetupCategories,
  useSetupCategoryUsage,
  useSetupTypeUsage,
  useSetupTypes,
  useUpdateSetupCategory,
  useUpdateSetupType,
  useApproveItemRequestManual,
} from "../hooks/budgets/useBudgetSetup";
import { formatDateTime } from "../utils/dateFormatters";

const requestStatusOptions = ["PENDING", "APPROVED", "REJECTED", "ALL"];

const expenseTypeOptions = [
  { value: "OPEX", label: "OPEX" },
  { value: "CAPEX", label: "CAPEX" },
];

const requestStatusSelectOptions = requestStatusOptions.map((status) => ({
  value: status,
  label: status,
}));

export default function BudgetSetupPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [expenseType, setExpenseType] = useState("OPEX");
  const [requestStatus, setRequestStatus] = useState("PENDING");
  const [adminNotes, setAdminNotes] = useState({});
  const [search, setSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const deferredItemSearch = useDeferredValue(search);
  const deferredCategorySearch = useDeferredValue(categorySearch);
  const [isSetupPanelOpen, setIsSetupPanelOpen] = useState(true);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [openRequestIds, setOpenRequestIds] = useState({});
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingTypeName, setEditingTypeName] = useState("");
  const [editingTypeExpenseType, setEditingTypeExpenseType] = useState("OPEX");

  const [confirmAction, setConfirmAction] = useState(null);

  const {
    data: categories = [],
    isLoading: loadingCategories,
    isError: categoriesError,
  } = useSetupCategories();

  const {
    data: types = [],
    isLoading: loadingTypes,
    isError: typesError,
  } = useSetupTypes(selectedCategoryId);

  const {
    data: requests = [],
    isLoading: loadingRequests,
    isError: requestsError,
  } = useItemRequests(requestStatus);

  const createCategoryMutation = useCreateSetupCategory();
  const createTypeMutation = useCreateSetupType();
  const updateCategoryMutation = useUpdateSetupCategory();
  const updateTypeMutation = useUpdateSetupType();
  const categoryUsageMutation = useSetupCategoryUsage();
  const typeUsageMutation = useSetupTypeUsage();
  const deleteCategoryMutation = useDeleteSetupCategory();
  const deleteTypeMutation = useDeleteSetupType();
  const approveMutation = useApproveItemRequest();
  const rejectMutation = useRejectItemRequest();
  const approveManualMutation = useApproveItemRequestManual();
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(String(categories[0].id));
    }
  }, [categories, selectedCategoryId]);

  const filteredTypes = useMemo(() => {
    const keyword = deferredItemSearch.trim().toLowerCase();

    if (!keyword) return types;

    return types.filter((item) =>
      [item.name, item.expense_type].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [types, deferredItemSearch]);

  const filteredCategories = useMemo(() => {
    const keyword = deferredCategorySearch.trim().toLowerCase();

    if (!keyword) return categories;

    return categories.filter((category) =>
      String(category.name || "")
        .toLowerCase()
        .includes(keyword),
    );
  }, [categories, deferredCategorySearch]);

  const selectedCategory = categories.find(
    (category) => String(category.id) === String(selectedCategoryId),
  );

  function buildUsageMessage(action, targetName, usage) {
    if (!usage?.length) {
      return `Are you sure you want to ${action} "${targetName}"?`;
    }

    return `"${targetName}" is already used in ${usage.length} budget(s). Review the details before continuing.`;
  }

  async function handleCreateCategory(e) {
    e.preventDefault();

    const name = categoryName.trim();

    if (!name) {
      toast.error("Category name is required");
      return;
    }

    try {
      const category = await createCategoryMutation.mutateAsync({ name });
      toast.success("Category created successfully");
      setCategoryName("");
      setSelectedCategoryId(String(category.id));
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to create category",
      );
    }
  }

  async function handleCreateType(e) {
    e.preventDefault();

    if (!selectedCategoryId) {
      toast.error("Select category first");
      return;
    }

    const name = typeName.trim();

    if (!name) {
      toast.error("Item/type name is required");
      return;
    }

    try {
      await createTypeMutation.mutateAsync({
        categoryId: selectedCategoryId,
        payload: {
          name,
          expense_type: expenseType,
        },
      });

      toast.success("Item/type created successfully");
      setTypeName("");
      setExpenseType("OPEX");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create item");
    }
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  }

  async function handleUpdateCategory(categoryId) {
    const name = editingCategoryName.trim();

    if (!name) {
      toast.error("Category name is required");
      return;
    }

    try {
      await updateCategoryMutation.mutateAsync({
        categoryId,
        payload: { name },
      });

      toast.success("Category updated successfully");
      cancelEditCategory();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update category",
      );
    }
  }

  function startEditType(item) {
    setEditingTypeId(item.id);
    setEditingTypeName(item.name);
    setEditingTypeExpenseType(item.expense_type || "OPEX");
  }

  function cancelEditType() {
    setEditingTypeId(null);
    setEditingTypeName("");
    setEditingTypeExpenseType("OPEX");
  }

  async function handleUpdateType(item) {
    const name = editingTypeName.trim();

    if (!name) {
      toast.error("Item/type name is required");
      return;
    }

    try {
      await updateTypeMutation.mutateAsync({
        categoryId: selectedCategoryId,
        typeId: item.id,
        payload: {
          name,
          expense_type: editingTypeExpenseType,
        },
      });

      toast.success("Item/type updated successfully");
      cancelEditType();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update item");
    }
  }

  async function requestEditCategory(category) {
    try {
      const usage = await categoryUsageMutation.mutateAsync(category.id);

      setConfirmAction({
        type: "EDIT_CATEGORY",
        target: category,
        usage,
        title: "Edit category?",
        message: buildUsageMessage("edit", category.name, usage),
        danger: false,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to check category usage",
      );
    }
  }

  async function requestDeleteCategory(category) {
    try {
      const usage = await categoryUsageMutation.mutateAsync(category.id);

      setConfirmAction({
        type: "DELETE_CATEGORY",
        target: category,
        usage,
        title: "Deactivate category?",
        message: buildUsageMessage("delete", category.name, usage),
        danger: true,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to check category usage",
      );
    }
  }

  async function requestEditType(item) {
    try {
      const usage = await typeUsageMutation.mutateAsync({
        categoryId: selectedCategoryId,
        typeId: item.id,
      });

      setConfirmAction({
        type: "EDIT_TYPE",
        target: item,
        usage,
        title: "Edit item/type?",
        message: buildUsageMessage("edit", item.name, usage),
        danger: false,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to check item usage",
      );
    }
  }

  async function requestDeleteType(item) {
    try {
      const usage = await typeUsageMutation.mutateAsync({
        categoryId: selectedCategoryId,
        typeId: item.id,
      });

      setConfirmAction({
        type: "DELETE_TYPE",
        target: item,
        usage,
        title: "Deactivate item/type?",
        message: buildUsageMessage("delete", item.name, usage),
        danger: true,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to check item usage",
      );
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;

    if (confirmAction.type === "EDIT_CATEGORY") {
      startEditCategory(confirmAction.target);
      setConfirmAction(null);
      return;
    }

    if (confirmAction.type === "EDIT_TYPE") {
      startEditType(confirmAction.target);
      setConfirmAction(null);
      return;
    }

    if (confirmAction.type === "DELETE_CATEGORY") {
      try {
        await deleteCategoryMutation.mutateAsync(confirmAction.target.id);
        toast.success("Category deactivated successfully");

        if (String(selectedCategoryId) === String(confirmAction.target.id)) {
          setSelectedCategoryId("");
        }

        setConfirmAction(null);
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to delete category",
        );
      }

      return;
    }

    if (confirmAction.type === "DELETE_TYPE") {
      try {
        await deleteTypeMutation.mutateAsync({
          categoryId: selectedCategoryId,
          typeId: confirmAction.target.id,
        });

        toast.success("Item/type deactivated successfully");
        setConfirmAction(null);
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to delete item/type",
        );
      }
    }
  }

  async function handleApproveRequest(request) {
    try {
      await approveMutation.mutateAsync({
        requestId: request.id,
        adminNote: adminNotes[request.id] || null,
      });

      toast.success("Request approved and item created");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to approve request",
      );
    }
  }
  async function handleApproveRequestManual(request) {
    try {
      await approveManualMutation.mutateAsync({
        requestId: request.id,
        adminNote: adminNotes[request.id] || null,
      });

      toast.success("Request approved. You can create the item manually.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to approve request",
      );
    }
  }
  async function handleRejectRequest(request) {
    try {
      await rejectMutation.mutateAsync({
        requestId: request.id,
        adminNote: adminNotes[request.id] || null,
      });

      toast.success("Request rejected");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject request");
    }
  }
  function toggleRequestCard(requestId) {
    setOpenRequestIds((prev) => ({
      ...prev,
      [requestId]: !prev[requestId],
    }));
  }
  const isConfirmLoading =
    deleteCategoryMutation.isPending ||
    deleteTypeMutation.isPending ||
    categoryUsageMutation.isPending ||
    typeUsageMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <Layers3 size={14} />
              Admin Setup
            </div>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Budget Categories & Items Setup
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Manage budget categories, item types, and requests submitted by
              users when they cannot find the needed item.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-slate-500">Categories</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {categories.length}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-amber-700">Requests</p>
              <p className="mt-1 text-xl font-bold text-amber-900">
                {requests.length}
              </p>
            </div>
          </div>
        </div>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsRequestsOpen((prev) => !prev)}
          className="flex w-full flex-col justify-between gap-4 border-b border-slate-200 p-5 text-left transition hover:bg-slate-50 lg:flex-row lg:items-center"
        >
          <div>
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: isRequestsOpen ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400"
              >
                <ChevronDown size={18} />
              </motion.span>

              <h2 className="text-lg font-bold text-slate-900">
                Item / Category Requests
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Approve requests to create the missing category/item, or reject
              them with an admin note.
            </p>
          </div>

          <div className="w-full lg:w-60" onClick={(e) => e.stopPropagation()}>
            <SearchableMultiSelect
              multiple={false}
              disableClear
              value={requestStatus}
              onChange={(e) => setRequestStatus(e.target.value)}
              options={requestStatusSelectOptions}
              placeholder="Select status"
              searchPlaceholder="Search status..."
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isRequestsOpen && (
            <motion.div
              key="item-category-requests-body"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-5">
                {loadingRequests ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    Loading item requests...
                  </div>
                ) : requestsError ? (
                  <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                    Failed to load item requests.
                  </div>
                ) : requests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    No requests found.
                  </div>
                ) : (
                  <div className="columns-1 gap-4 space-y-4 xl:columns-2">
                    {requests.map((request) => {
                      const isPending = request.status === "PENDING";

                      return (
                        <div
                          key={request.id}
                          className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60"
                        >
                          <button
                            type="button"
                            onClick={() => toggleRequestCard(request.id)}
                            className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-slate-100/70"
                          >
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Requested Item / Type
                              </p>
                              <h3 className="mt-1 text-base font-bold text-slate-900">
                                {request.requested_type_name}
                              </h3>
                            </div>
                            <motion.span
                              animate={{
                                rotate: openRequestIds[request.id] ? 0 : -90,
                              }}
                              transition={{ duration: 0.2 }}
                              className="mt-1 text-slate-400"
                            >
                              <ChevronDown size={17} />
                            </motion.span>
                            <span
                              className={[
                                "rounded-full px-3 py-1 text-xs font-bold",
                                request.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : request.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700",
                              ].join(" ")}
                            >
                              {request.status}
                            </span>
                          </button>

                          <AnimatePresence initial={false}>
                            {openRequestIds[request.id] && (
                              <motion.div
                                key={`request-card-body-${request.id}`}
                                initial={{ opacity: 0, height: 0, y: -6 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -6 }}
                                transition={{
                                  duration: 0.22,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4">
                                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                                    <div
                                      className={[
                                        "rounded-xl border p-3",
                                        request.existing_category_id
                                          ? "border-blue-100 bg-blue-50"
                                          : "border-amber-100 bg-amber-50",
                                      ].join(" ")}
                                    >
                                      <p
                                        className={[
                                          "text-xs font-bold uppercase tracking-wide",
                                          request.existing_category_id
                                            ? "text-blue-700"
                                            : "text-amber-700",
                                        ].join(" ")}
                                      >
                                        {request.existing_category_id
                                          ? "Existing Category"
                                          : "New Category Requested"}
                                      </p>

                                      <p className="mt-1 font-bold text-slate-900">
                                        {request.existing_category_name ||
                                          request.requested_category_name ||
                                          "-"}
                                      </p>

                                      <p className="mt-2 text-xs font-semibold text-slate-500">
                                        {request.existing_category_id
                                          ? "User wants to add a new item under this existing category."
                                          : "User wants admin to create this new category first, then add the item under it."}
                                      </p>
                                    </div>

                                    <div className="rounded-xl bg-white p-3">
                                      <p className="text-xs font-bold text-slate-500">
                                        Requested By
                                      </p>
                                      <p className="mt-1 font-semibold text-slate-900">
                                        {request.requested_by_name || "-"}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {request.requested_by_code || ""}
                                      </p>
                                    </div>

                                    <div className="rounded-xl bg-white p-3">
                                      <p className="text-xs font-bold text-slate-500">
                                        Department
                                      </p>
                                      <p className="mt-1 font-semibold text-slate-900">
                                        {request.requested_department_name ||
                                          "-"}
                                      </p>
                                    </div>

                                    <div className="rounded-xl bg-white p-3">
                                      <p className="text-xs font-bold text-slate-500">
                                        Requested At
                                      </p>
                                      <p className="mt-1 font-semibold text-slate-900">
                                        {request.created_at
                                          ? formatDateTime(request.created_at)
                                          : "-"}
                                      </p>
                                    </div>
                                  </div>

                                  <textarea
                                    value={adminNotes[request.id] || ""}
                                    onChange={(e) =>
                                      setAdminNotes((prev) => ({
                                        ...prev,
                                        [request.id]: e.target.value,
                                      }))
                                    }
                                    disabled={!isPending}
                                    rows={3}
                                    placeholder="Admin note, optional"
                                    className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                  />

                                  {isPending ? (
                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRejectRequest(request)
                                        }
                                        disabled={rejectMutation.isPending}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                                      >
                                        <XCircle size={17} />
                                        Reject
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleApproveRequestManual(request)
                                        }
                                        disabled={
                                          approveManualMutation.isPending
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                                      >
                                        <CheckCircle2 size={17} />
                                        Approve Only
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleApproveRequest(request)
                                        }
                                        disabled={approveMutation.isPending}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                      >
                                        <CheckCircle2 size={17} />
                                        Approve & Auto Create
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-500">
                                      <RotateCcw
                                        size={15}
                                        className="mr-1 inline"
                                      />
                                      Reviewed. Admin note:{" "}
                                      {request.admin_note || "-"}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <div className="flex justify-end">
        <CollapsiblePanelToggle
          isOpen={isSetupPanelOpen}
          onToggle={() => setIsSetupPanelOpen((prev) => !prev)}
          openLabel="Show Requests"
          closeLabel="Hide Requests"
        />
      </div>

      <div
        className={[
          "grid min-w-0 gap-6 transition-all duration-300 ease-in-out",
          isSetupPanelOpen
            ? "xl:grid-cols-[420px_minmax(0,1fr)]"
            : "xl:grid-cols-1",
        ].join(" ")}
      >
        <AnimatePresence initial={false}>
          {isSetupPanelOpen && (
            <motion.section
              key="budget-setup-left-panel"
              layout
              initial={{ width: 0, opacity: 0, x: -18 }}
              animate={{ width: "100%", opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -18 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="min-w-0 overflow-hidden"
            >
              <div className="space-y-6">
                <form
                  onSubmit={handleCreateCategory}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Tag size={19} />
                    Add Category
                  </h2>

                  <div className="mt-4 space-y-3">
                    <input
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="Example: IT Equipment"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                      type="submit"
                      disabled={createCategoryMutation.isPending}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {createCategoryMutation.isPending ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                      Create Category
                    </button>
                  </div>
                </form>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Edit3 size={19} />
                    Edit Categories
                  </h2>

                  <div className="relative mt-4">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full rounded-2xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="mt-4 h-[360px] space-y-3 overflow-y-auto pr-1">
                    {loadingCategories ? (
                      <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                        <Loader2 className="mr-2 animate-spin" size={17} />
                        Loading categories...
                      </div>
                    ) : filteredCategories.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                        No matching categories found.
                      </div>
                    ) : (
                      <AnimatePresence initial={false} mode="popLayout">
                        {filteredCategories.map((category) => {
                          const isEditing = editingCategoryId === category.id;
                          const isSelected =
                            String(selectedCategoryId) === String(category.id);

                          return (
                            <motion.div
                              key={category.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.18 }}
                              className={[
                                "rounded-2xl border p-3 transition",
                                isSelected
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 bg-slate-50",
                              ].join(" ")}
                            >
                              {isEditing ? (
                                <div className="space-y-3">
                                  <input
                                    value={editingCategoryName}
                                    onChange={(e) =>
                                      setEditingCategoryName(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                  />

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateCategory(category.id)
                                      }
                                      disabled={
                                        updateCategoryMutation.isPending
                                      }
                                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      {updateCategoryMutation.isPending ? (
                                        <Loader2
                                          className="animate-spin"
                                          size={15}
                                        />
                                      ) : (
                                        <Save size={15} />
                                      )}
                                      Save
                                    </button>

                                    <button
                                      type="button"
                                      onClick={cancelEditCategory}
                                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      <X size={15} />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedCategoryId(String(category.id))
                                    }
                                    className="min-w-0 text-left"
                                  >
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {category.name}
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                      {isSelected
                                        ? "Currently selected"
                                        : "Click to view items"}
                                    </p>
                                  </button>

                                  <div className="flex shrink-0 gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        requestEditCategory(category)
                                      }
                                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      <Edit3 size={14} />
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        requestDeleteCategory(category)
                                      }
                                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
                <form
                  onSubmit={handleCreateType}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <PackagePlus size={19} />
                    Add Item / Type
                  </h2>

                  <div className="mt-4 space-y-3">
                    <SearchableMultiSelect
                      multiple={false}
                      disableClear
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      options={categories}
                      placeholder="Select category"
                      searchPlaceholder="Search categories..."
                      getOptionLabel={(item) => item.name}
                      getOptionValue={(item) => String(item.id)}
                    />

                    <input
                      value={typeName}
                      onChange={(e) => setTypeName(e.target.value)}
                      placeholder="Example: Laptop"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <SearchableMultiSelect
                      multiple={false}
                      disableClear
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value)}
                      options={expenseTypeOptions}
                      placeholder="Select expense type"
                      searchPlaceholder="Search expense type..."
                    />

                    <button
                      type="submit"
                      disabled={
                        createTypeMutation.isPending || !selectedCategoryId
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {createTypeMutation.isPending ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                      Create Item / Type
                    </button>
                  </div>
                </form>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Items under {selectedCategory?.name || "selected category"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review, edit, and delete existing items before adding
                duplicates.
              </p>
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full rounded-2xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 lg:w-72"
              />
            </div>
          </div>

          <div className="p-5">
            {loadingCategories || loadingTypes ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={18} />
                Loading setup data...
              </div>
            ) : categoriesError || typesError ? (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                Failed to load setup data.
              </div>
            ) : filteredTypes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No items found for this category.
              </div>
            ) : (
              <div className="overflow-visible rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Item / Type</th>
                      <th className="px-4 py-3">Expense Type</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredTypes.map((item) => {
                      const isEditing = editingTypeId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className="transition-colors duration-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {isEditing ? (
                              <input
                                value={editingTypeName}
                                onChange={(e) =>
                                  setEditingTypeName(e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                              />
                            ) : (
                              item.name
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {isEditing ? (
                              <SearchableMultiSelect
                                multiple={false}
                                disableClear
                                value={editingTypeExpenseType}
                                onChange={(e) =>
                                  setEditingTypeExpenseType(e.target.value)
                                }
                                options={expenseTypeOptions}
                                placeholder="Expense type"
                                searchPlaceholder="Search expense type..."
                              />
                            ) : (
                              <span
                                className={[
                                  "rounded-full px-3 py-1 text-xs font-bold",
                                  item.expense_type === "CAPEX"
                                    ? "bg-purple-50 text-purple-700"
                                    : "bg-emerald-50 text-emerald-700",
                                ].join(" ")}
                              >
                                {item.expense_type}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateType(item)}
                                  disabled={updateTypeMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {updateTypeMutation.isPending ? (
                                    <Loader2
                                      className="animate-spin"
                                      size={14}
                                    />
                                  ) : (
                                    <Save size={14} />
                                  )}
                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={cancelEditType}
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                >
                                  <X size={14} />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => requestEditType(item)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                >
                                  <Edit3 size={14} />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => requestDeleteType(item)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        danger={confirmAction?.danger}
        confirmText={
          confirmAction?.type?.startsWith("DELETE") ? "Yes, Delete" : "Continue"
        }
        loading={isConfirmLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      >
        {confirmAction?.usage?.length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900">
              <AlertTriangle size={16} />
              Existing budgets using this record
            </div>

            <div className="space-y-2">
              {confirmAction.usage.map((budget) => (
                <div
                  key={budget.budget_id}
                  className="rounded-xl border border-amber-100 bg-white p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      {budget.department_name}
                    </p>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        getBudgetStatusStyle(budget.status).badge
                      }`}
                    >
                      {getBudgetStatusLabel(budget.status)}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                    <p>
                      Year:{" "}
                      <span className="font-bold text-slate-900">
                        {budget.financial_year}
                      </span>
                    </p>

                    <p>
                      Items:{" "}
                      <span className="font-bold text-slate-900">
                        {budget.items_count}
                      </span>
                    </p>

                    <p>
                      Total:{" "}
                      <span className="font-bold text-slate-900">
                        {Number(budget.total_amount || 0).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
