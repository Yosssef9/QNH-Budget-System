import { AnimatePresence, motion } from "framer-motion";
import CurrencyText from "../../CurrencyText";
import CreatedFromTransferBadge from "../../CreatedFromTransferBadge";
import { formatQty } from "../../../utils/numberFormatter";
import SortableHeader from "../../SortableHeader";
import useTableSort from "../../../hooks/useTableSort";
export default function BudgetBalanceSummaryTable({
  items = [],
  onViewLinkedPOs,
}) {
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    items,
    "remainingAmount",
    "desc",
  );
  return (
    <div className="max-w-full max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-max min-w-full table-fixed border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-white">
          <tr className="text-slate-700">
            <SortableHeader
              label="Item"
              column="typeName"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[260px]"
            />

            <SortableHeader
              label="Approved"
              column="approvedAmount"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />

            <SortableHeader
              label="Transfer In"
              column="transferIn"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />

            <SortableHeader
              label="Transfer Out"
              column="transferOut"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />

            <SortableHeader
              label="Net Transfer"
              column="netTransfer"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />

            <SortableHeader
              label="PO Used"
              column="poUsed"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />

            <SortableHeader
              label="Remaining"
              column="remainingAmount"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[180px]"
            />
          </tr>
        </thead>

        <tbody>
          <AnimatePresence initial={false}>
            {sortedRows.map((item) => (
              <motion.tr
                key={item.itemId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
              >
                <td className="border border-slate-200 px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-800">
                      {item.typeName}
                    </span>

                    {Boolean(item.created_from_transfer) && (
                      <CreatedFromTransferBadge />
                    )}
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center">
                  <div className="flex flex-col">
                    <CurrencyText value={item.approvedAmount} />

                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.approvedQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold text-emerald-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.transferIn} />

                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.transferInQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold text-red-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.transferOut} />

                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.transferOutQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold">
                  <CurrencyText value={item.netTransfer} />
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CurrencyText value={item.poUsed} />

                    {Number(item.poUsed || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => onViewLinkedPOs?.(item)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        View Linked POs
                      </button>
                    )}
                  </div>
                </td>
                <td className="border border-slate-200 px-4 py-4 text-center font-bold text-blue-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.remainingAmount} />

                    <span className="text-xs font-medium text-slate-500">
                      Qty: {formatQty(item.remainingQuantity)}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
              >
                No balance records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
