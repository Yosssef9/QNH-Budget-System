import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  WalletCards,
} from "lucide-react";
import {
  createTransfer,
  getTransferCatalogItems,
  getTransferCatalogSubItems,
  getTransferItems,
} from "../../api/transfer.api";
import CurrencyText from "../CurrencyText";
import ConfirmModal from "../ConfirmModal";
import EnterpriseSearch from "../EnterpriseSearch";
import SearchableMultiSelect from "../SearchableMultiSelect";
import Input from "../Input";
function ItemCard({ item, selected, disabled, label, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
        selected
          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-100"
          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-slate-900">
              {item.name}
            </span>

            {item.is_locked === 1 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Pending
              </span>
            )}
          </div>

          <div className="mt-0.5 text-xs text-slate-500">
            {item.expense_type || "Budget Item"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase text-slate-400">Available</div>

          <div className="font-bold text-slate-900">
            <CurrencyText value={item.available_amount || 0} />
          </div>
        </div>

        {selected && (
          <CheckCircle2 className="shrink-0 text-blue-600" size={18} />
        )}
      </div>
    </button>
  );
}

export default function TransferForm() {
  const queryClient = useQueryClient();
  const sourceListRef = useRef(null);
  const targetListRef = useRef(null);
  const [sourceSearch, setSourceSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [form, setForm] = useState({
    from_budget_item_id: "",
    to_budget_item_id: "",

    is_new_item: false,

    new_item_type_id: "",
    destination_catalog_sub_item_id: "",
    new_item_quantity: "",
    new_item_unit_price: "",
    transfer_mode: "AMOUNT",
    transfer_quantity: "",
    amount: "",
    reason: "",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["transfer-items"],
    queryFn: getTransferItems,
  });

  const filteredSourceItems = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();

    if (!q) return items;

    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.expense_type?.toLowerCase().includes(q),
    );
  }, [items, sourceSearch]);

  const filteredTargetItems = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();

    if (!q) return items;

    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.expense_type?.toLowerCase().includes(q),
    );
  }, [items, targetSearch]);
  const sourceItem = useMemo(
    () => items.find((x) => String(x.id) === String(form.from_budget_item_id)),
    [items, form.from_budget_item_id],
  );

  const targetItem = useMemo(
    () => items.find((x) => String(x.id) === String(form.to_budget_item_id)),
    [items, form.to_budget_item_id],
  );
  const hasLockedItems =
    sourceItem?.is_locked === 1 || targetItem?.is_locked === 1;
  const transferAmount = form.is_new_item
    ? Number(form.new_item_quantity || 0) *
      Number(form.new_item_unit_price || 0)
    : form.transfer_mode === "QUANTITY"
      ? Number(form.transfer_quantity || 0) *
        Number(sourceItem?.unit_price || 0)
      : Number(form.amount || 0);
  const transferQuantity = form.is_new_item
    ? 0
    : form.transfer_mode === "QUANTITY"
      ? Number(form.transfer_quantity || 0)
      : Number(transferAmount || 0) / Number(sourceItem?.unit_price || 1);
  const sourceBudget = Number(sourceItem?.available_amount || 0);

  const remainingAfterTransfer = sourceBudget - transferAmount;
  const targetCurrentBalance = Number(targetItem?.available_amount || 0);

  const targetBalanceAfterTransfer = targetCurrentBalance + transferAmount;
  const targetQuantityAfterTransfer =
    Number(transferAmount || 0) / Number(targetItem?.unit_price || 1);
  const { data: budgetTypes = [] } = useQuery({
    queryKey: ["transfer-catalog-items"],
    queryFn: getTransferCatalogItems,
    staleTime: 1000 * 60 * 5,
  });

  const { data: reusableModels = [] } = useQuery({
    queryKey: ["transfer-catalog-sub-items", form.new_item_type_id],
    queryFn: () => getTransferCatalogSubItems(form.new_item_type_id),
    enabled: form.is_new_item && Boolean(form.new_item_type_id),
    staleTime: 1000 * 60 * 5,
  });
  const budgetTypeOptions = useMemo(() => {
    return budgetTypes.map((type) => ({
      value: String(type.id),

      label: type.has_pending_request
        ? `${type.category_name} - ${type.name} ⏳ Pending Approval`
        : `${type.category_name} - ${type.name}`,

      disabled: Boolean(type.has_pending_request),

      has_pending_request: Boolean(type.has_pending_request),
    }));
  }, [budgetTypes]);

  const reusableModelOptions = useMemo(() => {
    return reusableModels.map((model) => ({
      value: String(model.id),
      label: model.sub_item_code
        ? `${model.name} (${model.sub_item_code})`
        : model.name,
    }));
  }, [reusableModels]);

  const canSubmit =
    !hasLockedItems &&
    form.from_budget_item_id &&
    (form.is_new_item
      ? form.new_item_type_id &&
        form.destination_catalog_sub_item_id &&
        form.new_item_quantity &&
        form.new_item_unit_price
      : form.to_budget_item_id) &&
    form.reason.trim() &&
    (form.transfer_mode === "QUANTITY"
      ? Number(form.transfer_quantity) > 0
      : transferAmount > 0) &&
    remainingAfterTransfer >= 0 &&
    String(form.from_budget_item_id) !== String(form.to_budget_item_id);

  const mutation = useMutation({
    mutationFn: createTransfer,

    onMutate: () => {
      toast.loading("Submitting transfer request...", {
        id: "create-transfer",
      });
    },

    onSuccess: () => {
      toast.success("Transfer request submitted successfully", {
        id: "create-transfer",
      });

      queryClient.invalidateQueries({
        queryKey: ["my-transfers"],
      });

      queryClient.invalidateQueries({
        queryKey: ["transfer-items"],
      });

      setForm({
        from_budget_item_id: "",
        to_budget_item_id: "",

        is_new_item: false,

        new_item_type_id: "",
        destination_catalog_sub_item_id: "",
        new_item_quantity: "",
        new_item_unit_price: "",
        transfer_mode: "AMOUNT",
        transfer_quantity: "",
        amount: "",
        reason: "",
      });
    },

    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to submit transfer request",
        {
          id: "create-transfer",
        },
      );
    },
  });
  useEffect(() => {
    if (!sourceSearch.trim()) {
      sourceListRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [sourceSearch]);

  useEffect(() => {
    if (!targetSearch.trim()) {
      targetListRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [targetSearch]);

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.from_budget_item_id) {
      toast.error("Please select a source item");
      return;
    }

    if (!form.is_new_item && !form.to_budget_item_id) {
      toast.error("Please select a destination item");
      return;
    }

    if (transferAmount > sourceBudget) {
      toast.error(
        `Transfer amount exceeds available balance (${sourceBudget.toLocaleString()})`,
      );
      return;
    }
    if (hasLockedItems) {
      toast.error(
        "One of the selected budget items is already involved in a pending transfer request.",
      );
      return;
    }
    setShowConfirmModal(true);
  }
  function confirmTransfer() {
    mutation.mutate({
      from_budget_item_id: Number(form.from_budget_item_id),

      to_budget_item_id: form.is_new_item
        ? null
        : Number(form.to_budget_item_id),

      is_new_item: form.is_new_item,

      new_item_type_id: form.is_new_item ? Number(form.new_item_type_id) : null,
      destination_catalog_sub_item_id: form.is_new_item
        ? Number(form.destination_catalog_sub_item_id)
        : null,

      new_item_quantity: form.is_new_item
        ? Number(form.new_item_quantity)
        : null,

      new_item_unit_price: form.is_new_item
        ? Number(form.new_item_unit_price)
        : null,
      transfer_quantity:
        form.transfer_mode === "QUANTITY"
          ? Number(form.transfer_quantity)
          : null,
      transfer_mode: form.transfer_mode,
      amount: transferAmount,

      reason: form.reason.trim(),
    });

    setShowConfirmModal(false);
  }
  function setAmountPercent(percent) {
    if (!sourceItem) return;

    const amount = Math.floor(sourceBudget * percent);

    setForm((p) => ({
      ...p,
      amount: String(amount),
    }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <ArrowRightLeft size={14} />
            New Request
          </div>

          <h2 className="mt-3 text-xl font-bold text-slate-900">
            Create Transfer Request
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose the item you want to transfer from, then select where the
            amount should go.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
          Loading transfer items...
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px_1fr]">
          <div className="flex flex-col">
            <div className="mb-3 flex items-center gap-2">
              <WalletCards size={18} className="text-red-500" />
              <h3 className="font-bold text-slate-900">Transfer From</h3>
            </div>

            {sourceItem && (
              <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                <div className="text-xs font-bold uppercase text-blue-600">
                  Selected Source
                </div>

                <div className="mt-1 font-bold text-slate-900">
                  {sourceItem.name}
                </div>

                <div className="text-sm text-slate-600">
                  <CurrencyText value={sourceItem.available_amount} />
                </div>
              </div>
            )}

            <EnterpriseSearch
              value={sourceSearch}
              onChange={setSourceSearch}
              placeholder="Search source items..."
              className="mb-3"
              showClear={true}
            />

            <div
              ref={sourceListRef}
              className="grid max-h-[600px] gap-2 overflow-auto pr-1"
            >
              {filteredSourceItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  label="Source"
                  disabled={item.is_locked === 1}
                  selected={
                    String(form.from_budget_item_id) === String(item.id)
                  }
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      from_budget_item_id: item.id,
                      to_budget_item_id:
                        String(p.to_budget_item_id) === String(item.id)
                          ? ""
                          : p.to_budget_item_id,
                    }))
                  }
                />
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex justify-center">
              <div className="rounded-full bg-blue-600 p-3 text-white shadow">
                <ArrowRight size={24} />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Transfer Destination
                  </label>

                  <div className="relative flex rounded-2xl bg-slate-100 p-1">
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-sm transition-all duration-300 ease-out ${
                        form.is_new_item
                          ? "translate-x-full bg-white border border-purple-200"
                          : "translate-x-0 bg-white border border-blue-200"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          is_new_item: false,
                          new_item_type_id: "",
                          destination_catalog_sub_item_id: "",
                          new_item_quantity: "",
                          new_item_unit_price: "",
                        }))
                      }
                      className={`relative z-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                        !form.is_new_item ? "text-blue-700" : "text-slate-500"
                      }`}
                    >
                      Existing Item
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForm((p) => ({
                          ...p,
                          is_new_item: true,
                          to_budget_item_id: "",
                        }));
                      }}
                      className={`relative z-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                        form.is_new_item ? "text-purple-700" : "text-slate-500"
                      }`}
                    >
                      New Item
                    </button>
                  </div>
                </div>
                {!form.is_new_item && (
                  <>
                    <SearchableMultiSelect
                      multiple={false}
                      disableClear
                      value={form.transfer_mode}
                      options={[
                        {
                          value: "AMOUNT",
                          label: "Transfer By Amount",
                        },
                        {
                          value: "QUANTITY",
                          label: "Transfer By Quantity",
                        },
                      ]}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          transfer_mode: e.target.value,
                          amount: "",
                          transfer_quantity: "",
                        }))
                      }
                    />

                    <div className="mt-4">
                      {form.transfer_mode === "AMOUNT" ? (
                        <>
                          <Input
                            type="number"
                            min="1"
                            required
                            label="Transfer Amount"
                            numberFormat
                            value={form.amount}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                amount: e.target.value,
                              }))
                            }
                            placeholder="0"
                          />

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setAmountPercent(0.25)}
                              className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold hover:bg-blue-50"
                            >
                              25%
                            </button>

                            <button
                              type="button"
                              onClick={() => setAmountPercent(0.5)}
                              className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold hover:bg-blue-50"
                            >
                              50%
                            </button>

                            <button
                              type="button"
                              onClick={() => setAmountPercent(1)}
                              className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold hover:bg-blue-50"
                            >
                              Max
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Input
                            type="number"
                            min="1"
                            step="any"
                            required
                            label="Transfer Quantity"
                            value={form.transfer_quantity}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                transfer_quantity: e.target.value,
                              }))
                            }
                          />

                          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                            <div className="text-xs text-slate-500">
                              Source Unit Price
                            </div>

                            <div className="font-semibold">
                              <CurrencyText
                                value={sourceItem?.unit_price || 0}
                              />
                            </div>

                            <div className="mt-2 text-xs text-slate-500">
                              Calculated Amount
                            </div>

                            <div className="font-semibold text-blue-700">
                              <CurrencyText value={transferAmount} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Business Reason
                </label>

                <textarea
                  required
                  rows={5}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Explain why this transfer is needed..."
                  className="w-full resize-none rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all duration-300"
                />
              </div>

              {sourceItem && (
                <div className="rounded-2xl border bg-white p-4">
                  <div className="mb-4 text-lg font-bold text-slate-900">
                    Live Preview
                  </div>

                  <div className="space-y-4">
                    {/* SOURCE ITEM */}
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <div className="mb-3 text-xs font-bold uppercase text-red-600">
                        Source Item
                      </div>

                      <div className="mb-3 font-semibold text-slate-900">
                        {sourceItem.name}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Current Balance
                          </span>

                          <strong>
                            <CurrencyText value={sourceBudget} />
                          </strong>
                        </div>

                        {form.transfer_mode === "QUANTITY" && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Quantity To Transfer
                            </span>

                            <strong>
                              {Number(transferQuantity).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 4,
                                },
                              )}
                            </strong>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Transfer Amount
                          </span>

                          <strong className="text-blue-600">
                            <CurrencyText value={transferAmount} />
                          </strong>
                        </div>

                        <div className="border-t pt-2">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-700">
                              Remaining Balance
                            </span>

                            <strong
                              className={
                                remainingAfterTransfer < 0
                                  ? "text-red-600"
                                  : "text-emerald-600"
                              }
                            >
                              <CurrencyText value={remainingAfterTransfer} />
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TARGET ITEM */}
                    {targetItem && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <div className="mb-3 text-xs font-bold uppercase text-emerald-600">
                          Target Item
                        </div>

                        <div className="mb-3 font-semibold text-slate-900">
                          {targetItem.name}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Current Balance
                            </span>

                            <strong>
                              <CurrencyText value={targetCurrentBalance} />
                            </strong>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-500">Added Amount</span>

                            <strong className="text-blue-600">
                              + <CurrencyText value={transferAmount} />
                            </strong>
                          </div>

                          <div className="border-t pt-2">
                            <div className="flex justify-between">
                              <span className="font-medium text-slate-700">
                                Balance After Transfer
                              </span>

                              <strong className="text-emerald-600">
                                <CurrencyText
                                  value={targetBalanceAfterTransfer}
                                />
                              </strong>
                            </div>
                          </div>

                          <div className="border-t pt-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Additional Units Purchasable
                              </span>

                              <strong className="text-purple-600">
                                {targetQuantityAfterTransfer.toLocaleString(
                                  undefined,
                                  {
                                    maximumFractionDigits: 2,
                                  },
                                )}{" "}
                                Units
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CALCULATION DETAILS */}
                    {form.transfer_mode === "QUANTITY" && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <div className="mb-3 text-xs font-bold uppercase text-blue-600">
                          Calculation Details
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Quantity</span>

                            <strong>
                              {Number(transferQuantity).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 4,
                                },
                              )}
                            </strong>
                          </div>

                          <div className="flex justify-between">
                            <span>Unit Price</span>

                            <strong>
                              <CurrencyText
                                value={sourceItem?.unit_price || 0}
                              />
                            </strong>
                          </div>

                          <div className="flex justify-between">
                            <span>Calculated Amount</span>

                            <strong className="text-blue-600">
                              <CurrencyText value={transferAmount} />
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={mutation.isPending || !canSubmit}
                className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {mutation.isPending
                  ? "Submitting..."
                  : "Submit Transfer Request"}
              </button>
            </div>
          </div>
          <div className="flex h-[700px] flex-col">
            {!form.is_new_item ? (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <WalletCards size={18} className="text-emerald-500" />

                  <h3 className="font-bold text-slate-900">Transfer To</h3>
                </div>

                {targetItem && (
                  <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-xs font-bold uppercase text-emerald-600">
                      Selected Target
                    </div>

                    <div className="mt-1 font-bold text-slate-900">
                      {targetItem.name}
                    </div>

                    <div className="text-sm text-slate-600">
                      <CurrencyText value={targetItem.available_amount} />
                    </div>
                  </div>
                )}

                <EnterpriseSearch
                  value={targetSearch}
                  onChange={setTargetSearch}
                  placeholder="Search target items..."
                  className="mb-3"
                  showClear
                />

                <div
                  ref={targetListRef}
                  className="grid max-h-[600px] gap-2 overflow-auto pr-1"
                >
                  {filteredTargetItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      label="Target"
                      disabled={
                        String(form.from_budget_item_id) === String(item.id) ||
                        item.is_locked === 1
                      }
                      selected={
                        String(form.to_budget_item_id) === String(item.id)
                      }
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          to_budget_item_id: item.id,
                        }))
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <WalletCards size={18} className="text-purple-500" />

                  <h3 className="font-bold text-slate-900">New Budget Item</h3>
                </div>

                <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 sticky top-4 shadow-md">
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Item Type
                    </label>
                    <SearchableMultiSelect
                      key={budgetTypeOptions.length}
                      multiple={false}
                      value={form.new_item_type_id}
                      onChange={(e) => {
                        const selectedType = budgetTypes.find(
                          (x) => String(x.id) === String(e.target.value),
                        );

                        if (selectedType?.has_pending_request) {
                          toast.error(
                            "A pending request already exists for this item type.",
                          );
                          return;
                        }

                        setForm((p) => ({
                          ...p,
                          new_item_type_id: e.target.value,
                          destination_catalog_sub_item_id: "",
                        }));
                      }}
                      options={budgetTypeOptions}
                      placeholder="Select Item Type"
                      searchPlaceholder="Search item type..."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Package Model
                    </label>
                    <SearchableMultiSelect
                      key={`${form.new_item_type_id}-${reusableModelOptions.length}`}
                      multiple={false}
                      value={form.destination_catalog_sub_item_id}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          destination_catalog_sub_item_id: e.target.value,
                        }))
                      }
                      options={reusableModelOptions}
                      placeholder={
                        form.new_item_type_id
                          ? "Select reusable model"
                          : "Select item type first"
                      }
                      searchPlaceholder="Search reusable model..."
                      disabled={!form.new_item_type_id}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      The model identity comes from the reusable catalog. Unit
                      price and transferred quantity are stored on the
                      year-specific package sub-item.
                    </p>
                  </div>

                  <div className="mb-4">
                    <Input
                      type="number"
                      min="1"
                      label="Quantity"
                      value={form.new_item_quantity}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          new_item_quantity: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="mb-5">
                    <Input
                      type="number"
                      min="1"
                      label="Unit Price"
                      numberFormat
                      value={form.new_item_unit_price}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          new_item_unit_price: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-purple-100 bg-white p-4">
                    <div className="text-xs font-bold uppercase text-purple-500">
                      Calculated Total
                    </div>

                    <div className="mt-2 text-3xl font-bold text-purple-700">
                      <CurrencyText value={transferAmount} />
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Quantity × Unit Price
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {sourceItem && (targetItem || form.is_new_item) && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-900">
            Transfer Summary
          </div>

          <div className="mt-2 text-sm text-blue-800">
            You are requesting to transfer{" "}
            <strong>
              <CurrencyText value={transferAmount} />
            </strong>{" "}
            from <strong>{sourceItem.name}</strong> to{" "}
            <strong>
              {form.is_new_item ? "New Budget Item" : targetItem?.name}
            </strong>
            .
          </div>
        </div>
      )}
      <ConfirmModal
        open={showConfirmModal}
        title={
          form.is_new_item
            ? "Submit New Budget Item Request?"
            : "Submit Transfer Request?"
        }
        message={
          form.is_new_item
            ? "A new budget item will be created after approval."
            : "Please review the transfer details before sending the request for approval."
        }
        confirmText="Submit Request"
        cancelText="Cancel"
        loading={mutation.isPending}
        onConfirm={confirmTransfer}
        onCancel={() => setShowConfirmModal(false)}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="text-xs font-bold uppercase text-red-600">
              Transfer From
            </div>

            <div className="mt-1 font-bold text-slate-900">
              {sourceItem?.name}
            </div>
          </div>

          <div className="text-center text-2xl font-bold text-blue-600">↓</div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="text-xs font-bold uppercase text-emerald-600">
              Transfer To
            </div>

            <div className="mt-1 font-bold text-slate-900">
              {form.is_new_item
                ? budgetTypes.find(
                    (x) => String(x.id) === String(form.new_item_type_id),
                  )?.name || "New Budget Item"
                : targetItem?.name}
            </div>

            {form.is_new_item && (
              <div className="mt-1 text-xs font-semibold text-purple-600">
                {reusableModels.find(
                  (x) =>
                    String(x.id) ===
                    String(form.destination_catalog_sub_item_id),
                )?.name || "Selected package model"}
              </div>
            )}
          </div>
          {form.transfer_mode === "QUANTITY" && (
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Transfer Quantity</div>

              <div className="mt-1 text-lg font-bold">
                {Number(transferQuantity).toLocaleString()}
              </div>
            </div>
          )}
          {targetItem && (
            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
              <div className="text-xs text-emerald-600 font-bold">
                Target Quantity After Transfer
              </div>

              <div className="mt-1 text-lg font-bold">
                {targetQuantityAfterTransfer.toLocaleString()}
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Transfer Amount</div>

              <div className="mt-1 text-lg font-bold">
                <CurrencyText value={transferAmount} />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Remaining Balance</div>

              <div className="mt-1 text-lg font-bold text-emerald-600">
                <CurrencyText value={remainingAfterTransfer} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">
              Business Reason
            </div>

            <div className="mt-2 text-sm text-slate-700">{form.reason}</div>
          </div>
        </div>
      </ConfirmModal>
    </form>
  );
}
