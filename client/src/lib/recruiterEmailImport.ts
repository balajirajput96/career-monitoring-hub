export type RecruiterEmailImportDraft = {
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  receivedAt: string;
  snippet: string;
};

export type RecruiterEmailImportEvent = {
  messageId: string;
  threadId?: string;
  sender: string;
  subject: string;
  receivedAt?: Date;
  snippet?: string;
};

export function buildRecruiterEmailImportEvent(draft: RecruiterEmailImportDraft): RecruiterEmailImportEvent {
  const messageId = draft.messageId.trim();
  const threadId = draft.threadId.trim();
  const sender = draft.sender.trim();
  const subject = draft.subject.trim();
  const snippet = draft.snippet.trim();
  const receivedAt = draft.receivedAt ? new Date(draft.receivedAt) : undefined;

  return {
    messageId,
    sender,
    subject,
    ...(threadId ? { threadId } : {}),
    ...(receivedAt ? { receivedAt } : {}),
    ...(snippet ? { snippet } : {}),
  };
}

export const recruiterEmailReviewActions = ["reviewed", "ignored"] as const;
