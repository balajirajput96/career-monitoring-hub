import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  invokeLLM,
  notifyOwner,
  getActiveSources,
  getProfile,
  getRunningRun,
  createWorkflowRun,
  completeWorkflowRun,
  markScheduleRun,
  recordDailyReport,
  requireCareerDb,
  updateSourceResult,
} = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  notifyOwner: vi.fn(),
  getActiveSources: vi.fn(),
  getProfile: vi.fn(),
  getRunningRun: vi.fn(),
  createWorkflowRun: vi.fn(),
  completeWorkflowRun: vi.fn(),
  markScheduleRun: vi.fn(),
  recordDailyReport: vi.fn(),
  requireCareerDb: vi.fn(),
  updateSourceResult: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM }));
vi.mock("./_core/notification", () => ({ notifyOwner }));
vi.mock("./careerStore", () => ({
  completeWorkflowRun,
  createWorkflowRun,
  getActiveSources,
  getProfile,
  getRunningRun,
  markScheduleRun,
  recordDailyReport,
  requireCareerDb,
  updateSourceResult,
}));

import { approvalIsReviewOnly, runScheduledCareerWorkflow, scheduledExecutionPolicy } from "./careerWorkflow";

const schedule = {
  id: 1,
  userId: 7,
  isEnabled: true,
  language: "en",
  highPriorityThreshold: 70,
};

function greenhouseJobs(sourceOffset: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${sourceOffset}-${index}`,
    title: `QA Analyst ${index}`,
    location: { name: "Remote" },
    content: "Quality assurance, SOP, GMP and audit documentation.",
    absolute_url: `https://example.test/jobs/${sourceOffset}-${index}`,
    updated_at: "2026-08-12T00:00:00.000Z",
  }));
}

function buildDb() {
  const scheduleLimit = vi.fn().mockResolvedValue([schedule]);
  const scheduleWhere = vi.fn().mockReturnValue({ limit: scheduleLimit });
  const listingWhere = vi.fn().mockResolvedValue([]);
  const from = vi.fn((table: unknown) => table && typeof table === "object" && "isEnabled" in (table as object)
    ? { where: scheduleWhere }
    : { where: listingWhere });
  return {
    select: vi.fn().mockReturnValue({ from }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 101 }]) }),
  };
}

describe("scheduled discovery execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRunningRun.mockResolvedValue(undefined);
    getProfile.mockResolvedValue({
      outputLanguage: "hi",
      skills: ["GMP", "SOP", "Python"],
      preferredRoles: ["Quality Officer", "QA Analyst"],
      yearsExperience: 2,
      education: ["Diploma in Biotechnology"],
      verifiedExperience: [{ title: "Quality Officer", years: 2, domain: "Pharmaceutical QA" }],
      preferredLocations: ["Remote"],
    });
    getActiveSources.mockResolvedValue([1, 2, 3].map(index => ({
      id: index,
      userId: 7,
      name: `Source ${index}`,
      sourceType: "greenhouse",
      endpointUrl: `https://source-${index}.example.test/jobs`,
      track: "pharma_qa",
    })));
    createWorkflowRun.mockResolvedValue({ id: 44 });
    requireCareerDb.mockResolvedValue(buildDb());
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const sourceOffset = Number(/source-(\d+)/.exec(url)?.[1] ?? 0);
      return { ok: true, json: async () => ({ jobs: greenhouseJobs(sourceOffset, 20) }) };
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("persists a bounded bilingual report without inline AI or notification delivery", async () => {
    const result = await runScheduledCareerWorkflow(1);

    expect(result).toMatchObject({ ok: true, status: "completed", stats: { newJobs: scheduledExecutionPolicy.maxJobsPerRun } });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(invokeLLM).not.toHaveBeenCalled();
    expect(notifyOwner).not.toHaveBeenCalled();
    expect(recordDailyReport).toHaveBeenCalledWith(
      7,
      44,
      "hi",
      expect.stringContaining("manual approval आवश्यक है"),
      expect.objectContaining({ newJobs: 24 }),
      expect.objectContaining({
        en: expect.stringContaining("Manual approval remains required"),
        hi: expect.stringContaining("manual approval आवश्यक है"),
      })
    );
    expect(markScheduleRun).toHaveBeenCalledWith(1);
    expect(updateSourceResult).toHaveBeenCalledTimes(3);
  });

  it("keeps recurring discovery bounded and review-only", () => {
    expect(scheduledExecutionPolicy).toEqual({
      sourceFetchTimeoutMs: 8_000,
      maxJobsPerSource: 12,
      maxJobsPerRun: 24,
      runtimeBudgetMs: 20_000,
      useInlineAi: false,
      sendInlineNotifications: false,
    });
    expect(approvalIsReviewOnly()).toBe(true);
  });
});
