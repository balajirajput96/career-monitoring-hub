# No-cost read-only Gmail bridge

## Decision

The safest no-cost alternative to persistent Render n8n is an owner-run **Google Apps Script** project using the Advanced Gmail service with the `gmail.readonly` scope. The script polls recent messages on a time-driven trigger and sends only normalized recruiter-event metadata to the existing Career Hub HMAC webhook. It never sends mail, creates drafts, changes labels, deletes messages, submits applications, or sends recruiter replies.

This guide is a deployment template only. It is not activated by the Career Hub and it does not contain a credential or shared secret. The owner must create the script in the intended Google account, authorize the read-only Gmail scope, set the webhook URL and shared secret in Script Properties, and install the trigger.

## Prerequisites

1. Open [script.google.com](https://script.google.com/) while signed in to the mailbox that should be read.
2. Create a standalone Apps Script project.
3. In **Services**, add **Gmail API** as an Advanced Google service. If Apps Script asks for it, enable the Gmail API in the linked Google Cloud project.
4. Set the Script Properties `CAREER_HUB_WEBHOOK_URL` and `CAREER_HUB_WEBHOOK_SECRET`. Keep the secret in Script Properties; never paste it into the source file or a spreadsheet.
5. Run `syncRecruiterEmailEvents` once from the editor and approve only the read-only Gmail permission requested by the script. Then add a time-driven trigger for that function, for example every five minutes.

## Script

```javascript
const LOOKBACK_MINUTES = 15;
const MAX_MESSAGES_PER_RUN = 50;

function syncRecruiterEmailEvents() {
  const properties = PropertiesService.getScriptProperties();
  const webhookUrl = properties.getProperty('CAREER_HUB_WEBHOOK_URL');
  const secret = properties.getProperty('CAREER_HUB_WEBHOOK_SECRET');
  if (!webhookUrl || !secret) {
    throw new Error('Set CAREER_HUB_WEBHOOK_URL and CAREER_HUB_WEBHOOK_SECRET first.');
  }

  const afterSeconds = Math.floor((Date.now() - LOOKBACK_MINUTES * 60 * 1000) / 1000);
  const listed = Gmail.Users.Messages.list('me', {
    q: `after:${afterSeconds}`,
    maxResults: MAX_MESSAGES_PER_RUN,
  });
  const events = [];

  (listed.messages || []).forEach((ref) => {
    const message = Gmail.Users.Messages.get('me', ref.id, {
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date', 'Message-ID'],
    });
    const headers = {};
    (message.payload && message.payload.headers || []).forEach((header) => {
      headers[header.name.toLowerCase()] = header.value || '';
    });
    const receivedAt = Number(message.internalDate || 0);
    if (!receivedAt || receivedAt < Date.now() - LOOKBACK_MINUTES * 60 * 1000) return;

    events.push({
      messageId: headers['message-id'] || message.id,
      threadId: message.threadId || undefined,
      sender: headers.from || '',
      subject: headers.subject || '(no subject)',
      receivedAt: new Date(receivedAt).toISOString(),
      snippet: message.snippet || undefined,
    });
  });

  if (!events.length) return;

  const rawBody = JSON.stringify({ events });
  const timestamp = String(Date.now());
  const digest = Utilities.computeHmacSha256Signature(`${timestamp}.${rawBody}`, secret);
  const signature = digest
    .map((byte) => (`0${(byte < 0 ? byte + 256 : byte).toString(16)}`).slice(-2))
    .join('');

  const response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: rawBody,
    headers: {
      'X-Career-Timestamp': timestamp,
      'X-Career-Signature': `sha256=${signature}`,
    },
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error(`Career Hub webhook returned HTTP ${status}`);
}
```

## Safety and validation

The Career Hub rejects missing or invalid HMAC signatures, stale requests, malformed sender addresses, and payloads outside its schema. It resolves the owner account server-side and persists every accepted event as `unreviewed`; duplicate message IDs remain idempotent. A successful sync must therefore be checked in the Career Hub dashboard before any review action is taken.

Do not add Gmail send, draft, modify, delete, label, or watch operations to this project. Do not put the shared secret in source code, a public Git repository, a client-side application, or a spreadsheet. If OAuth setup asks for a broader Gmail scope than `gmail.readonly`, stop and do not authorize it.

## No-cost fallback

If the owner does not want to authorize a Google Apps Script project or provide the shared secret, keep n8n inactive and use the existing Career Hub manual recruiter-email importer. It preserves normalization, deduplication, thread matching, and manual-review-only status without requiring a paid host or a mailbox credential in the deployed app.

## References

- [Google Apps Script installable triggers](https://developers.google.com/apps-script/guides/triggers/installable)
- [Gmail API scopes](https://developers.google.com/gmail/api/auth/scopes)
- [Gmail API users.messages.list](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list)
- [Gmail API users.messages.get](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get)
