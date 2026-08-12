import { beforeEach, describe, expect, it, vi } from "vitest";
import { recruiterContacts, recruiterEmailEvents } from "../drizzle/schema";

const contact = { id: 7, userId: 180001, email: "recruiter@example.com", responseStatus: "discovered", updatedAt: new Date() };
const insertedEvent = { id: 11, userId: 180001, messageId: "message-11", threadId: "thread-11", sender: "Recruiter <recruiter@example.com>", subject: "Interview next steps", matchedContactId: 7, reviewStatus: "unreviewed" };
const updateCalls: Array<{ table: unknown; values: unknown }> = [];
let selectCount = 0;

const fakeDb = {
  select: () => ({
    from: (table: unknown) => ({
      where: () => ({
        orderBy: async () => table === recruiterContacts ? [contact] : [],
        limit: async () => {
          selectCount += 1;
          return selectCount === 2 ? [] : [insertedEvent];
        },
      }),
    }),
  }),
  insert: () => ({ values: async () => [{ insertId: 11 }] }),
  update: (table: unknown) => ({
    set: (values: unknown) => ({
      where: async () => {
        updateCalls.push({ table, values });
      },
    }),
  }),
};

vi.mock("./db", () => ({ getDb: () => fakeDb }));
const { ingestRecruiterEmailEvents } = await import("./careerStore");

describe("recruiter email store ingestion", () => {
  beforeEach(() => {
    selectCount = 0;
    updateCalls.length = 0;
  });

  it("updates the matched recruiter contact to replied while keeping the event unreviewed", async () => {
    const result = await ingestRecruiterEmailEvents(180001, [{
      messageId: "message-11",
      threadId: "thread-11",
      sender: "Recruiter <recruiter@example.com>",
      subject: "Interview next steps",
      receivedAt: new Date("2026-08-12T10:00:00.000Z"),
    }]);

    expect(result[0]).toMatchObject({ matchedContactId: 7, reviewStatus: "unreviewed" });
    expect(updateCalls).toContainEqual({ table: recruiterContacts, values: expect.objectContaining({ responseStatus: "replied" }) });
  });
});
