import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, PackagePlus, X } from "lucide-react";

import SearchableMultiSelect from "../SearchableMultiSelect";
import { useCreateItemRequest } from "../../hooks/budgets/useBudgetSetup";

export default function RequestBudgetItemModal({
  open,
  onClose,
  categories = [],
}) {
  const [requestCategoryMode, setRequestCategoryMode] = useState("EXISTING");
  const [requestExistingCategoryId, setRequestExistingCategoryId] =
    useState("");
  const [requestNewCategoryName, setRequestNewCategoryName] = useState("");
  const [requestTypeName, setRequestTypeName] = useState("");

  const createItemRequestMutation = useCreateItemRequest();

  function resetForm() {
    setRequestCategoryMode("EXISTING");
    setRequestExistingCategoryId("");
    setRequestNewCategoryName("");
    setRequestTypeName("");
  }

  function handleClose() {
    if (createItemRequestMutation.isPending) return;

    resetForm();
    onClose?.();
  }

  async function handleCreateItemRequest(e) {
    e.preventDefault();

    const typeName = requestTypeName.trim();
    const newCategoryName = requestNewCategoryName.trim();

    if (!typeName) {
      toast.error("Requested item/type name is required");
      return;
    }

    if (requestCategoryMode === "EXISTING" && !requestExistingCategoryId) {
      toast.error("Please select an existing category");
      return;
    }

    if (requestCategoryMode === "NEW" && !newCategoryName) {
      toast.error("New category name is required");
      return;
    }

    try {
      await createItemRequestMutation.mutateAsync({
        existingCategoryId:
          requestCategoryMode === "EXISTING"
            ? Number(requestExistingCategoryId)
            : null,
        requestedCategoryName:
          requestCategoryMode === "NEW" ? newCategoryName : null,
        requestedTypeName: typeName,
      });

      toast.success("Item request sent to admin successfully");
      resetForm();
      setRequestCategoryMode("EXISTING");
      setRequestExistingCategoryId("");
      setRequestNewCategoryName("");
      setRequestTypeName("");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to send item request",
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
              Send a request to admin to add a new item/type under an existing
              category or a new category.
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
            <label className="text-sm font-bold text-slate-900">
              Request Type
            </label>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRequestCategoryMode("EXISTING")}
                className={[
                  "rounded-2xl border px-4 py-3 text-sm font-bold transition",
                  requestCategoryMode === "EXISTING"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                Existing Category
              </button>

              <button
                type="button"
                onClick={() => setRequestCategoryMode("NEW")}
                className={[
                  "rounded-2xl border px-4 py-3 text-sm font-bold transition",
                  requestCategoryMode === "NEW"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                New Category
              </button>
            </div>
          </div>

          {requestCategoryMode === "EXISTING" ? (
            <div>
              <label className="text-sm font-bold text-slate-900">
                Existing Category
              </label>

              <div className="mt-2">
                <SearchableMultiSelect
                  usePortal={false}
                  multiple={false}
                  disableClear
                  value={requestExistingCategoryId}
                  onChange={(e) => setRequestExistingCategoryId(e.target.value)}
                  options={categories}
                  placeholder="Select existing category"
                  searchPlaceholder="Search categories..."
                  getOptionValue={(option) => String(option.id)}
                  getOptionLabel={(option) => option.name}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-bold text-slate-900">
                New Category Name
              </label>

              <input
                value={requestNewCategoryName}
                onChange={(e) => setRequestNewCategoryName(e.target.value)}
                placeholder="Example: Medical Equipment"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-slate-900">
              Requested Item / Type Name
            </label>

            <input
              value={requestTypeName}
              onChange={(e) => setRequestTypeName(e.target.value)}
              placeholder="Example: Printer Toner"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
            This request will be sent to admin. After admin approval, the new
            item/type will appear in the budget item dropdown.
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {createItemRequestMutation.isPending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <PackagePlus size={18} />
              )}
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
