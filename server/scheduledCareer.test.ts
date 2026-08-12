import { describe, expect, it, vi, beforeEach } from "vitest";

const { authenticateRequest, getScheduleByTaskUid, runScheduledCareerWorkflow } = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getScheduleByTaskUid: vi.fn(),
  runScheduledCareerWorkflow: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));
vi.mock("./careerStore", () => ({ getScheduleByTaskUid }));
vi.mock("./careerWorkflow", () => ({ runScheduledCareerWorkflow }));

import { careerMonitorHandler } from "./scheduledCareer";

function responseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  } as any;
  response.status.mockReturnValue(response);
  return response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("career monitor scheduled handler", () => {
  it("rejects non-cron callers", async () => {
    authenticateRequest.mockResolvedValue({ isCron: false });
    const response = responseMock();
    await careerMonitorHandler({ originalUrl: "/api/scheduled/career-monitor" } as any, response);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "cron-only" });
  });

  it("returns a successful orphan result without running workflow work", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron-orphan" });
    getScheduleByTaskUid.mockResolvedValue(undefined);
    const response = responseMock();
    await careerMonitorHandler({ originalUrl: "/api/scheduled/career-monitor" } as any, response);
    expect(response.json).toHaveBeenCalledWith({ ok: true, skipped: "orphan" });
    expect(runScheduledCareerWorkflow).not.toHaveBeenCalled();
  });

  it("returns structured JSON on workflow failure", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron-1" });
    getScheduleByTaskUid.mockResolvedValue({ id: 42 });
    runScheduledCareerWorkflow.mockRejectedValue(new Error("source timeout"));
    const response = responseMock();
    await careerMonitorHandler({ originalUrl: "/api/scheduled/career-monitor" } as any, response);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json.mock.calls[0][0]).toMatchObject({ error: "source timeout", context: { url: "/api/scheduled/career-monitor" } });
  });
});

