import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createRequestItem,
  deleteRequestItem,
  getCategoryBudgetItems,
  getCurrentBudgetRequest,
  submitCategoryBudget,
  updateRequestItem,
} from "../../api/budgetRequests.api";

export const BUDGET_REQUESTS_QUERY_KEY = ["budget-requests"];

export function useCurrentBudgetRequest(params = {}) {
  return useQuery({
    queryKey: [...BUDGET_REQUESTS_QUERY_KEY, "current", params],
    queryFn: () => getCurrentBudgetRequest(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCategoryBudgetItems(categoryBudgetId) {
  return useQuery({
    queryKey: [
      ...BUDGET_REQUESTS_QUERY_KEY,
      "category-items",
      categoryBudgetId,
    ],
    queryFn: () => getCategoryBudgetItems(categoryBudgetId),
    enabled: Boolean(categoryBudgetId),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateRequestItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequestItem,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...BUDGET_REQUESTS_QUERY_KEY,
          "category-items",
          variables.categoryBudgetId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: BUDGET_REQUESTS_QUERY_KEY });
    },
  });
}

export function useUpdateRequestItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRequestItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_REQUESTS_QUERY_KEY });
    },
  });
}

export function useDeleteRequestItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRequestItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_REQUESTS_QUERY_KEY });
    },
  });
}

export function useSubmitCategoryBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitCategoryBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_REQUESTS_QUERY_KEY });
    },
  });
}
