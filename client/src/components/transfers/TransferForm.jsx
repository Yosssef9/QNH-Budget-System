import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTransfer, getTransferItems } from "../../api/transfer.api";

export default function TransferForm() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    from_budget_item_id: "",
    to_budget_item_id: "",
    amount: "",
    reason: "",
  });

  const { data: items = [] } = useQuery({
    queryKey: ["transfer-items"],
    queryFn: () => getTransferItems(),
  });

  const sourceItem = useMemo(
    () => items.find((x) => String(x.id) === String(form.from_budget_item_id)),
    [items, form.from_budget_item_id],
  );

  const transferAmount = Number(form.amount || 0);

  const remainingAfterTransfer = sourceItem
    ? Number(sourceItem.total_amount || 0) - transferAmount
    : 0;

  const mutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transfers"],
      });

      setForm({
        from_budget_item_id: "",
        to_budget_item_id: "",
        amount: "",
        reason: "",
      });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();

    mutation.mutate({
      ...form,
      amount: Number(form.amount),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-5 text-lg font-semibold">Create Transfer Request</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Source Item</label>

          <select
            className="w-full rounded-xl border p-3"
            value={form.from_budget_item_id}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                from_budget_item_id: e.target.value,
              }))
            }
          >
            <option value="">Select</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.expense_type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Target Item</label>

          <select
            className="w-full rounded-xl border p-3"
            value={form.to_budget_item_id}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                to_budget_item_id: e.target.value,
              }))
            }
          >
            <option value="">Select</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.expense_type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Amount</label>

          <input
            type="number"
            className="w-full rounded-xl border p-3"
            value={form.amount}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                amount: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Reason</label>

          <textarea
            rows={3}
            className="w-full rounded-xl border p-3"
            value={form.reason}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                reason: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {sourceItem && (
        <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
          <h3 className="mb-3 font-semibold">Transfer Preview</h3>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-slate-500">Current Budget</div>
              <div className="font-semibold">{sourceItem.total_amount}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Transfer Amount</div>
              <div className="font-semibold">{transferAmount}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                Remaining After Transfer
              </div>
              <div
                className={`font-semibold ${
                  remainingAfterTransfer < 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {remainingAfterTransfer}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-white"
      >
        {mutation.isPending ? "Submitting..." : "Create Transfer"}
      </button>
    </form>
  );
}
