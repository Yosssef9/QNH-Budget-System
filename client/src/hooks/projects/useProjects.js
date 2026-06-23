import { useQuery } from "@tanstack/react-query";
import {
  getProjectDetails,
  getProjectFilterOptions,
  getProjects,
} from "../../api/projects.api";

export function useProjects(filters = {}) {
  return useQuery({
    queryKey: ["projects", filters],
    queryFn: () => getProjects(filters),
  });
}

export function useProjectDetails(budgetItemId) {
  return useQuery({
    queryKey: ["project", budgetItemId],
    queryFn: () => getProjectDetails(budgetItemId),
    enabled: Boolean(budgetItemId),
  });
}

export function useProjectFilterOptions() {
  return useQuery({
    queryKey: ["project-filter-options"],
    queryFn: getProjectFilterOptions,
  });
}
