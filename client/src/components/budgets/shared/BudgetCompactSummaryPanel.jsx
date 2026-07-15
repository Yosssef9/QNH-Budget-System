import { formatNumber } from "../../../utils/formatters";
import BudgetSummaryCard from "./BudgetSummaryCard";
import CurrencyText from "../../CurrencyText";

export default function BudgetCompactSummaryPanel({
  totalQuantity,
  totalApprovedQuantity,
  totalApprovedAmount,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <BudgetSummaryCard
        label="Total Requested Quantity"
        value={formatNumber(totalQuantity)}
      />
      <BudgetSummaryCard
        label="Total Approved Quantity"
        value={formatNumber(totalApprovedQuantity)}
      />
      <BudgetSummaryCard
        label="Total Approved Amount"
        value={<CurrencyText compact value={totalApprovedAmount} />}
      />
    </div>
  );
}
