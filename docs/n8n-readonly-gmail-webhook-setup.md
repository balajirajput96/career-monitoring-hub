# Read-only Gmail → Career Hub n8n Setup

**Prepared by Manus AI**  
**Status:** Implementation-ready, but intentionally not activated until the mailbox owner completes Google OAuth and configures the same HMAC secret in both systems.

## Purpose and boundaries

This guide configures n8n to detect incoming recruiter emails, reduce them to the minimum fields needed for review, and deliver them to Career Hub's authenticated webhook. It does **not** grant a workflow any send, draft, reply, delete, label-changing, application-submission, or LinkedIn capability. Career Hub will persist every accepted event as `unreviewed`; the owner must manually choose **Reviewed** or **Ignored** before any follow-up decision.

| Component | Required configuration | Explicitly excluded |
|---|---|---|
| Gmail Trigger | One owner-authorized Gmail OAuth2 credential; **Message Received** only; unread messages; a restrictive recruiter-focused search or label if available | Gmail send, draft, reply, delete, label update, spam/trash access |
| Data minimization step | Preserve only `messageId`, optional `threadId`, `sender`, `subject`, `receivedAt`, and optional short `snippet` | Attachments, email bodies beyond the optional snippet, recipient lists, account tokens |
| Signing step | HMAC-SHA256 over the exact compact JSON request body, using a secret available only to the n8n host and Career Hub deployment | Plaintext shared secret in a Set node, workflow JSON export, browser form, or execution log |
| HTTP delivery | `POST` to `https://careermonhub-fdbzszhr.manus.space/api/integrations/n8n/recruiter-email` | Any endpoint that sends an application or recruiter message |

> **Do not activate this workflow until both OAuth and shared-secret steps are completed legitimately.** A missing secret makes Career Hub reject requests by design; a placeholder secret is not a valid substitute.

## 1. Create the Gmail credential

On the self-hosted n8n instance, create a **Gmail OAuth2** credential for the mailbox owner. n8n recommends OAuth2 for Gmail; Gmail service-account access relies on domain-wide delegation and is discouraged.[1] The Google Cloud OAuth client must include n8n's displayed OAuth redirect URL. For the current public n8n instance, use:

```text
https://n8n-latest-xddq.onrender.com/rest/oauth2-credential/callback
```

After the owner clicks **Connect my account**, the owner—not an agent—must complete Google sign-in, consent, and any two-factor challenge. Do not enter or store the password, verification code, or OAuth refresh token outside the credential store.

## 2. Build the minimal read-only workflow

Add these nodes in this order. Begin inactive and use a test email only after the credential is visibly connected.

| Order | n8n node | Configuration |
|---|---|---|
| 1 | **Gmail Trigger** | Event: **Message Received**. Set the narrowest appropriate recruiter label or Gmail search. Keep **Include Spam and Trash** off. Set **Read Status** to **Unread emails only** and cap **Max Emails per Poll** at a small operational value, such as 10. |
| 2 | **Code**: `Build Career Hub events` | Convert incoming simplified Gmail data into the exact JSON envelope below. Inspect a test execution first; map Gmail's actual `id`, `threadId`, `headers.from`, `headers.subject`, and received time fields instead of guessing them. Reject an item if it lacks a syntactically valid sender, non-empty message ID, or non-empty subject. |
| 3 | **Code**: `Sign exact body` | Serialize the envelope once as compact JSON, set a millisecond Unix timestamp, and calculate the HMAC from `${timestamp}.${rawBody}`. The signature must be over the same bytes that the HTTP node sends. |
| 4 | **HTTP Request** | Method `POST`; URL shown above; authentication **None**; raw `application/json` body equal to the signing node's `rawBody`; headers below. Enable response status visibility. Leave “Never Error” off so rejected deliveries are noticeable. |
| 5 | **Stop and Error** (optional) | For any 4xx or 5xx delivery response, stop the workflow and preserve the safe operational error for review. Do not retry by sending emails or modifying Gmail. |

n8n's Gmail Trigger polls for **Message Received** events, supports restrictive search/label filters, defaults to unread messages, and returns a limited simplified representation by default.[2] The HTTP Request node supports raw JSON bodies and custom headers, which are necessary because the signature covers the exact raw body.[3]

## 3. Exact request contract

Career Hub accepts only this envelope shape, with no user ID:

```json
{
  "events": [
    {
      "messageId": "gmail-message-id",
      "threadId": "optional-gmail-thread-id",
      "sender": "recruiter@example.com",
      "subject": "Interview update",
      "receivedAt": "2026-08-18T03:30:00.000Z",
      "snippet": "Optional short preview only"
    }
  ]
}
```

The maximum batch is 100 events. `sender` must be an email address after any display-name normalization, `messageId` and `subject` are required, and `snippet` is capped at 5,000 characters. Do not include an OAuth token, mailbox address, attachment, full body, candidate profile, user ID, or approval status.

Use these HTTP headers:

```text
Content-Type: application/json
X-Career-Timestamp: <current Unix milliseconds>
X-Career-Signature: sha256=<lowercase HMAC-SHA256 hex>
```

Career Hub rejects missing/malformed signatures, timestamps outside a five-minute replay window, invalid payloads, and any request when `RECRUITER_EMAIL_WEBHOOK_SECRET` is absent. On success, it uses the deployment owner identity server-side, deduplicates by message ID, reconciles threads/contacts, and writes `unreviewed` events only.

## 4. Sign the raw JSON, not a reconstructed object

Use n8n's **Code** node in “Run Once for All Items” mode. The Code node can run JavaScript and the self-hosted runtime provides Node's `crypto` module.[4] Keep the source-specific Gmail field mapping in the preceding data-minimization node. The signing node should receive one item whose JSON has exactly `{ "events": [...] }`.

```javascript
const { createHmac } = require('crypto');

// Read this from the n8n host's protected environment or secret facility.
// Do NOT put the real value into the workflow definition, a Set node, or an execution log.
const secret = $env.CAREER_HUB_WEBHOOK_SECRET;
if (!secret) {
  throw new Error('CAREER_HUB_WEBHOOK_SECRET is not available to the signing node');
}

const payload = $input.first().json;
if (!Array.isArray(payload.events) || payload.events.length === 0 || payload.events.length > 100) {
  throw new Error('Expected 1–100 minimized recruiter-email events');
}

const rawBody = JSON.stringify(payload);
const timestamp = String(Date.now());
const signature = createHmac('sha256', secret)
  .update(`${timestamp}.${rawBody}`, 'utf8')
  .digest('hex');

return [{
  json: {
    rawBody,
    timestamp,
    signature: `sha256=${signature}`,
  },
}];
```

Configure the HTTP Request node to send `{{$json.rawBody}}` as the raw body, rather than rebuilding JSON fields in that node. Set `X-Career-Timestamp` to `{{$json.timestamp}}` and `X-Career-Signature` to `{{$json.signature}}`. If the n8n host blocks environment-variable access in Code nodes, do not work around that by pasting the secret into a workflow; use the host's administrator-approved secret mechanism or pause this integration.

## 5. Owner validation checklist

Run this checklist after OAuth and the shared secret are legitimately configured in **both** places.

| Check | Expected safe outcome |
|---|---|
| Send one test message from a controlled mailbox | One n8n execution posts only the minimized event envelope. |
| Inspect the Career Hub dashboard | One recruiter email event appears as **Unreviewed**. No application, message, draft, or contact action is sent. |
| Re-deliver the same event | The duplicate message ID is ignored or reported as duplicate; no second event is created. |
| Use a matching Gmail thread/contact | Career Hub reconciles the existing contact/thread; the event is still review-only. |
| Alter one signature character | Career Hub returns a rejection and persists nothing. |
| Reuse an old timestamp after five minutes | Career Hub returns a rejection and persists nothing. |
| Inspect n8n credential permissions and nodes | There is no Gmail send/draft/reply/delete node and no outbound endpoint except the Career Hub webhook. |

Deactivate the workflow immediately if any expected safety outcome differs. The owner should inspect the n8n execution record and Career Hub event log before reactivating it.

## References

[1]: https://docs.n8n.io/integrations/builtin/credentials/google "n8n Docs: Google credentials"
[2]: https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/ "n8n Docs: Gmail Trigger"
[3]: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/ "n8n Docs: HTTP Request"
[4]: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/ "n8n Docs: Code"
