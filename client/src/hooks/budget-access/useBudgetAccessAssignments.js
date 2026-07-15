import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBudgetAccessAssignments,
  createBudgetAccessAssignment,
  updateBudgetAccessAssignment,
  updateBudgetAccessAssignmentStatus,
  deleteBudgetAccessAssignment,
  getBudgetAccessAssignmentPermissionOverrides,
  replaceBudgetAccessAssignmentPermissionOverrides,
} from "../../api/budgetAccessAssignments.api";
import toast from "react-hot-toast";
const QUERY_KEY = ["budgetAccessAssignments"];
const PERMISSION_OVERRIDES_QUERY_KEY = ["budgetAccessPermissionOverrides"];
const FIVE_MINUTES = 5 * 60 * 1000;

// 🔹 Get all assignments
export function useBudgetAccessAssignments() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getBudgetAccessAssignments,
    staleTime: FIVE_MINUTES,
  });
}

// 🔹 Create
export function useCreateBudgetAccessAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBudgetAccessAssignment,

    onSuccess: () => {
      toast.success("User access created successfully");

      queryClient.invalidateQueries({
        queryKey: QUERY_KEY,
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to create user access",
      );
    },
  });
}

// 🔹 Update
export function useUpdateBudgetAccessAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updateBudgetAccessAssignment(id, payload),

    onSuccess: () => {
      toast.success("User access updated successfully");

      queryClient.invalidateQueries({
        queryKey: QUERY_KEY,
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to update user access",
      );
    },
  });
}

// 🔹 Toggle Status
export function useToggleBudgetAccessAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }) =>
      updateBudgetAccessAssignmentStatus(id, is_active),

    onSuccess: (_, variables) => {
      toast.success(
        variables.is_active
          ? "User access activated successfully"
          : "User access deactivated successfully",
      );

      queryClient.invalidateQueries({
        queryKey: QUERY_KEY,
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to update user status",
      );
    },
  });
}

export function useDeleteBudgetAccessAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBudgetAccessAssignment,

    onSuccess: () => {
      toast.success("User access deleted successfully");

      queryClient.invalidateQueries({
        queryKey: QUERY_KEY,
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to delete user access",
      );
    },
  });
}

export function useBudgetAccessAssignmentPermissionOverrides(assignmentId) {
  return useQuery({
    queryKey: [...PERMISSION_OVERRIDES_QUERY_KEY, assignmentId],
    queryFn: () => getBudgetAccessAssignmentPermissionOverrides(assignmentId),
    enabled: Boolean(assignmentId),
    staleTime: FIVE_MINUTES,
  });
}

export function useReplaceBudgetAccessAssignmentPermissionOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, overrides }) =>
      replaceBudgetAccessAssignmentPermissionOverrides(id, { overrides }),

    onSuccess: (_, variables) => {
      toast.success("Permission overrides updated successfully");

      queryClient.invalidateQueries({
        queryKey: [...PERMISSION_OVERRIDES_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEY,
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to update permission overrides",
      );
    },
  });
}
