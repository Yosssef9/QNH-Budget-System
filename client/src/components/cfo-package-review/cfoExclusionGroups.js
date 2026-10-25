// Backwards-compatible exports for existing CFO callers and tests.
// Grouping is shared with Category Manager so model identities stay consistent.
export {
  groupBudgetExclusions as groupCfoExclusions,
  filterBudgetExclusionGroups as filterCfoExclusionGroups,
} from '../budgets/shared/exclusions/budgetExclusionGroups.js';
