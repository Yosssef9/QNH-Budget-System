import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveCategoryTransfer,
  createCategoryTransfer,
  getCategoryTransferDetails,
  getEligibleCategoryTransferItems,
  getMyCategoryTransfers,
  getPendingCategoryTransfers,
  rejectCategoryTransfer,
} from "../../api/categoryTransfers.api";

export const CATEGORY_TRANSFERS_QUERY_KEY = ["category-transfers"];

export function useEligibleCategoryTransferItems(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_TRANSFERS_QUERY_KEY, "eligible-items", params],
    queryFn: () => getEligibleCategoryTransferItems(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useMyCategoryTransfers(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_TRANSFERS_QUERY_KEY, "my", params],
    queryFn: () => getMyCategoryTransfers(params),
    placeholderData: (previousData) => previousData,
  });
}

export function usePendingCategoryTransfers(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_TRANSFERS_QUERY_KEY, "pending", params],
    queryFn: () => getPendingCategoryTransfers(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCategoryTransferDetails(transferId) {
  return useQuery({
    queryKey: [...CATEGORY_TRANSFERS_QUERY_KEY, "details", transferId],
    queryFn: () => getCategoryTransferDetails(transferId),
    enabled: Boolean(transferId),
  });
}

export function useCreateCategoryTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategoryTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_TRANSFERS_QUERY_KEY });
    },
  });
}

export function useApproveCategoryTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveCategoryTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_TRANSFERS_QUERY_KEY });
    },
  });
}

export function useRejectCategoryTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectCategoryTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_TRANSFERS_QUERY_KEY });
    },
  });
}
