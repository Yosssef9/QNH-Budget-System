import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, FileText, Search, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getMyTransfers } from "../../api/transfer.api";
import CurrencyText from "../CurrencyText";
import EnterpriseSearch from "../EnterpriseSearch";
import { formatDateTime } from "../../utils/dateFormatters";

function StatusBadge({ status }) {
  const styles = {
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        styles[status] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function TransferTable() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-transfers"],
    queryFn: getMyTransfers,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return data.filter((row) => {
      const statusMatch = status === "ALL" || row.status === status;

      const searchMatch =
        !q ||
        row.from_item_name?.toLowerCase().includes(q) ||
        row.to_item_name?.toLowerCase().includes(q) ||
        row.rejection_note?.toLowerCase().includes(q);

      return statusMatch && searchMatch;
    });
  }, [data, status, search]);

  const counts = useMemo(() => {
    return {
      all: data.length,
      pending: data.filter((x) => x.status === "PENDING_APPROVAL").length,
      approved: data.filter((x) => x.status === "APPROVED").length,
      rejected: data.filter((x) => x.status === "REJECTED").length,
    };
  }, [data]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            My Transfer Requests
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track approval status, rejection reasons, and request history.
          </p>
        </div>

        <EnterpriseSearch
          value={search}
          onChange={setSearch}
          placeholder="Search requests..."
          showClear={true}
        />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatus("ALL")}
          className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
            status === "ALL" ? "border-blue-500 bg-blue-50" : "bg-white"
          }`}
        >
          <FileText size={18} className="text-blue-600" />
          <div className="mt-2 text-2xl font-bold">{counts.all}</div>
          <div className="text-xs text-slate-500">All Requests</div>
        </button>

        <button
          type="button"
          onClick={() => setStatus("PENDING_APPROVAL")}
          className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
            status === "PENDING_APPROVAL"
              ? "border-amber-500 bg-amber-50"
              : "bg-white"
          }`}
        >
          <Clock3 size={18} className="text-amber-600" />
          <div className="mt-2 text-2xl font-bold">{counts.pending}</div>
          <div className="text-xs text-slate-500">Pending</div>
        </button>

        <button
          type="button"
          onClick={() => setStatus("APPROVED")}
          className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
            status === "APPROVED"
              ? "border-emerald-500 bg-emerald-50"
              : "bg-white"
          }`}
        >
          <CheckCircle2 size={18} className="text-emerald-600" />
          <div className="mt-2 text-2xl font-bold">{counts.approved}</div>
          <div className="text-xs text-slate-500">Approved</div>
        </button>

        <button
          type="button"
          onClick={() => setStatus("REJECTED")}
          className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
            status === "REJECTED" ? "border-red-500 bg-red-50" : "bg-white"
          }`}
        >
          <XCircle size={18} className="text-red-600" />
          <div className="mt-2 text-2xl font-bold">{counts.rejected}</div>
          <div className="text-xs text-slate-500">Rejected</div>
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
          Loading requests...
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div layout className="grid gap-4">
            {filtered.map((row) => (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={row.status} />

                      <span className="text-xs text-slate-400">
                        Request #{row.id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
                      <span>{row.from_item_name}</span>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {row.from_expense_type}
                      </span>

                      <span className="text-slate-300">→</span>

                      <span>
                        {row.is_new_item
                          ? row.new_item_type_name
                          : row.to_item_name}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          (row.is_new_item
                            ? row.new_item_expense_type
                            : row.to_expense_type) === "CAPEX"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {row.is_new_item
                          ? row.new_item_expense_type
                          : row.to_expense_type}
                      </span>
                    </div>

                    {row.is_new_item && (
  <div className="mt-2 flex flex-wrap gap-2">
    <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
      🆕 New Budget Item
    </span>

    {row.category_name && (
      <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
        {row.category_name}
      </span>
    )}
  </div>
)}

                    <div className="mt-2 text-sm text-slate-500">
                      Requested At:{" "}
                      {row.requested_at
                        ? formatDateTime(row.requested_at)
                        : "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-5 py-4 text-right">
                    <div className="text-xs text-slate-500">Amount</div>

                    <div className="text-xl font-bold text-slate-900">
                      <CurrencyText value={row.amount || 0} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  {row.status === "APPROVED" && (
                    <div>
                      <div className="text-xs text-slate-500">Approved At</div>

                      <div className="text-sm font-semibold text-emerald-700">
                        {row.approved_at
                          ? formatDateTime(row.approved_at)
                          : "-"}
                      </div>
                    </div>
                  )}

                  {row.status === "REJECTED" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-slate-500">
                          Rejected At
                        </div>

                        <div className="text-sm font-semibold text-red-700">
                          {row.rejected_at
                            ? formatDateTime(row.rejected_at)
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Rejection Reason
                        </div>

                        <div className="text-sm font-semibold text-slate-700">
                          {row.rejection_note || "-"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                No transfer requests found.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
