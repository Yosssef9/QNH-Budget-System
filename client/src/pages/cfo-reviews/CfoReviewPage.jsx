import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Loader2,
  RotateCcw,
} from "lucide-react";

import ConfirmModal from "../../components/ConfirmModal";
import CurrencyText from "../../components/CurrencyText";
import {
  useApproveCfoReviewPackage,
  useCfoReviewPackageDetails,
  useCfoReviewPackages,
  useReturnCfoReviewPackage,
  useUpdateCfoReviewItemStatus,
} from "../../hooks/cfo-reviews/useCfoReviews";
import { toNumber } from "../../utils/number";

function statusBadgeClass(status) {
  switch (status) {
    case "REVIEWED_ACCEPTED":
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "RETURNED":
    case "RETURNED_BY_CFO":
      return "border-red-200 bg-red-50 text-red-700";
    case "PENDING_REVIEW":
    case "SUBMITTED_TO_CFO":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatStatus(status) {
  return String(status || "PENDING_REVIEW")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function quantityMatches(item) {
  return (
    Math.abs(
      toNumber(item.approved_quantity) -
        toNumber(item.total_selected_sub_item_quantity),
    ) < 0.0001
  );
}

export default function CfoReviewPage() {
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [itemNotes, setItemNotes] = useState({});
  const [packageReturnNote, setPackageReturnNote] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const { data: packages = [], isLoading: loadingPackages } =
    useCfoReviewPackages({ status: "SUBMITTED_TO_CFO" });
  const { data: details, isLoading: loadingDetails } =
    useCfoReviewPackageDetails(selectedPackageId);

  const updateItemStatusMutation = useUpdateCfoReviewItemStatus();
  const approvePackageMutation = useApproveCfoReviewPackage();
  const returnPackageMutation = useReturnCfoReviewPackage();

  const selectedPackage = details?.package;
  const items = details?.items || [];

  const allItemsAccepted =
    items.length > 0 &&
    items.every((item) => item.cfo_review_status === "REVIEWED_ACCEPTED");
  const hasReturnedItems = items.some(
    (item) => item.cfo_review_status === "RETURNED",
  );

  const packageTotals = useMemo(
    () =>
      items.reduce(
        (totals, item) => ({
          requested: totals.requested + toNumber(item.total_requested_quantity),
          approved: totals.approved + toNumber(item.approved_quantity),
          selected: totals.selected + toNumber(item.total_selected_sub_item_quantity),
          price: totals.price + toNumber(item.total_price),
        }),
        { requested: 0, approved: 0, selected: 0, price: 0 },
      ),
    [items],
  );

  useEffect(() => {
    if (!selectedPackageId && packages.length > 0) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packages, selectedPackageId]);

  async function updateItemStatus(item, status) {
    const note = itemNotes[item.id] || item.cfo_note || "";

    if (status === "RETURNED" && !note.trim()) {
      toast.error("CFO return note is required");
      return;
    }

    try {
      await updateItemStatusMutation.mutateAsync({
        packageId: selectedPackageId,
        reviewId: item.id,
        payload: {
          status,
          note: note.trim() || null,
        },
      });

      toast.success(
        status === "RETURNED"
          ? "Item marked for return"
          : "Item accepted by CFO",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update CFO item status",
      );
    }
  }

  async function approvePackage() {
    try {
      await approvePackageMutation.mutateAsync({
        packageId: selectedPackageId,
      });
      toast.success("Category package approved");
      setConfirmAction(null);
      setSelectedPackageId(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to approve package",
      );
    }
  }

  async function returnPackage() {
    if (!packageReturnNote.trim()) {
      toast.error("Package return note is required");
      return;
    }

    try {
      await returnPackageMutation.mutateAsync({
        packageId: selectedPackageId,
        payload: { note: packageReturnNote.trim() },
      });
      toast.success("Category package returned");
      setConfirmAction(null);
      setPackageReturnNote("");
      setSelectedPackageId(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to return package");
    }
  }

  return (
    <div className="space-y-6 p-6 text-slate-800">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              CFO Review
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Review submitted category packages. CFO can accept or return
              items, but cannot edit quantities, prices, sub-items, or
              attachments.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">
              Submitted Packages
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Category packages awaiting CFO decision.
            </p>
          </div>

          <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-4">
            {loadingPackages ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={18} />
                Loading packages...
              </div>
            ) : packages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
                No category packages submitted to CFO.
              </div>
            ) : (
              <div className="space-y-3">
                {packages.map((packageRow) => {
                  const active =
                    Number(packageRow.id) === Number(selectedPackageId);

                  return (
                    <button
                      key={packageRow.id}
                      type="button"
                      onClick={() => setSelectedPackageId(packageRow.id)}
                      className={[
                        "w-full rounded-2xl border p-4 text-left transition",
                        active
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {packageRow.category_name}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Financial Year {packageRow.financial_year}
                          </p>
                        </div>

                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                            statusBadgeClass(packageRow.status),
                          ].join(" ")}
                        >
                          {formatStatus(packageRow.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <Metric
                          label="Items"
                          value={packageRow.review_items_count || 0}
                        />
                        <Metric
                          label="Total"
                          value={<CurrencyText value={packageRow.total_price || 0} />}
                        />
                        <Metric
                          label="Accepted"
                          value={packageRow.cfo_accepted_count || 0}
                        />
                        <Metric
                          label="Returned"
                          value={packageRow.cfo_returned_count || 0}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {!selectedPackageId ? (
            <EmptyState />
          ) : loadingDetails ? (
            <div className="flex min-h-[480px] items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Loading CFO review package...
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {selectedPackage?.category_name} Package
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Financial Year {selectedPackage?.financial_year}
                    </p>
                  </div>

                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-bold",
                      statusBadgeClass(selectedPackage?.status),
                    ].join(" ")}
                  >
                    {formatStatus(selectedPackage?.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <MetricCard label="Requested Qty" value={packageTotals.requested} />
                  <MetricCard label="Approved Qty" value={packageTotals.approved} />
                  <MetricCard label="Selected Sub-Item Qty" value={packageTotals.selected} />
                  <MetricCard
                    label="Total Price"
                    value={<CurrencyText value={packageTotals.price} />}
                  />
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={!hasReturnedItems || returnPackageMutation.isPending}
                    onClick={() => setConfirmAction("RETURN_PACKAGE")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={18} />
                    Return Package
                  </button>
                  <button
                    type="button"
                    disabled={!allItemsAccepted || approvePackageMutation.isPending}
                    onClick={() => setConfirmAction("APPROVE_PACKAGE")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} />
                    Approve Package
                  </button>
                </div>
              </section>

              {items.map((item) => (
                <section
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {item.budget_type_name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.department_count || 0} department(s),{" "}
                        {item.attachment_count || 0} attachment(s)
                      </p>
                    </div>

                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-bold",
                        statusBadgeClass(item.cfo_review_status),
                      ].join(" ")}
                    >
                      {formatStatus(item.cfo_review_status)}
                    </span>
                  </div>

                  {!quantityMatches(item) && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                      <AlertCircle size={16} />
                      Approved quantity does not match selected sub-item
                      quantity.
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <MetricCard
                      label="Requested"
                      value={item.total_requested_quantity}
                    />
                    <MetricCard
                      label="Approved"
                      value={item.approved_quantity ?? "-"}
                    />
                    <MetricCard
                      label="Sub-Item Qty"
                      value={item.total_selected_sub_item_quantity}
                    />
                    <MetricCard
                      label="Total Price"
                      value={<CurrencyText value={item.total_price || 0} />}
                    />
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <ReadOnlyTable
                      title="Department Contributions"
                      columns={["Department", "Requested Quantity"]}
                      rows={item.departmentContributions}
                      renderRow={(row) => (
                        <tr key={row.department_id}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {row.department_name}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">
                            {Number(row.requested_quantity || 0).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    />

                    <div className="rounded-2xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h4 className="font-bold text-slate-900">
                          Supporting Documents
                        </h4>
                      </div>
                      <AttachmentList attachments={item.attachments || []} />
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <h4 className="font-bold text-slate-900">
                        Selected Sub-Items
                      </h4>
                    </div>
                    <table className="w-full min-w-[960px] text-sm">
                      <thead className="bg-white text-left text-xs font-bold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Sub-Item</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Unit Cost</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3">Attachments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(item.selectedSubItems || []).map((subItem) => (
                          <tr key={subItem.id}>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">
                                {subItem.sub_item_name_snapshot}
                              </p>
                              {subItem.specification_snapshot && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {subItem.specification_snapshot}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                              {Number(subItem.quantity || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                              <CurrencyText value={subItem.unit_cost || 0} />
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700">
                              <CurrencyText value={subItem.total_price || 0} />
                            </td>
                            <td className="px-4 py-3">
                              <AttachmentList
                                compact
                                attachments={subItem.attachments || []}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {item.category_note && (
                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                      Category Manager Note: {item.category_note}
                    </div>
                  )}

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-900">
                      CFO Note
                    </label>
                    <textarea
                      value={itemNotes[item.id] ?? item.cfo_note ?? ""}
                      onChange={(event) =>
                        setItemNotes((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Required when returning this item. Optional when accepting."
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={updateItemStatusMutation.isPending}
                      onClick={() => updateItemStatus(item, "RETURNED")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={18} />
                      Return Item
                    </button>
                    <button
                      type="button"
                      disabled={updateItemStatusMutation.isPending}
                      onClick={() =>
                        updateItemStatus(item, "REVIEWED_ACCEPTED")
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      Accept Item
                    </button>
                  </div>
                </section>
              ))}
            </>
          )}
        </main>
      </div>

      <ConfirmModal
        open={confirmAction === "APPROVE_PACKAGE"}
        title="Approve category package?"
        message="This finalizes the category budget package. Items become approved and continue to execution activities."
        confirmText="Approve Package"
        loading={approvePackageMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={approvePackage}
      />

      <ConfirmModal
        open={confirmAction === "RETURN_PACKAGE"}
        title="Return category package?"
        message="The package returns to the Category Budget Manager. At least one item must already be returned."
        confirmText="Return Package"
        loading={returnPackageMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={returnPackage}
      >
        <textarea
          value={packageReturnNote}
          onChange={(event) => setPackageReturnNote(event.target.value)}
          rows={4}
          placeholder="Explain why the package is returned."
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </ConfirmModal>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[480px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-blue-700">
          <Eye size={28} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900">
          Select a package
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose a submitted category package from the left side to review its
          consolidated items.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value ?? 0}</p>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value ?? 0}</p>
    </div>
  );
}

function ReadOnlyTable({ title, columns, rows = [], renderRow }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="font-bold text-slate-900">{title}</h4>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-white text-left text-xs font-bold uppercase text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className={[
                  "px-4 py-3",
                  column.toLowerCase().includes("quantity") ? "text-right" : "",
                ].join(" ")}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-slate-500"
              >
                No data available.
              </td>
            </tr>
          ) : (
            rows.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}

function AttachmentList({ attachments = [], compact = false }) {
  if (!attachments.length) {
    return (
      <div
        className={[
          "rounded-xl border border-dashed border-slate-200 text-center font-semibold text-slate-500",
          compact ? "px-3 py-2 text-xs" : "m-4 p-4 text-sm",
        ].join(" ")}
      >
        No attachments.
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2 p-4"}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        >
          <p className="truncate font-bold text-slate-900">
            {attachment.original_file_name}
          </p>
          {attachment.description && (
            <p className="mt-1 text-xs text-slate-500">
              {attachment.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
