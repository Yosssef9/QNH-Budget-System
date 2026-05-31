import Breadcrumbs from "../../components/Breadcrumbs";
import CurrencyText from "../../components/CurrencyText";
import { useBudgetView } from "../../hooks/budgets/useBudgetView";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../theme/statusStyles";

export default function BudgetViewPage() {
  const { data, isLoading } = useBudgetView();

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!data) {
    return <div className="p-6">Budget not found</div>;
  }

  const budget = data;

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          {
            label: "Dashboard",
            path: "/",
          },
          {
            label: "My Budgets",
            path: "/budgets/my",
          },
          {
            label: `Budget ${budget.financial_year}`,
          },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Budget Details</h1>

        <p className="mt-2 text-slate-500">
          View budget information and items.
        </p>
      </div>

      <section className="rounded-2xl border bg-white p-6">
        <div className="grid gap-4 md:grid-cols-5">
          <Info label="Department" value={budget.department_name} />

          <Info label="Financial Year" value={budget.financial_year} />

          <Info label="Created By" value={budget.created_by_name} />

          <Info label="Items" value={budget.items?.length || 0} />

          <Info
            label="Status"
            value={
              <span
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  getBudgetStatusStyle(budget.status).badge
                }`}
              >
                {getBudgetStatusLabel(budget.status)}
              </span>
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left">Item</th>

              <th className="p-4 text-left">Quantity</th>

              <th className="p-4 text-left">Unit Price</th>

              <th className="p-4 text-left">Total</th>
            </tr>
          </thead>

          <tbody>
            {(budget.items || []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-4">{item.type_name}</td>

                <td className="p-4">{item.quantity}</td>

                <td className="p-4">
                  <CurrencyText value={item.unit_price} />
                </td>

                <td className="p-4 font-semibold text-blue-600">
                  <CurrencyText value={item.quantity * item.unit_price} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-700">{label}</p>

      <div className="mt-2">{value}</div>
    </div>
  );
}
