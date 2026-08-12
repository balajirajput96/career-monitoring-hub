import { afterEach, describe, expect, it, vi } from "vitest";

const reviewRecruiterEmailEvent = vi.fn();
const ingestRecruiterEmailEvents = vi.fn();

vi.mock("./careerStore", async importOriginal => {
  const actual = await importOriginal<typeof import("./careerStore")>();
  return { ...actual, reviewRecruiterEmailEvent, ingestRecruiterEmailEvents };
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

const signedInContext = () => ({
  user,
  req: { headers: { cookie: "app_session_id=browser-session" } } as never,
  res: {} as never,
});

const anonymousContext = () => ({
  user: null,
  req: { headers: {} } as never,
  res: {} as never,
});

afterEach(() => vi.clearAllMocks());

describe("recruiter email review router", () => {
  it("allows a signed-in user to explicitly review or ignore an event", async () => {
    reviewRecruiterEmailEvent.mockResolvedValue({ id: 9, userId: user.id, reviewStatus: "reviewed" });
    const result = await appRouter.createCaller(signedInContext()).career.contacts.reviewEmailEvent({ eventId: 9, reviewStatus: "reviewed" });
    expect(reviewRecruiterEmailEvent).toHaveBeenCalledWith(user.id, 9, "reviewed");
    expect(result).toMatchObject({ id: 9, reviewStatus: "reviewed" });
  });

  it("rejects unauthenticated review attempts", async () => {
    await expect(appRouter.createCaller(anonymousContext()).career.contacts.reviewEmailEvent({ eventId: 9, reviewStatus: "ignored" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(reviewRecruiterEmailEvent).not.toHaveBeenCalled();
  });

  it("keeps matched contact status changes in the ingest contract and never executes an external action", async () => {
    ingestRecruiterEmailEvents.mockResolvedValue([{ id: 4, matchedContactId: 7, reviewStatus: "unreviewed" }]);
    const result = await appRouter.createCaller(signedInContext()).career.contacts.ingestEmailEvents({
      events: [{ messageId: "m-4", threadId: "t-4", sender: "recruiter@example.com", subject: "Interview next steps", receivedAt: "2026-08-12T09:00:00.000Z", snippet: "Please choose a time for a quality assurance interview." }],
    });
    expect(ingestRecruiterEmailEvents).toHaveBeenCalledWith(user.id, expect.arrayContaining([expect.objectContaining({ messageId: "m-4", threadId: "t-4", sender: "recruiter@example.com", receivedAt: expect.any(Date), snippet: "Please choose a time for a quality assurance interview." })]));
    expect(result[0]).toMatchObject({ matchedContactId: 7, reviewStatus: "unreviewed" });
  });
});
