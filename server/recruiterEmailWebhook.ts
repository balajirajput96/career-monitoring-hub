import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { getUserByOpenId } from "./db";
import { ENV } from "./_core/env";
import { ingestRecruiterEmailEvents, normalizeRecruiterSender } from "./careerStore";

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
const MAX_RAW_BODY_BYTES = 1_000_000;

const recruiterEmailEventSchema = z.object({
  messageId: z.string().trim().min(1).max(255),
  threadId: z.string().trim().max(255).optional(),
  sender: z.string().trim().min(3).max(320),
  subject: z.string().trim().min(1).max(500),
  receivedAt: z.coerce.date().optional(),
  snippet: z.string().trim().max(5_000).optional(),
}).strict();

const recruiterEmailWebhookSchema = z.object({
  events: z.array(recruiterEmailEventSchema).min(1).max(100),
}).strict();

export function signRecruiterEmailWebhook(secret: string, timestamp: string, rawBody: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

function signaturesMatch(expected: string, provided: string) {
  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(provided.replace(/^sha256=/i, ""), "utf8");
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

function headerValue(request: Request, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function rawBodyFromRequest(request: Request) {
  return Buffer.isBuffer(request.body) ? request.body.toString("utf8") : "";
}

/**
 * Receives read-only recruiter events from an independently authorized transport.
 * It always binds writes to the project owner and reuses the existing dedupe,
 * reconciliation, and manual-review-only store contract. It never modifies a
 * mailbox or submits an application/message.
 */
export async function recruiterEmailWebhookHandler(request: Request, response: Response) {
  const secret = ENV.recruiterEmailWebhookSecret;
  if (!secret) return response.status(503).json({ error: "webhook-not-configured" });

  const timestamp = headerValue(request, "x-career-timestamp");
  const signature = headerValue(request, "x-career-signature");
  if (!timestamp || !signature) return response.status(401).json({ error: "missing-webhook-signature" });

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_WEBHOOK_AGE_MS) {
    return response.status(401).json({ error: "stale-webhook-request" });
  }

  const rawBody = rawBodyFromRequest(request);
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_RAW_BODY_BYTES) {
    return response.status(400).json({ error: "invalid-webhook-body" });
  }

  const expectedSignature = signRecruiterEmailWebhook(secret, timestamp, rawBody);
  if (!signaturesMatch(expectedSignature, signature)) {
    return response.status(401).json({ error: "invalid-webhook-signature" });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return response.status(400).json({ error: "invalid-webhook-json" });
  }

  const parsedPayload = recruiterEmailWebhookSchema.safeParse(parsedBody);
  if (!parsedPayload.success) return response.status(400).json({ error: "invalid-webhook-payload" });

  const normalizedEvents = [] as Array<z.infer<typeof recruiterEmailEventSchema>>;
  for (const event of parsedPayload.data.events) {
    const sender = normalizeRecruiterSender(event.sender);
    if (!z.string().email().max(320).safeParse(sender).success) {
      return response.status(400).json({ error: "invalid-webhook-sender" });
    }
    normalizedEvents.push({ ...event, sender });
  }

  try {
    const owner = await getUserByOpenId(ENV.ownerOpenId);
    if (!owner) return response.status(503).json({ error: "owner-account-unavailable" });

    const persisted = await ingestRecruiterEmailEvents(owner.id, normalizedEvents);
    return response.status(202).json({
      ok: true,
      received: normalizedEvents.length,
      persisted: persisted.length,
      reviewStatus: "unreviewed",
    });
  } catch (error) {
    console.error("[recruiter-email-webhook] owner lookup or event persistence failed", error);
    return response.status(500).json({ error: "webhook-persistence-failed" });
  }
}
