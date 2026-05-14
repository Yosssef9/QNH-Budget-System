import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitBudget } from "../../api/budget.api";

export function useSubmitBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["currentBudget"] });
      queryClient.invalidateQueries({ queryKey: ["budgetItems"] });
      queryClient.invalidateQueries({ queryKey: ["budget-approval"] });
    },
  });
}
