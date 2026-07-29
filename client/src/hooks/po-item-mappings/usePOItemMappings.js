import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPOItemMapping,
  getPOItemMappingCategories,
  getPOItemMappingCatalogItems,
  getPOItemMappingCatalogSubItems,
  getPOItemMappings,
  searchPOItemsForMapping,
  updatePOItemMappingStatus,
} from "../../api/poItemMappings.api";

export const PO_ITEM_MAPPINGS_QUERY_KEY = ["po-item-mappings"];

export function usePOItemMappings(params = {}) {
  return useQuery({
    queryKey: [...PO_ITEM_MAPPINGS_QUERY_KEY, "list", params],
    queryFn: () => getPOItemMappings(params),
    placeholderData: (previousData) => previousData,
  });
}

export function usePOItemMappingCatalogSubItems(params = {}) {
  return useQuery({
    queryKey: [...PO_ITEM_MAPPINGS_QUERY_KEY, "catalog-sub-items", params],
    queryFn: () => getPOItemMappingCatalogSubItems(params.catalogItemId),
    enabled: Boolean(params.catalogItemId),
    placeholderData: (previousData) => previousData,
  });
}

export function usePOItemMappingCategories() {
  return useQuery({
    queryKey: [...PO_ITEM_MAPPINGS_QUERY_KEY, "categories"],
    queryFn: getPOItemMappingCategories,
    placeholderData: (previousData) => previousData,
  });
}

export function usePOItemMappingCatalogItems(categoryId) {
  return useQuery({
    queryKey: [...PO_ITEM_MAPPINGS_QUERY_KEY, "catalog-items", categoryId],
    queryFn: () => getPOItemMappingCatalogItems(categoryId),
    enabled: Boolean(categoryId),
    placeholderData: (previousData) => previousData,
  });
}

export function usePOItemsForMapping(params = {}) {
  return useQuery({
    queryKey: [...PO_ITEM_MAPPINGS_QUERY_KEY, "po-items", params],
    queryFn: () => searchPOItemsForMapping(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreatePOItemMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPOItemMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PO_ITEM_MAPPINGS_QUERY_KEY,
      });
    },
  });
}

export function useUpdatePOItemMappingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updatePOItemMappingStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PO_ITEM_MAPPINGS_QUERY_KEY,
      });
    },
  });
}
