import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveBudget,
  getBudgetReview,
  getPendingApprovals,
  returnBudget,
  getBudgetComparison,
} from "../../api/budget.api";

const APPROVAL_QUERY_KEY = ["budget-approval"];

export function usePendingBudgetApprovals() {
  return useQuery({
    queryKey: [...APPROVAL_QUERY_KEY, "pending"],
    queryFn: getPendingApprovals,
  });
}

export function useBudgetReview(budgetId) {
  return useQuery({
    queryKey: [...APPROVAL_QUERY_KEY, "review", budgetId],
    queryFn: () => getBudgetReview(budgetId),
    enabled: Boolean(budgetId),
  });
}

export function useApproveBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ budgetId, payload }) => approveBudget(budgetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["currentBudget"] });
    },
  });
}

export function useReturnBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ budgetId, payload }) => returnBudget(budgetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["currentBudget"] });
    },
  });
}

export function useBudgetComparison() {
  return useQuery({
    queryKey: [...APPROVAL_QUERY_KEY, "comparison"],
    queryFn: getBudgetComparison,
  });
}
