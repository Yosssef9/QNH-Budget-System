import { useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, LockKeyhole, Plus } from "lucide-react";
import {
  useCloseFinancialYear,
  useCreateFinancialYear,
  useFinancialYears,
} from "../hooks/financial-years/useFinancialYears";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export default function FinancialYearsPage() {
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const { data: years = [], isLoading } = useFinancialYears();
  const createMutation = useCreateFinancialYear();
  const closeMutation = useCloseFinancialYear();

  const hasOpenYear = years.some((item) => item.status === "OPEN");

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

  return (
    <div className="space-y-6 p-6 text-slate-800">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-700">
          <CalendarDays size={17} />
          <span>Admin</span>
          <span>/</span>
          <span className="text-slate-700">Financial Years</span>
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Financial Years
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Only users with can_manage_financial_years can open and close years.
          Only one year can be OPEN at a time.
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
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={hasOpenYear || createMutation.isPending}
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
              <th className="px-4 py-3">Started By</th>
              <th className="px-4 py-3">Started At</th>
              <th className="px-4 py-3">Closed By</th>
              <th className="px-4 py-3">Closed At</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-8 text-center font-semibold text-slate-500"
                >
                  Loading financial years...
                </td>
              </tr>
            ) : years.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
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
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.started_by_name || item.started_by || "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.started_at
                      ? new Date(item.started_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.closed_by_name || item.closed_by || "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.closed_at
                      ? new Date(item.closed_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {item.status === "OPEN" ? (
                      <button
                        type="button"
                        onClick={() => handleClose(item.id)}
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
    </div>
  );
}
