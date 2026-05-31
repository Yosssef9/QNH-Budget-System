import { getDashboardStatsRepo } from "../repositories/dashboard.repository.js";

export async function getDashboardStatsService() {
  return await getDashboardStatsRepo();
}
