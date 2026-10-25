// CFO retains the same read-only view, now shared with Category Manager.
import BudgetExcludedItemsView from '../budgets/shared/exclusions/BudgetExcludedItemsView.jsx';
export default function CfoExcludedItemsView({ ref, financialYearId, query }) {
  return <BudgetExcludedItemsView ref={ref} financialYearId={financialYearId} query={query} audience="CFO" />;
}

