import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, LockKeyhole, Plus } from "lucide-react";
import {
  useCloseFinancialYear,
  useCreateFinancialYear,
  useFinancialYears,
  usePreCloseFinancialYear,
} from "../hooks/financial-years/useFinancialYears";
import { formatDateTime } from "../utils/dateFormatters";
import ConfirmModal from "../components/ConfirmModal";
import Breadcrumbs from "../components/Breadcrumbs";
import Input from "../components/Input";
import { getFinancialYearStatusLabel } from "../theme/statusStyles";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export default function FinancialYearsPage() {
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [selectedYear, setSelectedYear] = useState(null);

  const [showPreCloseModal, setShowPreCloseModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const { data: years = [], isLoading } = useFinancialYears();
  const createMutation = useCreateFinancialYear();
  const closeMutation = useCloseFinancialYear();
  const preCloseMutation = usePreCloseFinancialYear();
  const hasActiveYear = years.some((item) =>
    ["OPEN", "PRE_CLOSING"].includes(item.status),
  );

  async function handleCreate(e) {
    e.preventDefault();

    const toastId = toast.loading("Opening financial year...");

    try {
      await createMutation.mutateAsync({ year: Number(year) });
      toast.success("Financial year opened successfully", { id: toastId });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to open financial year"), {
        id: toastId,
      });
    }
  }

  async function handleClose(id) {
    const toastId = toast.loading("Closing financial year...");

    try {
      await closeMutation.mutateAsync(id);
      toast.success("Financial year closed successfully", { id: toastId });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to close financial year"), {
        id: toastId,
      });
    }
  }
  async function handlePreClose(id) {
    const toastId = toast.loading("Moving financial year to pre-closing...");

    try {
      await preCloseMutation.mutateAsync(id);
      toast.success("Financial year moved to pre-closing successfully", {
        id: toastId,
      });
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to move financial year to pre-closing"),
        { id: toastId },
      );
    }
  }
  return (
    <div className="space-y-6 p-6 text-slate-800">
      <div>
        <Breadcrumbs
          items={[
            {
              label: "Dashboard",
              path: "/",
            },
            {
              label: "Financial Years",
              path: "/financial-years",
            },
          ]}
        />

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Financial Years
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Open, pre-close, and close financial years to control budget planning
          and financial operations.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end"
      >
        <div className="flex-1">
          <label className="text-sm font-bold text-slate-700">
            New Financial Year
          </label>
          <Input
            type="number"
            min="2000"
            max="2200"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            containerClassName="mt-2"
            className="h-11 rounded-xl px-4 py-0 text-sm font-semibold focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={hasActiveYear || createMutation.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          Open Year
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Opened By</th>
              <th className="px-4 py-3">Opened At</th>
              <th className="px-4 py-3">Pre-Closed By</th>
              <th className="px-4 py-3">Pre-Closed At</th>
              <th className="px-4 py-3">Closed By</th>
              <th className="px-4 py-3">Closed At</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-8 text-center font-semibold text-slate-500"
                >
                  Loading financial years...
                </td>
              </tr>
            ) : years.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-8 text-center font-semibold text-slate-500"
                >
                  No financial years yet.
                </td>
              </tr>
            ) : (
              years.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {item.year}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-bold ${
                        item.status === "OPEN"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "PRE_CLOSING"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {getFinancialYearStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.opened_by_name ||
                      item.opened_by ||
                      item.started_by_name ||
                      item.started_by ||
                      "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.opened_at || item.started_at
                      ? formatDateTime(item.opened_at || item.started_at)
                      : "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.pre_closed_by_name || item.pre_closed_by || "-"}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {item.pre_closed_at
                      ? formatDateTime(item.pre_closed_at)
                      : "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.closed_by_name || item.closed_by || "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.closed_at ? formatDateTime(item.closed_at) : "-"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {item.status === "OPEN" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedYear(item);
                          setShowPreCloseModal(true);
                        }}
                        disabled={preCloseMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={15} />
                        Pre-Close
                      </button>
                    ) : item.status === "PRE_CLOSING" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedYear(item);
                          setShowCloseModal(true);
                        }}
                        disabled={closeMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        <LockKeyhole size={15} />
                        Close
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Closed
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={showPreCloseModal}
        title={`Pre-Close Financial Year ${selectedYear?.year || ""}`}
        confirmText="Pre-Close Year"
        loading={preCloseMutation.isPending}
        onCancel={() => {
          setShowPreCloseModal(false);
          setSelectedYear(null);
        }}
        onConfirm={async () => {
          await handlePreClose(selectedYear.id);

          setShowPreCloseModal(false);
          setSelectedYear(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to move this financial year to PRE-CLOSING?
          </p>

          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>No new budgets can be created.</li>
            <li>All department budgets should already be approved.</li>
            <li>Transfers can still be created and completed.</li>
            <li>PO linking can still be completed.</li>
          </ul>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-700">
              Ensure all department budgets have been reviewed before
              continuing.
            </p>
          </div>
        </div>
      </ConfirmModal>
      <ConfirmModal
        open={showCloseModal}
        title={`Close Financial Year ${selectedYear?.year || ""}`}
        danger
        confirmText="Close Year"
        loading={closeMutation.isPending}
        onCancel={() => {
          setShowCloseModal(false);
          setSelectedYear(null);
        }}
        onConfirm={async () => {
          await handleClose(selectedYear.id);

          setShowCloseModal(false);
          setSelectedYear(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to close this financial year?
          </p>

          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>The financial year will become read-only.</li>
            <li>Budgets cannot be modified.</li>
            <li>Transfers cannot be created.</li>
            <li>PO links cannot be changed.</li>
          </ul>

          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-700">
              This action should only be performed after final review.
            </p>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
