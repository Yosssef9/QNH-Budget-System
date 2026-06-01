import CurrencyText from "../../../components/CurrencyText";
import { formatNumber } from "../../../utils/formatters";
import BudgetSummaryCard from "./BudgetSummaryCard";

export default function BudgetCompactSummaryPanel({
  totalQuantity,
  totalAmount,
}) {
  return (
    <div className="grid md:grid-cols-2">
      <BudgetSummaryCard
        label="Total Quantity"
        value={formatNumber(totalQuantity)}
      />

      <BudgetSummaryCard
        label="Total Amount"
        value={<CurrencyText value={totalAmount} />}
        blue
      />
    </div>
  );
}
