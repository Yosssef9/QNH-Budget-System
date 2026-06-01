import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../../theme/statusStyles";

export default function BudgetStatusBadge({ status }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-bold ${
        getBudgetStatusStyle(status).badge
      }`}
    >
      {getBudgetStatusLabel(status)}
    </span>
  );
}
