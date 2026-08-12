import { describe, expect, it } from "vitest";
import { dedupeRecruiterEmailInputs, isLikelyRecruiterResponse, normalizeRecruiterSender, resolveRecruiterContactId } from "./careerStore";
import { z } from "zod";

describe("recruiter email ingestion contracts", () => {
  it("normalizes display-name senders without changing the address", () => {
    expect(normalizeRecruiterSender("Talent Team <Recruiter@Example.com>"))
      .toBe("recruiter@example.com");
    expect(normalizeRecruiterSender(" hr@example.com ")).toBe("hr@example.com");
  });

  it("deduplicates repeated message IDs before persistence", () => {
    const items = [
      { messageId: "m1", sender: "a@example.com", subject: "Interview" },
      { messageId: "m1", sender: "a@example.com", subject: "Interview duplicate" },
      { messageId: "m2", sender: "b@example.com", subject: "Application" },
    ];
    expect(dedupeRecruiterEmailInputs(items)).toHaveLength(2);
  });

  it("reconciles a new sender to a verified contact through an existing thread", () => {
    expect(resolveRecruiterContactId("unknown@example.com", "thread-7", [{ id: 42, email: "known@example.com" }], [{ threadId: "thread-7", matchedContactId: 42 }])).toBe(42);
    expect(resolveRecruiterContactId("KNOWN@example.com", "other", [{ id: 42, email: "known@example.com" }], [])).toBe(42);
  });

  it("keeps review status constrained to explicit manual outcomes", () => {
    const reviewStatus = z.enum(["reviewed", "ignored"]);
    expect(reviewStatus.safeParse("reviewed").success).toBe(true);
    expect(reviewStatus.safeParse("sent").success).toBe(false);
  });

  it("only flags response-oriented subjects for review prioritization", () => {
    expect(isLikelyRecruiterResponse("Next steps for your application")).toBe(true);
    expect(isLikelyRecruiterResponse("Interview invitation")).toBe(true);
    expect(isLikelyRecruiterResponse("Company newsletter")).toBe(false);
  });
});
