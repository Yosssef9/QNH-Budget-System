import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  PackageSearch,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAvailablePOs } from "../../hooks/po/useAvailablePOs";
import { usePOBudgetItems } from "../../hooks/po/usePOBudgetItems";
import { useCreatePOLink } from "../../hooks/po/useCreatePOLink";

import ConfirmModal from "../ConfirmModal";
import CurrencyText from "../CurrencyText";
import EnterpriseSearch from "../EnterpriseSearch";
import Input from "../Input";
import SearchableMultiSelect from "../SearchableMultiSelect";
import { formatDate } from "../../utils/dateFormatters";

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getPOId(po) {
  return po.id;
}

function getPOItemCode(po) {
  return po.item_code || "-";
}

function getPOItemDescription(po) {
  return po.item_description || "-";
}

function getPOSupplier(po) {
  return po.supplier_name || "-";
}

function getPOAvailableQuantity(po) {
  return toNumber(po.available_qty);
}

function getPOUnitCost(po) {
  return toNumber(po.unit_cost);
}

function getBudgetItemId(item) {
  return item.id;
}

function getBudgetItemName(item) {
  return item.budget_type_name || "-";
}

function getBudgetApprovedQuantity(item) {
  return toNumber(item.approved_qty);
}

function getBudgetAlreadyLinkedQuantity(item) {
  return toNumber(item.approved_linked_qty) + toNumber(item.pending_linked_qty);
}

function getBudgetItemRemainingQuantity(item) {
  return toNumber(item.remaining_qty);
}

function SummaryMetric({ label, value, tone = "slate" }) {
  const toneClass =
    tone === "green"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "red"
          ? "text-red-700"
          : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function PORecordDetails({ po }) {
  if (!po) return null;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-blue-600">
            Selected PO Record
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {getPOItemDescription(po)}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-600">
            Code: {getPOItemCode(po)} - Supplier: {getPOSupplier(po)}
          </div>
        </div>
        <CheckCircle2 className="shrink-0 text-blue-600" size={20} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryMetric label="Approved Qty" value={toNumber(po.po_qty)} />
        <SummaryMetric
          label="Already Linked"
          value={toNumber(po.approved_qty) + toNumber(po.pending_qty)}
        />
        <SummaryMetric
          label="Remaining Available"
          value={getPOAvailableQuantity(po)}
          tone="green"
        />
      </div>
    </div>
  );
}

function AllocationSummary({
  selectedBudgetItem,
  selectedPO,
  requestedQty,
  linkedAmount,
}) {
  const budgetApprovedQty = selectedBudgetItem
    ? getBudgetApprovedQuantity(selectedBudgetItem)
    : 0;
  const budgetAlreadyLinkedQty = selectedBudgetItem
    ? getBudgetAlreadyLinkedQuantity(selectedBudgetItem)
    : 0;
  const budgetRemainingQty = selectedBudgetItem
    ? getBudgetItemRemainingQuantity(selectedBudgetItem)
    : 0;
  const poRemainingQty = selectedPO ? getPOAvailableQuantity(selectedPO) : 0;
  const requested = toNumber(requestedQty);
  const remainingAfterBudget = budgetRemainingQty - requested;
  const remainingAfterPO = poRemainingQty - requested;
  const hasWarning =
    requested > 0 && (remainingAfterBudget < 0 || remainingAfterPO < 0);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">
            Allocation Summary
          </div>
          <p className="text-xs font-medium text-slate-500">
            Review available quantities before submitting.
          </p>
        </div>
        {hasWarning && <AlertTriangle className="text-amber-600" size={20} />}
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-bold uppercase text-slate-500">
            Budget Item
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Approved Qty" value={budgetApprovedQty} />
            <SummaryMetric
              label="Already Linked"
              value={budgetAlreadyLinkedQty}
            />
            <SummaryMetric
              label="Remaining Available"
              value={budgetRemainingQty}
              tone="green"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase text-slate-500">
            Request Impact
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Requested Qty" value={requested || "-"} />
            <SummaryMetric
              label="Remaining After Link"
              value={requested ? remainingAfterBudget : "-"}
              tone={remainingAfterBudget < 0 ? "red" : "green"}
            />
            <SummaryMetric
              label="Linked Amount"
              value={<CurrencyText value={linkedAmount || 0} />}
              tone="green"
            />
          </div>
        </div>

        {requested > 0 && selectedPO && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-500">
                PO Remaining After Link
              </span>
              <span
                className={`font-bold ${
                  remainingAfterPO < 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {remainingAfterPO}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function POCard({ po, selected, onClick }) {
  const availableQty = getPOAvailableQuantity(po);
  const disabled = availableQty <= 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-100"
          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">
              {getPOItemDescription(po)}
            </span>

            {selected && (
              <CheckCircle2 className="shrink-0 text-blue-600" size={18} />
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Code: {getPOItemCode(po)}</span>
            <span>•</span>

            <span>Supplier: {getPOSupplier(po)}</span>
            <span>•</span>

            <span className="font-medium text-amber-700">
              Invoice due {formatDate(po.invoice_due_date)}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-bold uppercase text-slate-400">
            Available Qty
          </div>

          <div className="text-sm font-bold text-slate-900">{availableQty}</div>

          <div className="mt-1 text-xs font-medium text-slate-500">
            Unit Price:{" "}
            <span className="font-semibold text-slate-700">
              <CurrencyText value={getPOUnitCost(po)} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function POLinkForm({
  initialRequest = null,
  onSubmitted,
  className = "",
}) {
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState(() =>
    initialRequest?.budget_item_id
      ? String(initialRequest.budget_item_id)
      : null,
  );
  const [selectedPOId, setSelectedPOId] = useState(() =>
    initialRequest?.purchase_invoice_line_id
      ? String(initialRequest.purchase_invoice_line_id)
      : null,
  );
  const [requestedQty, setRequestedQty] = useState(() =>
    initialRequest?.requested_qty ? String(initialRequest.requested_qty) : "",
  );
  const [poSearch, setPOSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const createMutation = useCreatePOLink();

  const { data: budgetItems = [], isLoading: loadingBudgetItems } =
    usePOBudgetItems();

  const {
    data: availablePOs = [],
    isLoading: loadingPOs,
    isFetching: fetchingPOs,
  } = useAvailablePOs({
    search: poSearch || undefined,
  });

  const budgetItemOptions = useMemo(() => {
    return budgetItems.map((item) => ({
      value: String(getBudgetItemId(item)),
      label: getBudgetItemName(item),
    }));
  }, [budgetItems]);

  const selectedBudgetItem = useMemo(() => {
    return budgetItems.find(
      (item) => String(getBudgetItemId(item)) === String(selectedBudgetItemId),
    );
  }, [budgetItems, selectedBudgetItemId]);

  const selectedPO = useMemo(() => {
    return availablePOs.find(
      (po) => String(getPOId(po)) === String(selectedPOId),
    );
  }, [availablePOs, selectedPOId]);

  const numericRequestedQty = toNumber(requestedQty);
  const selectedPOAvailableQty = selectedPO
    ? getPOAvailableQuantity(selectedPO)
    : 0;
  const selectedBudgetRemainingQty = selectedBudgetItem
    ? getBudgetItemRemainingQuantity(selectedBudgetItem)
    : 0;
  const selectedPOUnitCost = selectedPO ? getPOUnitCost(selectedPO) : 0;
  const linkedAmount = numericRequestedQty * selectedPOUnitCost;

  const validationMessage = useMemo(() => {
    if (!selectedBudgetItemId) {
      return "Select a budget item first";
    }

    if (!selectedPOId) {
      return "Select a PO record";
    }

    if (!numericRequestedQty || numericRequestedQty <= 0) {
      return "Requested quantity must be greater than zero";
    }

    if (selectedPO && numericRequestedQty > selectedPOAvailableQty) {
      return `Requested quantity exceeds available PO quantity (${selectedPOAvailableQty})`;
    }

    if (
      selectedBudgetItem &&
      numericRequestedQty > selectedBudgetRemainingQty
    ) {
      return `Requested quantity exceeds budget item quantity (${selectedBudgetRemainingQty})`;
    }

    return "";
  }, [
    numericRequestedQty,
    selectedBudgetItem,
    selectedBudgetItemId,
    selectedBudgetRemainingQty,
    selectedPO,
    selectedPOAvailableQty,
    selectedPOId,
  ]);

  const canSubmit =
    !validationMessage &&
    selectedBudgetItemId &&
    selectedPOId &&
    numericRequestedQty > 0 &&
    !createMutation.isPending;

  function resetForm() {
    setSelectedBudgetItemId(null);
    setSelectedPOId(null);
    setRequestedQty("");
    setPOSearch("");
  }

  async function handleConfirmSubmit() {
    try {
      await createMutation.mutateAsync({
        purchase_invoice_line_id: Number(selectedPOId),
        budget_item_id: Number(selectedBudgetItemId),
        requested_qty: numericRequestedQty,
      });

      setConfirmOpen(false);
      resetForm();

      if (onSubmitted) {
        onSubmitted();
      }
    } catch {
      // Error toast is handled inside useCreatePOLink.
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error(validationMessage || "Please complete the PO link request");
      return;
    }

    setConfirmOpen(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Link2 size={20} className="text-blue-600" />
            Create PO Link Request
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Link an approved Purchase Order quantity to an approved budget item.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Department:{" "}
          <span className="font-bold text-slate-900">
            {budgetItems[0]?.department_name || "-"}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <section
          className="rounded-2xl border border-blue-400  bg-blue-50/40
 p-4 shadow-sm"
        >
          <div className="mb-4 border-b border-slate-200 pb-3">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                1
              </span>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Budget Allocation Setup
                </h3>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Select the budget item and quantity to allocate.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Budget Item
              </label>

              <SearchableMultiSelect
                multiple={false}
                value={selectedBudgetItemId}
                options={budgetItemOptions}
                onChange={(event) =>
                  setSelectedBudgetItemId(event.target.value)
                }
                placeholder={
                  loadingBudgetItems
                    ? "Loading budget items..."
                    : "Select budget item"
                }
                disabled={loadingBudgetItems}
              />

              {selectedBudgetItem && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-bold uppercase text-slate-400">
                    Selected Budget Item
                  </div>

                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {getBudgetItemName(selectedBudgetItem)}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span>Remaining Qty</span>
                    <span className="text-slate-900">
                      {selectedBudgetRemainingQty}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Input
                label="Requested Quantity"
                type="number"
                min="0"
                step="1"
                value={requestedQty}
                onChange={(event) => setRequestedQty(event.target.value)}
                placeholder="Enter quantity to link"
              />
            </div>

            <AllocationSummary
              selectedBudgetItem={selectedBudgetItem}
              selectedPO={selectedPO}
              requestedQty={numericRequestedQty}
              linkedAmount={linkedAmount}
            />

            {validationMessage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                {validationMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending
                ? "Submitting..."
                : "Submit PO Link Request"}
            </button>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-emerald-400 bg-emerald-50/30 p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                2
              </span>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <PackageSearch size={16} className="text-blue-600" />
                  Purchase Order Selection
                </h3>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Search and select the PO record to link.
                </p>
              </div>
            </div>

            {(loadingPOs || fetchingPOs) && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Loading...
              </span>
            )}
          </div>

          <div className="space-y-4">
            <PORecordDetails po={selectedPO} />

            <EnterpriseSearch
              value={poSearch}
              onChange={setPOSearch}
              placeholder="Search PO by item, code, supplier, or ID..."
            />

            <div className="max-h-[480px] space-y-3 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {availablePOs.map((po) => {
                const poId = getPOId(po);

                return (
                  <POCard
                    key={poId}
                    po={po}
                    selected={String(poId) === String(selectedPOId)}
                    onClick={() => setSelectedPOId(String(poId))}
                  />
                );
              })}

              {!loadingPOs && availablePOs.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="text-sm font-bold text-slate-700">
                    No available PO records found
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search text or check if there are approved
                    PO quantities available.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Submit PO Link Request"
        message="Are you sure you want to submit this PO link request for approval?"
        confirmText="Submit Request"
        cancelText="Cancel"
        loading={createMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">
              Budget Item
            </div>

            <div className="mt-1 font-semibold text-slate-900">
              {selectedBudgetItem ? getBudgetItemName(selectedBudgetItem) : "-"}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">
              PO Item
            </div>

            <div className="mt-1 font-semibold text-slate-900">
              {selectedPO ? getPOItemDescription(selectedPO) : "-"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">
                Requested Qty
              </div>

              <div className="mt-1 text-lg font-bold text-slate-900">
                {numericRequestedQty}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">
                Linked Amount
              </div>

              <div className="mt-1 text-lg font-bold text-blue-700">
                <CurrencyText value={linkedAmount} />
              </div>
            </div>
          </div>
        </div>
      </ConfirmModal>
    </form>
  );
}
