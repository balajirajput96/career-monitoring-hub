import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  applications,
  approvalRequests,
  candidateProfiles,
  dailyReports,
  jobListings,
  jobMatches,
  jobSources,
  recruiterContacts,
  recruiterEmailEvents,
  workflowRuns,
  workflowSchedules,
} from "../drizzle/schema";
import { getDb } from "./db";

export type VerifiedExperience = { title: string; years: number; domain: string };

export type ProfileInput = {
  headline: string;
  yearsExperience: number;
  education: string[];
  verifiedExperience: VerifiedExperience[];
  factsSource?: string | null;
  skills: string[];
  certifications: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  preferredTracks: Array<"pharma_qa" | "ai_automation">;
  resumeVersions: Array<{ name: string; notes?: string; url?: string; storageKey?: string }>;
  summary?: string;
  outputLanguage: "en" | "hi";
};

export async function requireCareerDb() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  return db;
}

const VERIFIED_FACTS_SOURCE = "https://docs.google.com/document/d/1VjV4w9b7BnpEwTbmux1BG_-g33ODHcDHXI6h6cpnmhE/edit?usp=drivesdk";
export type ResumeContext = {
  education: string[];
  verifiedExperience: VerifiedExperience[];
  factsSource: string | null;
  skills: string[];
  preferredRoles: string[];
};

export function buildResumeContext(profile: Pick<ProfileInput, "education" | "verifiedExperience" | "factsSource" | "skills" | "preferredRoles">): ResumeContext {
  return {
    education: [...profile.education],
    verifiedExperience: profile.verifiedExperience.map(item => ({ ...item })),
    factsSource: profile.factsSource ?? null,
    skills: [...profile.skills],
    preferredRoles: [...profile.preferredRoles],
  };
}

const VERIFIED_PROFILE_DEFAULTS: ProfileInput = {
  headline: "Quality Officer | Pharma QA | AI/Python Automation",
  yearsExperience: 2,
  education: ["Diploma in Biotechnology"],
  verifiedExperience: [{ title: "Quality Officer / QA", years: 2, domain: "Pharmaceutical quality assurance" }],
  factsSource: VERIFIED_FACTS_SOURCE,
  skills: ["AI Fundamentals & Evaluation", "Quality Assurance & Verification", "Python automation", "Linux", "Automated testing", "APIs/FastAPI", "PostgreSQL", "Docker/Kubernetes", "CI/CD", "Data workflows", "AI model evaluation"],
  certifications: [],
  preferredRoles: ["QA / Quality Officer", "Python / Backend", "Cloud / MLOps", "AI evaluator / trainer"],
  preferredLocations: ["India", "Worldwide remote"],
  preferredTracks: ["pharma_qa", "ai_automation"],
  resumeVersions: [],
  summary: "Verified facts imported from the user-provided career document. Email intentionally unset because the source material contained two different addresses.",
  outputLanguage: "en",
};

export async function getProfile(userId: number, bootstrap = true) {
  const db = await requireCareerDb();
  const existing = (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1))[0];
  if (existing || !bootstrap) return existing;
  await db.insert(candidateProfiles).values({ userId, ...VERIFIED_PROFILE_DEFAULTS, summary: VERIFIED_PROFILE_DEFAULTS.summary ?? null });
  return (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1))[0];
}

export async function saveProfile(userId: number, input: ProfileInput) {
  const db = await requireCareerDb();
  const existing = await getProfile(userId);
  const values = { userId, ...input, summary: input.summary || null, factsSource: input.factsSource || null };
  if (existing) {
    await db.update(candidateProfiles).set(values).where(eq(candidateProfiles.id, existing.id));
  } else {
    await db.insert(candidateProfiles).values(values);
  }
  return getProfile(userId);
}

export async function getOrCreateSchedule(userId: number) {
  const db = await requireCareerDb();
  const existing = (await db.select().from(workflowSchedules).where(eq(workflowSchedules.userId, userId)).limit(1))[0];
  if (existing) return existing;
  await db.insert(workflowSchedules).values({ userId });
  return (await db.select().from(workflowSchedules).where(eq(workflowSchedules.userId, userId)).limit(1))[0]!;
}

export async function getScheduleByTaskUid(taskUid: string) {
  const db = await requireCareerDb();
  return (await db.select().from(workflowSchedules).where(eq(workflowSchedules.scheduleCronTaskUid, taskUid)).limit(1))[0];
}

export async function updateSchedule(userId: number, values: Partial<typeof workflowSchedules.$inferInsert>) {
  const db = await requireCareerDb();
  const schedule = await getOrCreateSchedule(userId);
  await db.update(workflowSchedules).set(values).where(eq(workflowSchedules.id, schedule.id));
  return (await db.select().from(workflowSchedules).where(eq(workflowSchedules.id, schedule.id)).limit(1))[0]!;
}

export async function listSources(userId: number) {
  const db = await requireCareerDb();
  return db.select().from(jobSources).where(eq(jobSources.userId, userId)).orderBy(desc(jobSources.createdAt));
}

export async function getActiveSources(userId: number) {
  const db = await requireCareerDb();
  return db.select().from(jobSources).where(and(eq(jobSources.userId, userId), eq(jobSources.isActive, true)));
}

export async function addSource(
  userId: number,
  input: Pick<typeof jobSources.$inferInsert, "name" | "sourceType" | "track" | "endpointUrl" | "config">
) {
  const db = await requireCareerDb();
  const result = await db.insert(jobSources).values({ userId, ...input });
  return (await db.select().from(jobSources).where(eq(jobSources.id, Number(result[0].insertId))).limit(1))[0];
}

export async function removeSource(userId: number, sourceId: number) {
  const db = await requireCareerDb();
  await db.delete(jobSources).where(and(eq(jobSources.id, sourceId), eq(jobSources.userId, userId)));
}

export async function listJobs(
  userId: number,
  filters: { track?: "pharma_qa" | "ai_automation"; location?: string; limit?: number } = {}
) {
  const db = await requireCareerDb();
  const where = filters.track ? and(eq(jobListings.userId, userId), eq(jobListings.track, filters.track)) : eq(jobListings.userId, userId);
  const rows = await db
    .select({ job: jobListings, match: jobMatches, application: applications })
    .from(jobListings)
    .leftJoin(jobMatches, and(eq(jobMatches.jobId, jobListings.id), eq(jobMatches.userId, userId)))
    .leftJoin(applications, and(eq(applications.jobId, jobListings.id), eq(applications.userId, userId)))
    .where(where)
    .orderBy(desc(jobMatches.overallScore), desc(jobListings.discoveredAt))
    .limit(filters.limit ?? 75);

  const locationQuery = filters.location?.trim().toLocaleLowerCase();
  return rows.filter(row => !locationQuery || row.job.location.toLocaleLowerCase().includes(locationQuery) || row.job.workplaceType.toLocaleLowerCase().includes(locationQuery));
}

export async function getJobForUser(userId: number, jobId: number) {
  const db = await requireCareerDb();
  return (await db.select().from(jobListings).where(and(eq(jobListings.id, jobId), eq(jobListings.userId, userId))).limit(1))[0];
}

export function isDuplicateApplicationSubmission(existingStatus: string | undefined, requestedStatus: string) {
  return existingStatus === "applied" && requestedStatus === "applied";
}

export async function getApplicationForUser(userId: number, jobId: number) {
  const db = await requireCareerDb();
  return (await db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.jobId, jobId))).limit(1))[0];
}

export async function listApplications(userId: number) {
  const db = await requireCareerDb();
  return db
    .select({ application: applications, job: jobListings, match: jobMatches })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .leftJoin(jobMatches, and(eq(jobMatches.jobId, applications.jobId), eq(jobMatches.userId, userId)))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.updatedAt));
}

export async function listRecruiterContacts(userId: number) {
  const db = await requireCareerDb();
  return db.select().from(recruiterContacts).where(eq(recruiterContacts.userId, userId)).orderBy(desc(recruiterContacts.updatedAt));
}

export async function addRecruiterContact(userId: number, input: Pick<typeof recruiterContacts.$inferInsert, "applicationId" | "jobId" | "name" | "company" | "role" | "email" | "linkedInUrl" | "responseStatus" | "lastContactAt" | "notes">) {
  const db = await requireCareerDb();
  const result = await db.insert(recruiterContacts).values({ userId, ...input });
  return (await db.select().from(recruiterContacts).where(eq(recruiterContacts.id, Number(result[0].insertId))).limit(1))[0];
}

export async function updateRecruiterContact(userId: number, contactId: number, values: Partial<typeof recruiterContacts.$inferInsert>) {
  const db = await requireCareerDb();
  await db.update(recruiterContacts).set(values).where(and(eq(recruiterContacts.id, contactId), eq(recruiterContacts.userId, userId)));
  return (await db.select().from(recruiterContacts).where(and(eq(recruiterContacts.id, contactId), eq(recruiterContacts.userId, userId))).limit(1))[0];
}

export function normalizeRecruiterSender(sender: string) {
  return sender.match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? sender.trim().toLowerCase();
}

export function isLikelyRecruiterResponse(subject: string) {
  return /interview|application|candidate|recruit|assessment|next steps|thank you/i.test(subject);
}

export function dedupeRecruiterEmailInputs(items: RecruiterEmailInput[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.messageId)) return false;
    seen.add(item.messageId);
    return true;
  });
}

export function resolveRecruiterContactId(
  sender: string,
  threadId: string | null | undefined,
  contacts: Array<{ id: number; email?: string | null }>,
  priorEvents: Array<{ threadId?: string | null; matchedContactId?: number | null }>,
) {
  const senderEmail = normalizeRecruiterSender(sender);
  const bySender = contacts.find(contact => contact.email?.toLowerCase() === senderEmail);
  if (bySender) return bySender.id;
  const prior = threadId ? priorEvents.find(event => event.threadId === threadId && event.matchedContactId) : undefined;
  return prior?.matchedContactId ?? null;
}

export type RecruiterEmailInput = {
  messageId: string;
  threadId?: string | null;
  sender: string;
  subject: string;
  receivedAt?: Date | null;
  snippet?: string | null;
};

export async function listRecruiterEmailEvents(userId: number) {
  const db = await requireCareerDb();
  return db.select().from(recruiterEmailEvents).where(eq(recruiterEmailEvents.userId, userId)).orderBy(desc(recruiterEmailEvents.createdAt)).limit(100);
}

export async function reviewRecruiterEmailEvent(userId: number, eventId: number, reviewStatus: "reviewed" | "ignored") {
  const db = await requireCareerDb();
  await db.update(recruiterEmailEvents).set({ reviewStatus }).where(and(eq(recruiterEmailEvents.id, eventId), eq(recruiterEmailEvents.userId, userId)));
  return (await db.select().from(recruiterEmailEvents).where(and(eq(recruiterEmailEvents.id, eventId), eq(recruiterEmailEvents.userId, userId))).limit(1))[0];
}

export async function ingestRecruiterEmailEvents(userId: number, items: RecruiterEmailInput[]) {
  const db = await requireCareerDb();
  const contacts = await listRecruiterContacts(userId);
  const results = [];
  for (const item of dedupeRecruiterEmailInputs(items)) {
    const senderEmail = normalizeRecruiterSender(item.sender);
    const senderContact = contacts.find(candidate => candidate.email?.toLowerCase() === senderEmail);
    const threadEvent = item.threadId
      ? (await db.select({ matchedContactId: recruiterEmailEvents.matchedContactId }).from(recruiterEmailEvents).where(and(eq(recruiterEmailEvents.userId, userId), eq(recruiterEmailEvents.threadId, item.threadId))).limit(1))[0]
      : undefined;
    const threadContact = threadEvent?.matchedContactId ? contacts.find(candidate => candidate.id === threadEvent.matchedContactId) : undefined;
    const contact = senderContact ?? threadContact;
    const existing = (await db.select().from(recruiterEmailEvents).where(and(eq(recruiterEmailEvents.userId, userId), eq(recruiterEmailEvents.messageId, item.messageId))).limit(1))[0];
    if (existing) {
      results.push(existing);
      continue;
    }
    const inserted = await db.insert(recruiterEmailEvents).values({
      userId,
      messageId: item.messageId,
      threadId: item.threadId ?? null,
      sender: item.sender,
      subject: item.subject,
      receivedAt: item.receivedAt ?? null,
      snippet: item.snippet ?? null,
      matchedContactId: contact?.id ?? null,
      reviewStatus: "unreviewed",
    });
    const event = (await db.select().from(recruiterEmailEvents).where(eq(recruiterEmailEvents.id, Number(inserted[0].insertId))).limit(1))[0]!;
    if (contact) {
      await db.update(recruiterContacts).set({ responseStatus: "replied", lastContactAt: item.receivedAt ?? new Date() }).where(and(eq(recruiterContacts.id, contact.id), eq(recruiterContacts.userId, userId)));
    }
    results.push(event);
  }
  return results;
}

export async function updateApplication(
  userId: number,
  jobId: number,
  values: Partial<typeof applications.$inferInsert>
) {
  const db = await requireCareerDb();
  const existing = (await db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.jobId, jobId))).limit(1))[0];
  if (existing) {
    await db.update(applications).set({ ...values, lastActionAt: new Date() }).where(eq(applications.id, existing.id));
    return (await db.select().from(applications).where(eq(applications.id, existing.id)).limit(1))[0]!;
  }
  const result = await db.insert(applications).values({ userId, jobId, ...values, lastActionAt: new Date() });
  return (await db.select().from(applications).where(eq(applications.id, Number(result[0].insertId))).limit(1))[0]!;
}

export async function listApprovals(userId: number) {
  const db = await requireCareerDb();
  return db
    .select({ approval: approvalRequests, job: jobListings, application: applications })
    .from(approvalRequests)
    .leftJoin(jobListings, eq(jobListings.id, approvalRequests.jobId))
    .leftJoin(applications, eq(applications.id, approvalRequests.applicationId))
    .where(eq(approvalRequests.userId, userId))
    .orderBy(desc(approvalRequests.requestedAt));
}

export async function createApproval(
  userId: number,
  jobId: number,
  applicationId: number | null,
  actionType: "application_submit" | "message_send" | "post_publish",
  payload: Record<string, unknown>
) {
  const db = await requireCareerDb();
  const result = await db.insert(approvalRequests).values({ userId, jobId, applicationId, actionType, payload });
  return (await db.select().from(approvalRequests).where(eq(approvalRequests.id, Number(result[0].insertId))).limit(1))[0]!;
}

export async function decideApproval(userId: number, approvalId: number, decision: "approved" | "declined") {
  const db = await requireCareerDb();
  await db.update(approvalRequests).set({ status: decision, decidedAt: new Date() }).where(and(eq(approvalRequests.id, approvalId), eq(approvalRequests.userId, userId), eq(approvalRequests.status, "pending")));
  return (await db.select().from(approvalRequests).where(and(eq(approvalRequests.id, approvalId), eq(approvalRequests.userId, userId))).limit(1))[0];
}

export async function getDashboardData(userId: number) {
  const db = await requireCareerDb();
  const [schedule, profile, jobs, applicationsList, approvals, reports, runs, sources, contacts] = await Promise.all([
    getOrCreateSchedule(userId),
    getProfile(userId),
    listJobs(userId, { limit: 8 }),
    listApplications(userId),
    listApprovals(userId),
    db.select().from(dailyReports).where(eq(dailyReports.userId, userId)).orderBy(desc(dailyReports.createdAt)).limit(3),
    db.select().from(workflowRuns).where(eq(workflowRuns.userId, userId)).orderBy(desc(workflowRuns.startedAt)).limit(5),
    listSources(userId),
    listRecruiterContacts(userId),
  ]);
  const highPriority = jobs.filter(item => (item.match?.overallScore ?? 0) >= schedule.highPriorityThreshold);
  return {
    schedule,
    profile,
    jobs,
    applications: applicationsList,
    pendingApprovals: approvals.filter(item => item.approval.status === "pending"),
    reports,
    runs,
    sources,
    recruiterContacts: contacts,
    metrics: {
      highPriorityCount: highPriority.length,
      trackedApplications: applicationsList.length,
      activeSources: sources.filter(source => source.isActive).length,
      verifiedJobs: jobs.filter(item => item.job.verificationStatus === "verified").length,
    },
  };
}

export async function updateSourceResult(sourceId: number, result: { error?: string | null; fetchedAt?: Date }) {
  const db = await requireCareerDb();
  await db.update(jobSources).set({ lastError: result.error ?? null, lastFetchedAt: result.fetchedAt ?? new Date() }).where(eq(jobSources.id, sourceId));
}

export async function countPendingApprovals(userId: number) {
  const db = await requireCareerDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(approvalRequests).where(and(eq(approvalRequests.userId, userId), eq(approvalRequests.status, "pending")));
  return Number(result[0]?.count ?? 0);
}

export async function getRunningRun(scheduleId: number) {
  const db = await requireCareerDb();
  return (await db.select().from(workflowRuns).where(and(eq(workflowRuns.scheduleId, scheduleId), eq(workflowRuns.status, "running"))).orderBy(desc(workflowRuns.startedAt)).limit(1))[0];
}

export async function createWorkflowRun(scheduleId: number, userId: number) {
  const db = await requireCareerDb();
  const result = await db.insert(workflowRuns).values({ scheduleId, userId, triggerType: "schedule" });
  return (await db.select().from(workflowRuns).where(eq(workflowRuns.id, Number(result[0].insertId))).limit(1))[0]!;
}

export async function completeWorkflowRun(
  runId: number,
  values: Pick<typeof workflowRuns.$inferInsert, "status" | "statistics" | "summary" | "error">
) {
  const db = await requireCareerDb();
  await db.update(workflowRuns).set({ ...values, completedAt: new Date() }).where(eq(workflowRuns.id, runId));
}

export async function recordDailyReport(
  userId: number,
  workflowRunId: number,
  language: string,
  content: string,
  statistics: Record<string, number>,
  translations?: { en: string; hi: string }
) {
  const db = await requireCareerDb();
  const reportDate = new Date().toISOString().slice(0, 10);
  await db.insert(dailyReports).values({
    userId,
    workflowRunId,
    reportDate,
    language,
    content,
    contentEnglish: translations?.en ?? (language === "en" ? content : null),
    contentHindi: translations?.hi ?? (language === "hi" ? content : null),
    statistics,
  });
}

export async function markScheduleRun(scheduleId: number) {
  const db = await requireCareerDb();
  await db.update(workflowSchedules).set({ lastRunAt: new Date() }).where(eq(workflowSchedules.id, scheduleId));
}

export async function listRecentJobsByIds(userId: number, ids: number[]) {
  if (ids.length === 0) return [];
  const db = await requireCareerDb();
  return db.select().from(jobListings).where(and(eq(jobListings.userId, userId), inArray(jobListings.id, ids)));
}
