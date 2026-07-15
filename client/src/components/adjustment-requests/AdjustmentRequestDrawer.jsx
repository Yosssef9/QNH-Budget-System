import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowRight, Loader2, Minus, Plus, Send, X } from "lucide-react";

import {
  createAdjustmentRequest,
  getAdjustmentRequestOptions,
} from "../../api/adjustmentRequests.api";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import CurrencyText from "../CurrencyText";
import SearchableMultiSelect from "../SearchableMultiSelect";

const requestTypeOptions = [
  { value: "INCREASE_QUANTITY", label: "Increase Existing Item" },
  { value: "ADD_ITEM", label: "Add New Item" },
];

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function approvedQuantity(item) {
  return Number(item?.category_approved_quantity || 0);
}

function nextQuantity(item) {
  return String(approvedQuantity(item) + 1);
}

function QuantityTile({ label, value, tone = "slate", children }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="text-xs font-black uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">
        {children || formatQuantity(value)}
      </div>
    </div>
  );
}

export default function AdjustmentRequestDrawer({
  open,
  onClose,
  departmentCategoryBudget,
  departmentBudget,
}) {
  const queryClient = useQueryClient();
  const [selectedCategoryBudgetId, setSelectedCategoryBudgetId] = useState("");
  const [form, setForm] = useState({
    requestType: "INCREASE_QUANTITY",
    existingDepartmentBudgetItemId: "",
    catalogItemId: "",
    requestedQuantity: "",
    reason: "",
    description: "",
  });

  const categoryOptions = departmentBudget?.categories || [];
  const selectedCategoryBudget = departmentCategoryBudget
    ? departmentCategoryBudget
    : categoryOptions.find(
        (category) => String(category.id) === String(selectedCategoryBudgetId),
      );
  const categoryBudgetId = selectedCategoryBudget?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adjustment-requests", "options", categoryBudgetId],
    queryFn: () => getAdjustmentRequestOptions(categoryBudgetId),
    enabled: open && Boolean(categoryBudgetId),
  });

  const existingOptions = data?.existingItems || [];
  const newItemOptions = data?.availableNewItems || [];

  useEffect(() => {
    if (!open) return;
    setSelectedCategoryBudgetId(
      departmentCategoryBudget?.id ? String(departmentCategoryBudget.id) : "",
    );
    setForm({
      requestType: "INCREASE_QUANTITY",
      existingDepartmentBudgetItemId: "",
      catalogItemId: "",
      requestedQuantity: "",
      reason: "",
      description: "",
    });
  }, [open, departmentCategoryBudget?.id]);

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
  const currentApproved = approvedQuantity(selectedExistingItem);
  const requestedQuantity = Number(form.requestedQuantity || 0);
  const increaseBy = Math.max(requestedQuantity - currentApproved, 0);
  const isIncrease = form.requestType === "INCREASE_QUANTITY";

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
      next.requestedQuantity = "";
    }

      if (name === "existingDepartmentBudgetItemId") {
        const item = existingOptions.find(
          (option) =>
            String(option.existing_department_budget_item_id) === String(value),
        );
        next.catalogItemId = item?.catalog_item_id
          ? String(item.catalog_item_id)
          : "";
        next.requestedQuantity = item ? nextQuantity(item) : "";
      }

      if (name === "catalogItemId" && !isIncrease) {
        next.requestedQuantity = "";
      }

      return next;
    });
  }

  function adjustRequestedQuantity(delta) {
    if (!selectedExistingItem) return;
    const minimum = currentApproved + 1;
    const next = Math.max(
      minimum,
      Number(form.requestedQuantity || minimum) + delta,
    );
    updateField("requestedQuantity", String(next));
  }

  function submit() {
    if (!categoryBudgetId) {
      toast.error("Select a budget category");
      return;
    }

    if (!form.reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    if (isIncrease && !form.existingDepartmentBudgetItemId) {
      toast.error("Select an existing approved item");
      return;
    }

    if (isIncrease && requestedQuantity <= currentApproved) {
      toast.error("Requested quantity must be greater than approved quantity");
      return;
    }

    if (!isIncrease && !form.catalogItemId) {
      toast.error("Select a catalog item to request");
      return;
    }

    if (!form.requestedQuantity) {
      toast.error("Enter requested quantity");
      return;
    }

    mutation.mutate({
      departmentCategoryBudgetId: categoryBudgetId,
      payload: {
        requestType: form.requestType,
        existingDepartmentBudgetItemId: isIncrease
          ? Number(form.existingDepartmentBudgetItemId)
          : null,
        catalogItemId: isIncrease
          ? Number(selectedExistingItem?.catalog_item_id)
          : Number(form.catalogItemId),
      requestedQuantity: form.requestedQuantity
        ? Number(form.requestedQuantity)
        : null,
      reason: form.reason.trim(),
      description: form.description.trim() || null,
      },
    });
  }

  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title="Request Adjustment"
      fullScreen
    >
      <div className="flex h-full flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {selectedCategoryBudget?.category_name || "Category"}{" "}
                Adjustment
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Request a post-pre-closing adjustment
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This request does not change the approved budget directly. The
                Category Manager reviews it and may fulfill it later through
                category transfers.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
              aria-label="Close adjustment request"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="enterprise-scrollbar flex-1 overflow-y-auto p-6">
          {!departmentCategoryBudget && departmentBudget ? (
            <section className="mx-auto mb-5 max-w-6xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Budget Category
              </label>
              <SearchableMultiSelect
                multiple={false}
                disableClear
                value={selectedCategoryBudgetId}
                onChange={(event) => {
                  setSelectedCategoryBudgetId(event.target.value);
                  setForm((prev) => ({
                    ...prev,
                    existingDepartmentBudgetItemId: "",
                    catalogItemId: "",
                    requestedQuantity: "",
                  }));
                }}
                options={categoryOptions}
                placeholder="Select category"
                searchPlaceholder="Search categories..."
                getOptionValue={(category) => String(category.id)}
                getOptionLabel={(category) =>
                  `${category.category_name} - ${category.status}`
                }
              />
            </section>
          ) : null}

          {!categoryBudgetId ? (
            <div className="mx-auto max-w-6xl rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-semibold text-slate-500">
              Select a budget category to load available adjustment items.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-sm font-semibold text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Loading category items...
            </div>
          ) : isError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
              Failed to load adjustment options.
            </div>
          ) : (
            <div className="mx-auto grid max-w-6xl gap-5">
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
                  {isIncrease
                    ? "Existing approved item"
                    : "Catalog item not in this budget"}
                </label>
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  value={
                    isIncrease
                      ? form.existingDepartmentBudgetItemId
                      : form.catalogItemId
                  }
                  onChange={(event) =>
                    updateField(
                      isIncrease
                        ? "existingDepartmentBudgetItemId"
                        : "catalogItemId",
                      event.target.value,
                    )
                  }
                  options={isIncrease ? existingOptions : newItemOptions}
                  placeholder="Select item"
                  searchPlaceholder="Search items..."
                  getOptionValue={(item) =>
                    String(
                      isIncrease
                        ? item.existing_department_budget_item_id
                        : item.catalog_item_id,
                    )
                  }
                  getOptionLabel={(item) =>
                    isIncrease
                      ? `${item.catalog_item_name} - Approved ${formatQuantity(
                          item.category_approved_quantity,
                        )}`
                      : `${item.catalog_item_name} - ${item.unit_name || "Unit"}`
                  }
                />

                {selectedItem ? (
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
                        {isIncrease
                          ? formatQuantity(currentApproved)
                          : "Not in budget"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                {isIncrease ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                      <QuantityTile
                        label="Approved quantity"
                        value={currentApproved}
                        tone="blue"
                      />
                      <div className="flex justify-center">
                        <span className="rounded-full bg-blue-600 p-3 text-white shadow">
                          <ArrowRight size={20} />
                        </span>
                      </div>
                      <QuantityTile label="Requested quantity" tone="emerald">
                        {formatQuantity(requestedQuantity)}
                      </QuantityTile>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex-1">
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-emerald-700">
                            New requested quantity
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => adjustRequestedQuantity(-1)}
                              disabled={!selectedExistingItem}
                              className="rounded-xl border border-emerald-200 bg-white p-3 text-emerald-700 disabled:opacity-40"
                            >
                              <Minus size={16} />
                            </button>
                            <input
                              type="number"
                              min={selectedExistingItem ? currentApproved + 1 : 1}
                              step="1"
                              value={form.requestedQuantity}
                              onChange={(event) =>
                                updateField(
                                  "requestedQuantity",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center text-lg font-black outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                              placeholder={
                                selectedExistingItem
                                  ? String(currentApproved + 1)
                                  : "Select an item first"
                              }
                            />
                            <button
                              type="button"
                              onClick={() => adjustRequestedQuantity(1)}
                              disabled={!selectedExistingItem}
                              className="rounded-xl border border-emerald-200 bg-white p-3 text-emerald-700 disabled:opacity-40"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-700">
                          Approved {formatQuantity(currentApproved)} - Requested{" "}
                          {formatQuantity(requestedQuantity)} (+
                          {formatQuantity(increaseBy)})
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Requested Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.requestedQuantity}
                        onChange={(event) =>
                          updateField("requestedQuantity", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      placeholder="Quantity needed"
                    />
                  </div>
                </div>
              )}

                {isIncrease ? null : (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                    New item requests do not add budget automatically. The
                    Category Manager reviews the request and may fulfill it
                    later through transfers.
                  </div>
                )}

                <label className="mb-2 mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">
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
          <div className="mx-auto flex max-w-6xl justify-end gap-3">
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
