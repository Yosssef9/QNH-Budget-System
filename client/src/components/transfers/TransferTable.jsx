import { useQuery } from "@tanstack/react-query";
import { getTransfers } from "../../api/transfer.api";

export default function TransferTable() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: getTransfers,
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">Transfer History</h2>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-3">Date</th>

                <th className="border p-3">From</th>

                <th className="border p-3">To</th>

                <th className="border p-3">Amount</th>

                <th className="border p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td className="border p-3">{row.requested_at}</td>

                  <td className="border p-3">{row.from_item_name}</td>

                  <td className="border p-3">{row.to_item_name}</td>

                  <td className="border p-3">{row.amount}</td>

                  <td className="border p-3">{row.status}</td>
                </tr>
              ))}

              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="border p-5 text-center">
                    No transfers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
