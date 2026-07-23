import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSetupCategory,
  createSetupSubItem,
  createSetupType,
  getSetupCategories,
  getSetupSubItemsByCatalogItem,
  getSetupTypesByCategory,
  updateSetupCategory,
  updateSetupSubItem,
  updateSetupSubItemStatus,
  updateSetupTypeStatus,
  updateSetupType,
  deleteSetupCategory,
  deleteSetupType,
  getSetupUnitsOfMeasure,
  getSetupCategoryUsage,
  getSetupTypeUsage,
} from "../../api/budgetSetup.api";
import {
  approveAndCreateItemRequest,
  approveItemRequest,
  createItemRequest,
  getItemRequests,
  rejectItemRequest,
} from "../../api/itemRequests.api";

export function useSetupCategories() {
  return useQuery({
    queryKey: ["budget-setup", "categories"],
    queryFn: getSetupCategories,
  });
}

export function useSetupTypes(categoryId) {
  return useQuery({
    queryKey: ["budget-setup", "types", categoryId, "include-inactive"],
    queryFn: () =>
      getSetupTypesByCategory(categoryId, { includeInactive: true }),
    enabled: Boolean(categoryId),
  });
}

export function useSetupUnitsOfMeasure() {
  return useQuery({
    queryKey: ["budget-setup", "units-of-measure"],
    queryFn: getSetupUnitsOfMeasure,
  });
}

export function useSetupSubItems(catalogItemId) {
  return useQuery({
    queryKey: ["budget-setup", "sub-items", catalogItemId],
    queryFn: () => getSetupSubItemsByCatalogItem(catalogItemId),
    enabled: Boolean(catalogItemId),
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

export function useCreateSetupSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSetupSubItem,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "sub-items", variables.catalogItemId],
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

export function useApproveAndCreateItemRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveAndCreateItemRequest,
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

export function useUpdateSetupSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetupSubItem,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "sub-items", variables.catalogItemId],
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

export function useUpdateSetupTypeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetupTypeStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budget-setup"] });
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "types", variables.categoryId],
      });
    },
  });
}

export function useUpdateSetupSubItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetupSubItemStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["budget-setup", "sub-items", variables.catalogItemId],
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
