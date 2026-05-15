import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveBudget,
  getBudgetReview,
  getPendingApprovals,
  returnBudget,
  getBudgetComparison,
  getApprovedApprovals,
} from "../../api/budget.api";

const APPROVAL_QUERY_KEY = ["budget-approval"];
const PENDING_QUERY_KEY = [...APPROVAL_QUERY_KEY, "pending"];

export function usePendingBudgetApprovals() {
  return useQuery({
    queryKey: PENDING_QUERY_KEY,
    queryFn: getPendingApprovals,
    placeholderData: (previousData) => previousData,
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

    onSuccess: (_, variables) => {
      queryClient.setQueryData(["budget-approval", "pending"], (old = []) =>
        old.filter((budget) => budget.id !== variables.budgetId),
      );

      queryClient.invalidateQueries({
        queryKey: ["budget-approval", "approved"],
      });

      queryClient.invalidateQueries({
        queryKey: ["budget-review", variables.budgetId],
      });

      queryClient.invalidateQueries({
        queryKey: ["budget-comparison"],
      });
    },
  });
}

export function useReturnBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ budgetId, payload }) => returnBudget(budgetId, payload),
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData(PENDING_QUERY_KEY, (old = []) =>
        old.filter(
          (budget) => Number(budget.id) !== Number(variables.budgetId),
        ),
      );

      queryClient.removeQueries({
        queryKey: [...APPROVAL_QUERY_KEY, "review", variables.budgetId],
      });

      await queryClient.invalidateQueries({
        queryKey: PENDING_QUERY_KEY,
      });

      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["currentBudget"] });
      queryClient.invalidateQueries({
        queryKey: [...APPROVAL_QUERY_KEY, "comparison"],
      });
    },
  });
}

export function useBudgetComparison() {
  return useQuery({
    queryKey: [...APPROVAL_QUERY_KEY, "comparison"],
    queryFn: getBudgetComparison,
  });
}

export function useApprovedBudgetApprovals() {
  return useQuery({
    queryKey: ["budget-approval", "approved"],
    queryFn: getApprovedApprovals,
    placeholderData: (previousData) => previousData,
  });
}
