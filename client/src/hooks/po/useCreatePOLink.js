import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { createPOLink } from "../../api/po.api";

import {
  AVAILABLE_POS_QUERY_KEY,
  MY_PO_LINKS_QUERY_KEY,
  PENDING_PO_LINKS_QUERY_KEY,
} from "./usePOQueryKeys";

export function useCreatePOLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPOLink,

    onSuccess: () => {
      toast.success("PO link request submitted successfully");

      queryClient.invalidateQueries({
        queryKey: AVAILABLE_POS_QUERY_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: MY_PO_LINKS_QUERY_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: PENDING_PO_LINKS_QUERY_KEY,
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to submit PO link request",
      );
    },
  });
}
