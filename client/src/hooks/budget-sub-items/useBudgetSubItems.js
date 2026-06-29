import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBudgetSubItem,
  deactivateBudgetSubItem,
  getBudgetSubItems,
  updateBudgetSubItem,
} from "../../api/budgetSubItems.api";

export const BUDGET_SUB_ITEMS_QUERY_KEY = ["budget-sub-items"];

export function useBudgetSubItems(params = {}) {
  return useQuery({
    queryKey: [...BUDGET_SUB_ITEMS_QUERY_KEY, params],
    queryFn: () => getBudgetSubItems(params),
    enabled: Boolean(params?.budgetTypeId),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateBudgetSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBudgetSubItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_SUB_ITEMS_QUERY_KEY });
    },
  });
}

export function useUpdateBudgetSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBudgetSubItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_SUB_ITEMS_QUERY_KEY });
    },
  });
}

export function useDeactivateBudgetSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateBudgetSubItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_SUB_ITEMS_QUERY_KEY });
    },
  });
}
