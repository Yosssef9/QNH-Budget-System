import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { approvePOLink } from "../../api/po.api";

import {
  PENDING_PO_LINKS_QUERY_KEY,
  MY_PO_LINKS_QUERY_KEY,
  PO_QUERY_KEY,
} from "./usePOQueryKeys";

export function useApprovePOLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvePOLink,

    onSuccess: () => {
      toast.success("PO link approved successfully");

      queryClient.invalidateQueries({
        queryKey: PENDING_PO_LINKS_QUERY_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: MY_PO_LINKS_QUERY_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: PO_QUERY_KEY,
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to approve PO link",
      );
    },
  });
}
