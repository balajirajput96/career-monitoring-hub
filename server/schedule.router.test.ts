import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getOrCreateSchedule = vi.fn();
const updateSchedule = vi.fn();
const updateHeartbeatJob = vi.fn();
const createHeartbeatJob = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("./careerStore", async importOriginal => {
  const actual = await importOriginal<typeof import("./careerStore")>();
  return { ...actual, getOrCreateSchedule, updateSchedule };
});

vi.mock("./_core/heartbeat", async importOriginal => {
  const actual = await importOriginal<typeof import("./_core/heartbeat")>();
  return { ...actual, updateHeartbeatJob, createHeartbeatJob };
});

const { appRouter } = await import("./routers");

const user = {
  id: 180001,
  openId: "owner-open-id",
  name: "Career Owner",
  email: null,
  loginMethod: null,
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext() {
  return {
    user,
    req: { headers: { cookie: "app_session_id=browser-session" } } as never,
    res: {} as never,
  };
}

describe("schedule router existing-task mutations", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "production";
  });

  it("activates an existing persisted task and retries a session ownership 403", async () => {
    getOrCreateSchedule.mockResolvedValue({
      id: 1,
      userId: user.id,
      cronExpression: "0 30 3 * * *",
      timezone: "Asia/Kolkata",
      language: "en",
      highPriorityThreshold: 80,
      scheduleCronTaskUid: "task-existing",
      isEnabled: false,
    });
    updateHeartbeatJob
      .mockRejectedValueOnce(new Error("Heartbeat UpdateHeartbeatJob failed (403) permission_denied"))
      .mockResolvedValueOnce({ nextExecutionAt: null });
    updateSchedule.mockResolvedValue({ scheduleCronTaskUid: "task-existing", isEnabled: true });

    const result = await appRouter.createCaller(createContext()).career.schedule.activate();

    expect(updateHeartbeatJob.mock.calls).toEqual([
      ["task-existing", expect.objectContaining({ enable: true }), "browser-session"],
      ["task-existing", expect.objectContaining({ enable: true }), ""],
    ]);
    expect(updateSchedule).toHaveBeenCalledWith(user.id, { scheduleCronTaskUid: "task-existing", isEnabled: true });
    expect(result).toEqual({ scheduleCronTaskUid: "task-existing", isEnabled: true });
  });

  it("returns a non-destructive TRPC error when an existing task remains owned by another session", async () => {
    getOrCreateSchedule.mockResolvedValue({
      id: 1,
      userId: user.id,
      cronExpression: "0 30 3 * * *",
      timezone: "Asia/Kolkata",
      language: "en",
      highPriorityThreshold: 80,
      scheduleCronTaskUid: "task-existing",
      isEnabled: true,
    });
    updateHeartbeatJob.mockRejectedValue(new Error("Heartbeat UpdateHeartbeatJob failed (403) permission_denied"));

    await expect(appRouter.createCaller(createContext()).career.schedule.pause()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("different session"),
    });
    expect(updateSchedule).not.toHaveBeenCalled();
  });

  it("pauses an existing persisted task without changing local state when Heartbeat rejects it", async () => {
    getOrCreateSchedule.mockResolvedValue({
      id: 1,
      userId: user.id,
      cronExpression: "0 30 3 * * *",
      timezone: "Asia/Kolkata",
      language: "en",
      highPriorityThreshold: 80,
      scheduleCronTaskUid: "task-existing",
      isEnabled: true,
    });
    updateHeartbeatJob
      .mockRejectedValueOnce(new Error("Heartbeat UpdateHeartbeatJob failed (403) permission_denied"))
      .mockResolvedValueOnce({ nextExecutionAt: null });
    updateSchedule.mockResolvedValue({ scheduleCronTaskUid: "task-existing", isEnabled: false });

    const result = await appRouter.createCaller(createContext()).career.schedule.pause();

    expect(updateHeartbeatJob.mock.calls).toEqual([
      ["task-existing", { enable: false }, "browser-session"],
      ["task-existing", { enable: false }, ""],
    ]);
    expect(updateSchedule).toHaveBeenCalledWith(user.id, { isEnabled: false });
    expect(result).toEqual({ scheduleCronTaskUid: "task-existing", isEnabled: false });
  });
});

export {};
