import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, Send, X } from "lucide-react";

import {
  createAdjustmentRequest,
  getAdjustmentRequestOptions,
} from "../../api/adjustmentRequests.api";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import SearchableMultiSelect from "../SearchableMultiSelect";

const requestTypeOptions = [
  { value: "INCREASE_QUANTITY", label: "Increase Existing Item" },
  { value: "ADD_ITEM", label: "Add New Item" },
];

export default function AdjustmentRequestDrawer({
  open,
  onClose,
  departmentCategoryBudget,
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    requestType: "INCREASE_QUANTITY",
    existingDepartmentBudgetItemId: "",
    catalogItemId: "",
    requestedQuantity: "",
    requestedAmount: "",
    reason: "",
    description: "",
  });

  const categoryBudgetId = departmentCategoryBudget?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adjustment-requests", "options", categoryBudgetId],
    queryFn: () => getAdjustmentRequestOptions(categoryBudgetId),
    enabled: open && Boolean(categoryBudgetId),
  });

  const existingOptions = data?.existingItems || [];
  const newItemOptions = data?.availableNewItems || [];

  useEffect(() => {
    if (!open) return;
    setForm({
      requestType: "INCREASE_QUANTITY",
      existingDepartmentBudgetItemId: "",
      catalogItemId: "",
      requestedQuantity: "",
      requestedAmount: "",
      reason: "",
      description: "",
    });
  }, [open, categoryBudgetId]);

  const selectedExistingItem = useMemo(
    () =>
      existingOptions.find(
        (item) =>
          String(item.existing_department_budget_item_id) ===
          String(form.existingDepartmentBudgetItemId),
      ),
    [existingOptions, form.existingDepartmentBudgetItemId],
  );

  const selectedNewItem = useMemo(
    () =>
      newItemOptions.find(
        (item) => String(item.catalog_item_id) === String(form.catalogItemId),
      ),
    [newItemOptions, form.catalogItemId],
  );

  const selectedItem =
    form.requestType === "INCREASE_QUANTITY"
      ? selectedExistingItem
      : selectedNewItem;

  const mutation = useMutation({
    mutationFn: createAdjustmentRequest,
    onSuccess: () => {
      toast.success("Adjustment request submitted");
      queryClient.invalidateQueries({ queryKey: ["adjustment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to submit adjustment request",
      );
    },
  });

  function updateField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "requestType") {
        next.existingDepartmentBudgetItemId = "";
        next.catalogItemId = "";
      }

      if (name === "existingDepartmentBudgetItemId") {
        const item = existingOptions.find(
          (option) =>
            String(option.existing_department_budget_item_id) === String(value),
        );
        next.catalogItemId = item?.catalog_item_id ? String(item.catalog_item_id) : "";
      }

      return next;
    });
  }

  function submit() {
    if (!categoryBudgetId) return;

    if (!form.reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    if (!form.requestedQuantity && !form.requestedAmount) {
      toast.error("Enter requested quantity or requested amount");
      return;
    }

    if (
      form.requestType === "INCREASE_QUANTITY" &&
      !form.existingDepartmentBudgetItemId
    ) {
      toast.error("Select an existing item");
      return;
    }

    if (form.requestType === "ADD_ITEM" && !form.catalogItemId) {
      toast.error("Select a catalog item to request");
      return;
    }

    mutation.mutate({
      departmentCategoryBudgetId: categoryBudgetId,
      payload: {
        requestType: form.requestType,
        existingDepartmentBudgetItemId:
          form.requestType === "INCREASE_QUANTITY"
            ? Number(form.existingDepartmentBudgetItemId)
            : null,
        catalogItemId:
          form.requestType === "INCREASE_QUANTITY"
            ? Number(selectedExistingItem?.catalog_item_id)
            : Number(form.catalogItemId),
        requestedQuantity: form.requestedQuantity
          ? Number(form.requestedQuantity)
          : null,
        requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : null,
        reason: form.reason,
        description: form.description || null,
      },
    });
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} title="Request Adjustment" fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {departmentCategoryBudget?.category_name || "Category"} Adjustment
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Post-pre-closing request
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This request tells the Category Manager what you need. It does
                not change budget quantities directly; approved requests are
                handled later through transfers.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="enterprise-scrollbar flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-sm font-semibold text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Loading category items...
            </div>
          ) : isError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
              Failed to load adjustment options.
            </div>
          ) : (
            <div className="mx-auto grid max-w-5xl gap-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Request Type
                </label>
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  value={form.requestType}
                  onChange={(event) =>
                    updateField("requestType", event.target.value)
                  }
                  options={requestTypeOptions}
                  placeholder="Select request type"
                  searchPlaceholder="Search request type..."
                />
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {form.requestType === "INCREASE_QUANTITY"
                    ? "Existing approved item"
                    : "Catalog item not in this budget"}
                </label>
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  value={
                    form.requestType === "INCREASE_QUANTITY"
                      ? form.existingDepartmentBudgetItemId
                      : form.catalogItemId
                  }
                  onChange={(event) =>
                    updateField(
                      form.requestType === "INCREASE_QUANTITY"
                        ? "existingDepartmentBudgetItemId"
                        : "catalogItemId",
                      event.target.value,
                    )
                  }
                  options={
                    form.requestType === "INCREASE_QUANTITY"
                      ? existingOptions
                      : newItemOptions
                  }
                  placeholder="Select item"
                  searchPlaceholder="Search items..."
                  getOptionValue={(item) =>
                    String(
                      form.requestType === "INCREASE_QUANTITY"
                        ? item.existing_department_budget_item_id
                        : item.catalog_item_id,
                    )
                  }
                  getOptionLabel={(item) =>
                    form.requestType === "INCREASE_QUANTITY"
                      ? `${item.catalog_item_name} · Approved ${Number(
                          item.category_approved_quantity || 0,
                        ).toLocaleString()}`
                      : `${item.catalog_item_name} · ${item.unit_name || "Unit"}`
                  }
                />

                {selectedItem && (
                  <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Item
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {selectedItem.catalog_item_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Unit
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {selectedItem.unit_name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Current approved
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {selectedItem.category_approved_quantity ?? "-"}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Requested Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.requestedQuantity}
                      onChange={(event) =>
                        updateField("requestedQuantity", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Requested Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.requestedAmount}
                      onChange={(event) =>
                        updateField("requestedAmount", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <label className="mb-2 mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Reason
                </label>
                <textarea
                  rows={4}
                  value={form.reason}
                  onChange={(event) => updateField("reason", event.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  placeholder="Explain why this adjustment is needed"
                />
              </section>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-5xl justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {mutation.isPending ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Send size={17} />
              )}
              Submit Request
            </button>
          </div>
        </div>
      </div>
    </AnimatedDrawer>
  );
}
