import { describe, expect, it } from "vitest";
import { buildRecruiterEmailImportEvent, recruiterEmailReviewActions } from "./recruiterEmailImport";

describe("manual recruiter email import helper", () => {
  it("trims stable identifiers and omits empty optional fields", () => {
    expect(buildRecruiterEmailImportEvent({
      messageId: "  gmail-123  ",
      threadId: "   ",
      sender: "  recruiter@example.com ",
      subject: "  QA interview update  ",
      receivedAt: "",
      snippet: "   ",
    })).toEqual({
      messageId: "gmail-123",
      sender: "recruiter@example.com",
      subject: "QA interview update",
    });
  });

  it("preserves non-empty thread and snippet values and converts datetime input to a Date", () => {
    const event = buildRecruiterEmailImportEvent({
      messageId: "m-9",
      threadId: " thread-9 ",
      sender: "recruiter@example.com",
      subject: "Next steps",
      receivedAt: "2026-08-12T09:30",
      snippet: "  Please select a time. ",
    });
    expect(event).toMatchObject({ messageId: "m-9", threadId: "thread-9", snippet: "Please select a time." });
    expect(event.receivedAt).toBeInstanceOf(Date);
    expect(event.receivedAt?.getTime()).not.toBeNaN();
  });

  it("exposes only reviewed and ignored as manual review actions", () => {
    expect(recruiterEmailReviewActions).toEqual(["reviewed", "ignored"]);
    expect(recruiterEmailReviewActions).not.toContain("unreviewed");
  });
});
