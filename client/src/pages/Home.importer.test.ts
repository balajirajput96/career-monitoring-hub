import { describe, expect, it } from "vitest";
import { buildRecruiterEmailImportEvent, recruiterEmailReviewActions } from "@/lib/recruiterEmailImport";

describe("Home manual recruiter-email importer submission boundary", () => {
  it("serializes the dashboard form into the protected ingestion mutation payload", () => {
    const event = buildRecruiterEmailImportEvent({
      messageId: "  provider-message-81 ",
      threadId: " provider-thread-11 ",
      sender: " qa.recruiter@example.com ",
      subject: "  Quality Officer interview  ",
      receivedAt: "2026-08-13T09:00",
      snippet: "  Please confirm availability. ",
    });

    expect({ events: [event] }).toMatchObject({
      events: [{
        messageId: "provider-message-81",
        threadId: "provider-thread-11",
        sender: "qa.recruiter@example.com",
        subject: "Quality Officer interview",
        snippet: "Please confirm availability.",
      }],
    });
    expect(event.receivedAt).toBeInstanceOf(Date);
  });

  it("exposes only reviewed and ignored as selectable review actions", () => {
    expect(recruiterEmailReviewActions).toHaveLength(2);
    expect(recruiterEmailReviewActions).toContain("reviewed");
    expect(recruiterEmailReviewActions).toContain("ignored");
    expect(recruiterEmailReviewActions).not.toContain("unreviewed");
  });
});

