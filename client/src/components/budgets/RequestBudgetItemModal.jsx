import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PackagePlus, X } from "lucide-react";

import Input from "../Input";
import SearchableMultiSelect from "../SearchableMultiSelect";
import { useCreateItemRequest } from "../../hooks/budgets/useBudgetSetup";

export default function RequestBudgetItemModal({
  open,
  onClose,
  categories = [],
  defaultCategoryId = "",
}) {
  const [requestExistingCategoryId, setRequestExistingCategoryId] =
    useState("");
  const [requestTypeName, setRequestTypeName] = useState("");
  const [requestExpenseType, setRequestExpenseType] = useState("OPEX");

  const createItemRequestMutation = useCreateItemRequest();
  const supportedCategories = useMemo(
    () =>
      categories.filter((category) => {
        const code = String(category.category_code || category.code || "")
          .trim()
          .toUpperCase();
        const name = String(category.name || "")
          .trim()
          .toUpperCase();

        return (
          ["IT", "BIOMEDICAL", "GENERAL"].includes(code) ||
          ["IT", "BIOMEDICAL", "GENERAL"].includes(name)
        );
      }),
    [categories],
  );
  const defaultSupportedCategoryId = useMemo(() => {
    const defaultId = defaultCategoryId ? String(defaultCategoryId) : "";
    const hasDefault = supportedCategories.some(
      (category) => String(category.id) === defaultId,
    );

    return hasDefault ? defaultId : String(supportedCategories[0]?.id || "");
  }, [defaultCategoryId, supportedCategories]);
  const selectedCategoryId =
    requestExistingCategoryId || defaultSupportedCategoryId;

  function resetForm() {
    setRequestExistingCategoryId("");
    setRequestTypeName("");
    setRequestExpenseType("OPEX");
  }

  function handleClose() {
    if (createItemRequestMutation.isPending) return;

    resetForm();
    onClose?.();
  }

  async function handleCreateItemRequest(e) {
    e.preventDefault();

    const typeName = requestTypeName.trim();

    if (!typeName) {
      toast.error("Requested item name is required");
      return;
    }

    if (!selectedCategoryId) {
      toast.error("Please select IT, Biomedical, or General");
      return;
    }

    const selectedCategory = supportedCategories.find(
      (category) => String(category.id) === String(selectedCategoryId),
    );

    if (!selectedCategory) {
      toast.error("Select a supported category");
      return;
    }

    const loadingToastId = toast.loading("Sending item request...");

    try {
      await createItemRequestMutation.mutateAsync({
        existingCategoryId: Number(selectedCategoryId),
        requestedTypeName: typeName,
        expenseType: requestExpenseType,
      });

      toast.success("Item request sent to admin successfully", {
        id: loadingToastId,
      });

      /*
       * Close directly instead of calling handleClose().
       * handleClose() may still see the previous isPending value
       * during the current render.
       */
      resetForm();
      onClose?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to send item request",
        {
          id: loadingToastId,
        },
      );
    }
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-[budgetModalEnter_160ms_ease-out]">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              <PackagePlus size={14} />
              HOD Request
            </div>

            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Request New Budget Item
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Send a request to admin to add a new catalog item under IT,
              Biomedical, or General.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={createItemRequestMutation.isPending}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateItemRequest} className="space-y-5 p-6">
          <div>
            <label className="text-sm font-bold text-slate-900">Category</label>

            <div className="mt-2">
              <SearchableMultiSelect
                usePortal={false}
                multiple={false}
                disableClear
                value={selectedCategoryId}
                onChange={(e) => setRequestExistingCategoryId(e.target.value)}
                options={supportedCategories}
                placeholder="Select category"
                searchPlaceholder="Search categories..."
                getOptionValue={(option) => String(option.id)}
                getOptionLabel={(option) => option.name}
              />
            </div>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              Defaults to the active Budget Entry tab. You may choose only IT,
              Biomedical, or General.
            </p>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-900">
              Requested Item Name
            </label>

            <Input
              value={requestTypeName}
              onChange={(e) => setRequestTypeName(e.target.value)}
              placeholder="Example: Printer Toner"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">
              Expense Type
            </label>

            <div className="mt-2">
              <SearchableMultiSelect
                usePortal={false}
                multiple={false}
                disableClear
                value={requestExpenseType}
                onChange={(e) => setRequestExpenseType(e.target.value)}
                options={[
                  {
                    id: "OPEX",
                    name: "OPEX - Operational Expense",
                  },
                  {
                    id: "CAPEX",
                    name: "CAPEX - Capital Expense",
                  },
                ]}
                placeholder="Select expense type"
                searchPlaceholder="Search expense types..."
                getOptionValue={(option) => option.id}
                getOptionLabel={(option) => option.name}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
            This request will be sent to admin. After admin approval, the new
            item will be handled in the catalog workflow. New main categories
            cannot be requested from this form.
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={createItemRequestMutation.isPending}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createItemRequestMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PackagePlus size={18} />

              {createItemRequestMutation.isPending
                ? "Sending..."
                : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
