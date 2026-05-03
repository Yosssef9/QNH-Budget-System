import { useInfiniteQuery } from "@tanstack/react-query";
import { getBudgetAccessUsers } from "../../api/budgetAccessUsers.api";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useBudgetAccessUsers({ search = "", pageSize = 50 }) {
  return useInfiniteQuery({
    queryKey: ["budgetAccessUsers", search, pageSize],

    queryFn: ({ pageParam = 1 }) =>
      getBudgetAccessUsers({
        search,
        page: pageParam,
        pageSize,
      }),

    getNextPageParam: (lastPage) => {
      const data = lastPage?.data;

      if (!data?.hasMore) return undefined;

      return data.page + 1;
    },

    initialPageParam: 1,
    staleTime: FIVE_MINUTES,
  });
}