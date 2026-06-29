import { useMemo, useState } from "react";
import { ArrowRightLeft, Clock3, FileText, Send } from "lucide-react";
import toast from "react-hot-toast";

import Breadcrumbs from "../components/Breadcrumbs";
import CurrencyText from "../components/CurrencyText";
import EnterpriseSearch from "../components/EnterpriseSearch";
import LoadingSpinner from "../components/LoadingSpinner";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import BudgetStatusBadge from "../components/budgets/shared/BudgetStatusBadge";
import {
  useCreateCategoryTransfer,
  useEligibleCategoryTransferItems,
  useMyCategoryTransfers,
} from "../hooks/category-transfers/useCategoryTransfers";

const defaultForm = {
  fromCategoryTypeReviewId: "",
  toCategoryTypeReviewId: "",
  amount: "",
  reason: "",
};

function formatItemLabel(item) {
  const name = item.budget_type_name || "Budget item";
  const category = item.category_name ? ` - ${item.category_name}` : "";
  const available = Number(item.available_amount || 0).toLocaleString();

  return `${name}${category} - Available SAR ${available}`;
}

function normalizeStatus(status) {
  return status || "PENDING_APPROVAL";
}

function getTransferSearchText(item) {
  return [
    item.id,
    item.financial_year,
    item.category_name,
    item.from_budget_type_name,
    item.to_budget_type_name,
    item.reason,
    item.status,
    item.requested_by_name,
    item.amount,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function TransferPage() {
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");

  const {
    data: eligibleTransferData,
    isLoading: loadingItems,
    isError: itemsError,
    error: eligibleItemsError,
  } = useEligibleCategoryTransferItems();
  const eligibleItems = eligibleTransferData?.items || [];
  const { data: transfers = [], isLoading: loadingTransfers } =
    useMyCategoryTransfers({ status: "ALL" });
  const createTransferMutation = useCreateCategoryTransfer();

  const selectedSource = useMemo(
    () =>
      eligibleItems.find(
        (item) => Number(item.id) === Number(form.fromCategoryTypeReviewId),
      ) || null,
    [eligibleItems, form.fromCategoryTypeReviewId],
  );

  const targetItems = useMemo(
    () =>
      eligibleItems.filter(
        (item) => Number(item.id) !== Number(form.fromCategoryTypeReviewId),
      ),
    [eligibleItems, form.fromCategoryTypeReviewId],
  );

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transfers;

    return transfers.filter((item) => getTransferSearchText(item).includes(q));
  }, [transfers, search]);

  const availableAmount = Number(selectedSource?.available_amount || 0);
  const amount = Number(form.amount || 0);
  const hasAmountError =
    form.amount !== "" && (!Number.isFinite(amount) || amount <= 0);
  const exceedsAvailable = amount > availableAmount;
  const canSubmit =
    form.fromCategoryTypeReviewId &&
    form.toCategoryTypeReviewId &&
    form.reason.trim() &&
    Number.isFinite(amount) &&
    amount > 0 &&
    !exceedsAvailable;

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "fromCategoryTypeReviewId"
        ? { toCategoryTypeReviewId: "" }
        : {}),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Complete the transfer request before submitting.");
      return;
    }

    createTransferMutation.mutate(
      {
        fromCategoryTypeReviewId: Number(form.fromCategoryTypeReviewId),
        toCategoryTypeReviewId: Number(form.toCategoryTypeReviewId),
        amount,
        reason: form.reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Transfer request submitted to CFO.");
          setForm(defaultForm);
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message ||
              "Failed to submit transfer request.",
          );
        },
      },
    );
  }

  if (loadingItems) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading Transfer Requests"
        subtitle="Checking approved category budget items..."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/" },
          { label: "Transfer Requests" },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <ArrowRightLeft size={16} />
              Category Budget Transfers
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Transfer Requests
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Move approved budget value between consolidated parent items
              inside the same category during PRE-CLOSING. Transfers are sent to
              the CFO for approval before they affect available balances.
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            Parent-item level only. Sub-items are not transferred.
          </div>
        </div>
      </section>

      {itemsError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
          {eligibleItemsError?.response?.data?.message ||
            "Transfers are available only during PRE-CLOSING for approved category budgets."}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
            <Send size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Create Transfer Request
            </h2>
            <p className="text-sm text-slate-500">
              Select the source item, target item, amount, and business reason.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              From approved item
            </label>
            <SearchableMultiSelect
              multiple={false}
              value={form.fromCategoryTypeReviewId}
              options={eligibleItems.map((item) => ({
                value: item.id,
                label: formatItemLabel(item),
              }))}
              onChange={(event) =>
                updateField("fromCategoryTypeReviewId", event.target.value)
              }
              placeholder="Select source item"
              noResultsText="No approved items are available for transfer."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              To approved item
            </label>
            <SearchableMultiSelect
              multiple={false}
              value={form.toCategoryTypeReviewId}
              options={targetItems.map((item) => ({
                value: item.id,
                label: formatItemLabel(item),
              }))}
              onChange={(event) =>
                updateField("toCategoryTypeReviewId", event.target.value)
              }
              disabled={!form.fromCategoryTypeReviewId}
              placeholder={
                form.fromCategoryTypeReviewId
                  ? "Select target item"
                  : "Select source item first"
              }
              noResultsText="No target items are available."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Transfer amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Enter amount"
            />
            {selectedSource && (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Available from selected item:{" "}
                <CurrencyText value={availableAmount} />
              </p>
            )}
            {hasAmountError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                Amount must be greater than zero.
              </p>
            )}
            {exceedsAvailable && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                Amount cannot exceed the available source balance.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Business reason
            </label>
            <textarea
              rows={4}
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
              maxLength={2000}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Explain why this transfer is needed..."
            />
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit || createTransferMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {createTransferMutation.isPending
                ? "Submitting..."
                : "Submit to CFO"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Clock3 size={16} />
              Transfer History
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              My Category Transfer Requests
            </h2>
          </div>
          <div className="w-full lg:w-80">
            <EnterpriseSearch
              value={search}
              onChange={setSearch}
              placeholder="Search transfer requests..."
            />
          </div>
        </div>

        {loadingTransfers ? (
          <div className="py-10 text-center text-sm font-semibold text-slate-500">
            Loading transfer requests...
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <FileText className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              No transfer requests found.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTransfers.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.from_budget_type_name || "-"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.to_budget_type_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.category_name || "-"}
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-700">
                      <CurrencyText value={item.amount} />
                    </td>
                    <td className="px-4 py-3">
                      <BudgetStatusBadge status={normalizeStatus(item.status)} />
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-600">
                      {item.reason || "-"}
                      {item.rejection_note && (
                        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                          Rejected: {item.rejection_note}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
