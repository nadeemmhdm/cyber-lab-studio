import { describe, expect, it } from "vitest";
import { summarizeProgress } from "@/lib/dashboard/stats";

describe("dashboard progress summary", () => {
  it("derives database-backed progress totals", () => {
    expect(summarizeProgress(30, ["COMPLETED", "COMPLETED", "IN_PROGRESS"])).toEqual({ totalLabs: 30, completed: 2, inProgress: 1, notStarted: 27, completionPercentage: 7 });
  });
  it("handles an empty catalogue", () => { expect(summarizeProgress(0, [])).toEqual({ totalLabs: 0, completed: 0, inProgress: 0, notStarted: 0, completionPercentage: 0 }); });
});
