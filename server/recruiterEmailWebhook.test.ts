import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserByOpenId, ingestRecruiterEmailEvents, environment } = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  ingestRecruiterEmailEvents: vi.fn(),
  environment: {
    ownerOpenId: "career-owner",
    recruiterEmailWebhookSecret: "test-shared-webhook-secret",
  },
}));

vi.mock("./db", () => ({ getUserByOpenId }));
vi.mock("./careerStore", () => ({
  ingestRecruiterEmailEvents,
  normalizeRecruiterSender: (sender: string) => sender.match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? sender.trim().toLowerCase(),
}));
vi.mock("./_core/env", () => ({ ENV: environment }));

import { recruiterEmailWebhookHandler } from "./recruiterEmailWebhook";

function signedDigest(timestamp: string, rawBody: string) {
  return createHmac("sha256", environment.recruiterEmailWebhookSecret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

function responseMock() {
  const response = { status: vi.fn(), json: vi.fn() } as any;
  response.status.mockReturnValue(response);
  return response;
}

function requestMock(rawBody: string, timestamp: string, validSignature = true) {
  return {
    body: Buffer.from(rawBody, "utf8"),
    headers: {
      "x-career-timestamp": timestamp,
      "x-career-signature": validSignature ? `sha256=${signedDigest(timestamp, rawBody)}` : "sha256=not-valid",
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  environment.ownerOpenId = "career-owner";
  environment.recruiterEmailWebhookSecret = "test-shared-webhook-secret";
  getUserByOpenId.mockResolvedValue({ id: 180001 });
  ingestRecruiterEmailEvents.mockResolvedValue([{ id: 1 }]);
});

describe("recruiter email webhook", () => {
  it("authenticates a current signed request, binds it to the owner, and persists unreviewed events only", async () => {
    const timestamp = String(Date.now());
    const rawBody = JSON.stringify({
      events: [{
        messageId: "gmail-1",
        threadId: "thread-1",
        sender: "Recruiter Team <recruiter@example.com>",
        subject: "Interview next steps",
        receivedAt: "2026-08-17T09:00:00.000Z",
        snippet: "Please select a time.",
      }],
    });
    const response = responseMock();

    await recruiterEmailWebhookHandler(requestMock(rawBody, timestamp), response);

    expect(getUserByOpenId).toHaveBeenCalledWith("career-owner");
    expect(ingestRecruiterEmailEvents).toHaveBeenCalledWith(180001, [expect.objectContaining({
      messageId: "gmail-1",
      sender: "recruiter@example.com",
      subject: "Interview next steps",
    })]);
    expect(response.status).toHaveBeenCalledWith(202);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, reviewStatus: "unreviewed" }));
  });

  it("rejects invalid signatures before any database work", async () => {
    const timestamp = String(Date.now());
    const rawBody = JSON.stringify({ events: [{ messageId: "gmail-2", sender: "recruiter@example.com", subject: "Application update" }] });
    const response = responseMock();

    await recruiterEmailWebhookHandler(requestMock(rawBody, timestamp, false), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "invalid-webhook-signature" });
    expect(getUserByOpenId).not.toHaveBeenCalled();
    expect(ingestRecruiterEmailEvents).not.toHaveBeenCalled();
  });

  it("rejects replayed requests before signature and persistence work", async () => {
    const timestamp = String(Date.now() - 5 * 60 * 1000 - 1);
    const rawBody = JSON.stringify({ events: [{ messageId: "gmail-3", sender: "recruiter@example.com", subject: "Application update" }] });
    const response = responseMock();

    await recruiterEmailWebhookHandler(requestMock(rawBody, timestamp), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "stale-webhook-request" });
    expect(getUserByOpenId).not.toHaveBeenCalled();
    expect(ingestRecruiterEmailEvents).not.toHaveBeenCalled();
  });

  it("rejects malformed senders and never invokes external submission behavior", async () => {
    const timestamp = String(Date.now());
    const rawBody = JSON.stringify({ events: [{ messageId: "gmail-4", sender: "not an email", subject: "Application update" }] });
    const response = responseMock();

    await recruiterEmailWebhookHandler(requestMock(rawBody, timestamp), response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: "invalid-webhook-sender" });
    expect(ingestRecruiterEmailEvents).not.toHaveBeenCalled();
  });

  it("fails closed when no shared secret is configured", async () => {
    environment.recruiterEmailWebhookSecret = "";
    const response = responseMock();

    await recruiterEmailWebhookHandler({ body: Buffer.from("{}"), headers: {} } as any, response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ error: "webhook-not-configured" });
    expect(getUserByOpenId).not.toHaveBeenCalled();
  });

  it("returns a structured JSON 500 when owner lookup or persistence fails", async () => {
    const timestamp = String(Date.now());
    const rawBody = JSON.stringify({ events: [{ messageId: "gmail-5", sender: "recruiter@example.com", subject: "Application update" }] });
    const response = responseMock();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getUserByOpenId.mockRejectedValue(new Error("database unavailable"));

    await recruiterEmailWebhookHandler(requestMock(rawBody, timestamp), response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "webhook-persistence-failed" });
    expect(ingestRecruiterEmailEvents).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("[recruiter-email-webhook] owner lookup or event persistence failed", expect.any(Error));
    consoleError.mockRestore();
  });
});
