import { getBudgetTimelineRepo } from "../repositories/budgetTimeline.repository.js";

export async function getBudgetTimelineService(budgetId) {
  return await getBudgetTimelineRepo(budgetId);
}
