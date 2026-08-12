import { describe, expect, it } from "vitest";
import { buildDeterministicDailySummary, scheduledExecutionPolicy } from "./careerWorkflow";

describe("scheduled workflow execution budget", () => {
  it("uses a bounded deterministic policy that avoids retry-prone inline services", () => {
    expect(scheduledExecutionPolicy).toMatchObject({
      sourceFetchTimeoutMs: 8_000,
      maxJobsPerSource: 12,
      maxJobsPerRun: 24,
      runtimeBudgetMs: 20_000,
      useInlineAi: false,
      sendInlineNotifications: false,
    });
  });

  it("builds bilingual deterministic reports that preserve manual approval", () => {
    const stats = { newJobs: 2, highPriority: 1, sourceErrors: 0, sourcesChecked: 4 };
    expect(buildDeterministicDailySummary("en", stats, [])).toContain("Manual approval remains required");
    expect(buildDeterministicDailySummary("hi", stats, [])).toContain("manual approval आवश्यक है");
  });
});
