import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyBudgetChangeRequest,
  createBudgetChangeRequest,
  decideCategoryBudgetChangeRequest,
  decideCfoBudgetChangeRequest,
  getBudgetChangeRequestDetails,
  getCategoryBudgetChangeRequests,
  getCfoBudgetChangeRequests,
  getMyBudgetChangeRequests,
} from "../../api/budgetChangeRequests.api";

export const BUDGET_CHANGE_REQUESTS_QUERY_KEY = ["budget-change-requests"];

export function useMyBudgetChangeRequests(params = {}) {
  return useQuery({
    queryKey: [...BUDGET_CHANGE_REQUESTS_QUERY_KEY, "my", params],
    queryFn: () => getMyBudgetChangeRequests(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCategoryBudgetChangeRequests(params = {}) {
  return useQuery({
    queryKey: [...BUDGET_CHANGE_REQUESTS_QUERY_KEY, "category", params],
    queryFn: () => getCategoryBudgetChangeRequests(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCfoBudgetChangeRequests(params = {}) {
  return useQuery({
    queryKey: [...BUDGET_CHANGE_REQUESTS_QUERY_KEY, "cfo", params],
    queryFn: () => getCfoBudgetChangeRequests(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useBudgetChangeRequestDetails(requestId) {
  return useQuery({
    queryKey: [...BUDGET_CHANGE_REQUESTS_QUERY_KEY, "details", requestId],
    queryFn: () => getBudgetChangeRequestDetails(requestId),
    enabled: Boolean(requestId),
  });
}

export function useCreateBudgetChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBudgetChangeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUDGET_CHANGE_REQUESTS_QUERY_KEY,
      });
    },
  });
}

export function useDecideCategoryBudgetChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: decideCategoryBudgetChangeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUDGET_CHANGE_REQUESTS_QUERY_KEY,
      });
    },
  });
}

export function useDecideCfoBudgetChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: decideCfoBudgetChangeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUDGET_CHANGE_REQUESTS_QUERY_KEY,
      });
    },
  });
}

export function useApplyBudgetChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyBudgetChangeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUDGET_CHANGE_REQUESTS_QUERY_KEY,
      });
    },
  });
}
