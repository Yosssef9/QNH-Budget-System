import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveItemRequest,
  createSetupCategory,
  createSetupType,
  getItemRequests,
  getSetupCategories,
  getSetupTypesByCategory,
  rejectItemRequest,
  updateSetupCategory,
  updateSetupType,
  deleteSetupCategory,
  deleteSetupType,
  getSetupCategoryUsage,
  getSetupTypeUsage,
  createItemRequest,
  approveItemRequestManual,
} from "../../api/budgetSetup.api";

export function useSetupCategories() {
  return useQuery({
    queryKey: ["budget-setup", "categories"],
    queryFn: getSetupCategories,
  });
}

export function useSetupTypes(categoryId) {
  return useQuery({
    queryKey: ["budget-setup", "types", categoryId],
    queryFn: () => getSetupTypesByCategory(categoryId),
    enabled: Boolean(categoryId),
  });
}

export function useCreateSetupCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSetupCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "categories"],
      });
    },
  });
}

export function useCreateSetupType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSetupType,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "types", variables.categoryId],
      });
    },
  });
}

export function useItemRequests(status) {
  return useQuery({
    queryKey: ["budget-setup", "item-requests", status],
    queryFn: () => getItemRequests(status),
  });
}

export function useApproveItemRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveItemRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-setup"] });
    },
  });
}

export function useRejectItemRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectItemRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-setup"] });
    },
  });
}
export function useUpdateSetupCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetupCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "categories"],
      });
    },
  });
}

export function useUpdateSetupType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetupType,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "types", variables.categoryId],
      });
    },
  });
}

export function useSetupCategoryUsage() {
  return useMutation({
    mutationFn: getSetupCategoryUsage,
  });
}

export function useSetupTypeUsage() {
  return useMutation({
    mutationFn: getSetupTypeUsage,
  });
}

export function useDeleteSetupCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSetupCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-setup"] });
    },
  });
}

export function useDeleteSetupType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSetupType,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budget-setup"] });
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "types", variables.categoryId],
      });
    },
  });
}
export function useCreateItemRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createItemRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "item-requests"],
      });
    },
  });
}
export function useApproveItemRequestManual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveItemRequestManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-setup"] });
    },
  });
}
