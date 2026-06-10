import { AnimatePresence, motion } from "framer-motion";
import CurrencyText from "../../CurrencyText";
import CreatedFromTransferBadge from "../../CreatedFromTransferBadge";
import { formatQty } from "../../../utils/numberFormatter";

export default function BudgetBalanceSummaryTable({ items = [] }) {
  return (
    <div className="max-w-full max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-max min-w-full table-fixed border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-white">
          <tr className="text-slate-700">
            <th className="w-[260px] border border-slate-200 px-4 py-4">
              Item
            </th>

            <th className="w-[160px] border border-slate-200 px-4 py-4">
              Approved
            </th>

            <th className="w-[160px] border border-slate-200 px-4 py-4">
              Transfer In
            </th>

            <th className="w-[160px] border border-slate-200 px-4 py-4">
              Transfer Out
            </th>

            <th className="w-[160px] border border-slate-200 px-4 py-4">
              Net Transfer
            </th>

            <th className="w-[160px] border border-slate-200 px-4 py-4">
              PO Used
            </th>

            <th className="w-[180px] border border-slate-200 px-4 py-4">
              Remaining
            </th>
          </tr>
        </thead>

        <tbody>
          <AnimatePresence initial={false}>
            {items.map((item) => (
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
                  <CurrencyText value={item.poUsed} />
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
