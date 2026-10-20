export type DashboardProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export function summarizeProgress(totalLabs: number, statuses: DashboardProgressStatus[]) {
  const completed = statuses.filter((status) => status === "COMPLETED").length;
  const inProgress = statuses.filter((status) => status === "IN_PROGRESS").length;
  const notStarted = Math.max(0, totalLabs - completed - inProgress);
  const completionPercentage = totalLabs === 0 ? 0 : Math.round((completed / totalLabs) * 100);
  return { totalLabs, completed, inProgress, notStarted, completionPercentage };
}
