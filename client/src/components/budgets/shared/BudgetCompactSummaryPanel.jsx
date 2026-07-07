import { formatNumber } from "../../../utils/formatters";
import BudgetSummaryCard from "./BudgetSummaryCard";

export default function BudgetCompactSummaryPanel({
  totalQuantity,
}) {
  return (
    <div className="grid md:grid-cols-1">
      <BudgetSummaryCard
        label="Total Requested Quantity"
        value={formatNumber(totalQuantity)}
      />
    </div>
  );
}
