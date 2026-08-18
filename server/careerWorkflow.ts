import { and, eq, inArray } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import {
  candidateProfiles,
  jobListings,
  jobMatches,
  workflowSchedules,
} from "../drizzle/schema";
import { scoreJob, stableExternalKey, type JobForScoring } from "./careerScoring";
import {
  completeWorkflowRun,
  createWorkflowRun,
  getActiveSources,
  getProfile,
  getRunningRun,
  markScheduleRun,
  recordDailyReport,
  requireCareerDb,
  updateSourceResult,
} from "./careerStore";

type SourceRow = Awaited<ReturnType<typeof getActiveSources>>[number];

/**
 * Heartbeat enforces a short callback deadline. Scheduled discovery is kept
 * deterministic and time-bounded so a transient AI or notification service
 * cannot block the recurring callback.
 */
export const scheduledExecutionPolicy = Object.freeze({
  sourceFetchTimeoutMs: 8_000,
  maxJobsPerSource: 12,
  maxJobsPerRun: 24,
  runtimeBudgetMs: 20_000,
  useInlineAi: false,
  sendInlineNotifications: false,
});

export function resolveReportLanguage(profileLanguage: string | null | undefined, scheduleLanguage: string) {
  return profileLanguage === "hi" || scheduleLanguage === "hi" ? "hi" as const : "en" as const;
}

export type DiscoveredJob = {
  sourceJobId: string;
  title: string;
  company: string;
  location: string;
  workplaceType: string;
  description?: string;
  sourceUrl: string;
  applicationUrl?: string;
  postedAt?: Date;
};

export function buildCoverNotePrompt(language: "en" | "hi", job: DiscoveredJob, resumeContext: Record<string, unknown>) {
  const languageName = language === "hi" ? "Hindi" : "English";
  return {
    system: `Write a concise, truthful, reviewable cover-note draft in ${languageName}. Use only the supplied verified profile context. Do not invent employment, credentials, salary, visa eligibility, or contact details. State uncertainty rather than guessing. This is a draft only; do not imply that it was submitted.`,
    user: JSON.stringify({ job: { title: job.title, company: job.company, location: job.location, description: job.description?.slice(0, 2_000) }, resumeContext }),
  };
}

export async function generateCoverNoteDraft(language: "en" | "hi", job: DiscoveredJob, resumeContext: Record<string, unknown>) {
  const prompt = buildCoverNotePrompt(language, job, resumeContext);
  try {
    const response = await invokeLLM({ model: "gpt-5-mini", maxTokens: 260, messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ] });
    const content = response.choices[0]?.message.content;
    return typeof content === "string" && content.trim() ? content.trim() : "Draft unavailable; review the verified profile and job description manually.";
  } catch {
    return "Draft unavailable; review the verified profile and job description manually.";
  }
}

function textContent(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toDate(value: unknown) {
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

async function fetchSourceJobs(source: SourceRow): Promise<DiscoveredJob[]> {
  if (source.sourceType !== "greenhouse" && source.sourceType !== "lever") {
    throw new Error("This source type is stored for review but is not fetchable automatically. Use a documented Greenhouse or Lever public JSON endpoint.");
  }

  const response = await fetch(source.endpointUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(scheduledExecutionPolicy.sourceFetchTimeoutMs),
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const data = await response.json() as Record<string, unknown>;

  if (source.sourceType === "greenhouse") {
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    return jobs.map((item: any) => ({
      sourceJobId: String(item.id),
      title: textContent(item.title),
      company: source.name,
      location: textContent(item.location?.name) || "Location not listed",
      workplaceType: /remote/i.test(`${item.title ?? ""} ${item.location?.name ?? ""} ${item.content ?? ""}`) ? "remote" : "onsite_or_hybrid",
      description: textContent(item.content),
      sourceUrl: String(item.absolute_url),
      applicationUrl: String(item.absolute_url),
      postedAt: toDate(item.updated_at),
    })).filter(job => job.title && job.sourceUrl);
  }

  const jobs = Array.isArray(data) ? data : [];
  return jobs.map((item: any) => ({
    sourceJobId: String(item.id),
    title: textContent(item.text),
    company: source.name,
    location: textContent(item.categories?.location) || "Location not listed",
    workplaceType: /remote/i.test(`${item.text ?? ""} ${item.categories?.location ?? ""} ${item.descriptionPlain ?? ""}`) ? "remote" : "onsite_or_hybrid",
    description: textContent(item.descriptionPlain ?? item.description),
    sourceUrl: String(item.hostedUrl),
    applicationUrl: typeof item.applyUrl === "string" ? item.applyUrl : String(item.hostedUrl),
    postedAt: toDate(item.createdAt),
  })).filter(job => job.title && job.sourceUrl);
}

async function generateMatchExplanation(
  language: "en" | "hi",
  job: DiscoveredJob,
  score: ReturnType<typeof scoreJob>,
  resumeContext: Record<string, unknown>
) {
  const languageName = language === "hi" ? "Hindi" : "English";
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 220,
      messages: [
        { role: "system", content: `Write a concise, evidence-bound job-match explanation in ${languageName}. Do not invent credentials, visa eligibility, salary, contacts, or requirements. Mention uncertainty when information is missing.` },
        { role: "user", content: JSON.stringify({ title: job.title, company: job.company, location: job.location, score, description: job.description?.slice(0, 2_000), resumeContext }) },
      ],
    });
    const content = response.choices[0]?.message.content;
    return typeof content === "string" && content.trim() ? content.trim() : score.rationale;
  } catch {
    return score.rationale;
  }
}

// Kept as a non-scheduled helper for explicit user-invoked reports only.
async function generateDailySummary(language: "en" | "hi", stats: Record<string, number>, blockers: string[]) {
  const languageName = language === "hi" ? "Hindi" : "English";
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 280,
      messages: [
        { role: "system", content: `Write a clear, brief daily career-monitoring report in ${languageName}. Only state the supplied facts. Never claim that an application, message, or post was submitted unless the facts explicitly say so. Mention required approvals as pending work.` },
        { role: "user", content: JSON.stringify({ stats, blockers }) },
      ],
    });
    const content = response.choices[0]?.message.content;
    return typeof content === "string" && content.trim() ? content.trim() : buildDeterministicDailySummary(language, stats, blockers);
  } catch {
    return buildDeterministicDailySummary(language, stats, blockers);
  }
}

export function buildDeterministicDailySummary(language: "en" | "hi", stats: Record<string, number>, blockers: string[]) {
  const sourceNote = blockers.length
    ? language === "hi"
      ? ` ${blockers.length} स्रोत-संबंधी चेतावनी review के लिए दर्ज है।`
      : ` ${blockers.length} source warning${blockers.length === 1 ? " is" : "s are"} recorded for review.`
    : "";
  return language === "hi"
    ? `दैनिक जॉब रन पूरा हुआ। ${stats.newJobs} नए अवसर मिले, ${stats.highPriority} उच्च-प्राथमिकता match हैं और ${stats.sourceErrors} source errors दर्ज हुए। सभी applications और messages के लिए manual approval आवश्यक है।${sourceNote}`
    : `Daily job run completed. ${stats.newJobs} new opportunities were found, ${stats.highPriority} are high-priority matches, and ${stats.sourceErrors} source errors were recorded. Manual approval remains required for every application and message.${sourceNote}`;
}

export function buildBilingualDailySummary(stats: Record<string, number>, blockers: string[]) {
  return {
    en: buildDeterministicDailySummary("en", stats, blockers),
    hi: buildDeterministicDailySummary("hi", stats, blockers),
  };
}

export function shouldRecordDailyReport(status: "completed" | "completed_with_warnings" | "skipped" | "failed") {
  return status === "completed" || status === "completed_with_warnings" || status === "skipped";
}

export function approvalIsReviewOnly() {
  return true;
}

export async function runScheduledCareerWorkflow(scheduleId: number) {
  const db = await requireCareerDb();
  const schedule = (await db.select().from(workflowSchedules).where(eq(workflowSchedules.id, scheduleId)).limit(1))[0];
  if (!schedule || !schedule.isEnabled) return { ok: true, skipped: "disabled-or-missing" };

  const running = await getRunningRun(schedule.id);
  if (running) return { ok: true, skipped: "already-running" };

  const profile = await getProfile(schedule.userId);
  const effectiveLanguage = resolveReportLanguage(profile?.outputLanguage, schedule.language);
  const run = await createWorkflowRun(schedule.id, schedule.userId);
  if (!profile) {
    const stats = { newJobs: 0, highPriority: 0, sourceErrors: 0, sourcesChecked: 0 };
    const summaries = {
      en: "Run skipped because your career profile is incomplete. Save skills, experience, and preferences first.",
      hi: "रन छोड़ा गया क्योंकि आपका career profile अभी पूरा नहीं है। पहले skills, experience और preferences सहेजें।",
    };
    const summary = summaries[effectiveLanguage];
    await completeWorkflowRun(run.id, { status: "skipped", statistics: stats, summary, error: "Missing candidate profile" });
    await recordDailyReport(schedule.userId, run.id, effectiveLanguage, summary, stats, summaries);
    return { ok: true, skipped: "missing-profile" };
  }

  const sources = await getActiveSources(schedule.userId);
  const stats = { newJobs: 0, highPriority: 0, sourceErrors: 0, sourcesChecked: sources.length };
  const blockers: string[] = [];
  const deadline = Date.now() + scheduledExecutionPolicy.runtimeBudgetMs;

  try {
    const sourceResults = await Promise.all(sources.map(async source => {
      try {
        return { source, jobs: await fetchSourceJobs(source) } as const;
      } catch (error) {
        return { source, error } as const;
      }
    }));
    let remainingJobs = scheduledExecutionPolicy.maxJobsPerRun;

    for (const result of sourceResults) {
      const { source } = result;
      if ("error" in result) {
        stats.sourceErrors += 1;
        const message = result.error instanceof Error ? result.error.message : "Unknown source failure";
        blockers.push(`${source.name}: ${message}`);
        await updateSourceResult(source.id, { error: message, fetchedAt: new Date() });
        continue;
      }

      await updateSourceResult(source.id, { fetchedAt: new Date() });
      if (remainingJobs <= 0 || Date.now() >= deadline) {
        blockers.push("Run processing limit reached; remaining public-feed jobs will be checked on the next run.");
        break;
      }

      const candidates = result.jobs
        .slice(0, Math.min(scheduledExecutionPolicy.maxJobsPerSource, remainingJobs))
        .map(job => ({ job, externalKey: stableExternalKey(source.id, job.sourceJobId) }));
      const existingRows = candidates.length
        ? await db.select({ externalKey: jobListings.externalKey }).from(jobListings).where(and(
          eq(jobListings.userId, schedule.userId),
          inArray(jobListings.externalKey, candidates.map(candidate => candidate.externalKey))
        ))
        : [];
      const existingKeys = new Set(existingRows.map(row => row.externalKey));

      for (const { job, externalKey } of candidates) {
        if (Date.now() >= deadline) {
          blockers.push("Run processing limit reached; remaining public-feed jobs will be checked on the next run.");
          break;
        }
        if (existingKeys.has(externalKey)) continue;

        const deterministic = scoreJob(profile, job as JobForScoring);
        const result = await db.insert(jobListings).values({
          userId: schedule.userId,
          sourceId: source.id,
          externalKey,
          track: source.track,
          title: job.title,
          company: job.company,
          location: job.location,
          workplaceType: job.workplaceType,
          description: job.description || null,
          sourceUrl: job.sourceUrl,
          applicationUrl: job.applicationUrl || null,
          postedAt: job.postedAt,
          verificationStatus: "verified",
          eligibility: deterministic.eligibility,
        });
        const jobId = Number(result[0].insertId);
        await db.insert(jobMatches).values({
          userId: schedule.userId,
          jobId,
          overallScore: deterministic.overallScore,
          skillsScore: deterministic.skillsScore,
          experienceScore: deterministic.experienceScore,
          locationScore: deterministic.locationScore,
          eligibility: deterministic.eligibility,
          rationale: deterministic.rationale,
          rationaleLanguage: effectiveLanguage,
          evidence: deterministic.evidence,
        });
        stats.newJobs += 1;
        remainingJobs -= 1;
        if (deterministic.overallScore >= schedule.highPriorityThreshold) stats.highPriority += 1;
      }
    }

    const summaries = buildBilingualDailySummary(stats, blockers);
    const summary = summaries[effectiveLanguage];
    const status = stats.sourceErrors > 0 ? "completed_with_warnings" : "completed";
    await completeWorkflowRun(run.id, { status, statistics: stats, summary, error: blockers.length ? blockers.join(" | ") : null });
    if (shouldRecordDailyReport(status)) await recordDailyReport(schedule.userId, run.id, effectiveLanguage, summary, stats, summaries);
    await markScheduleRun(schedule.id);
    return { ok: true, stats, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected workflow failure";
    await completeWorkflowRun(run.id, { status: "failed", statistics: stats, summary: "Scheduled job run failed.", error: message });
    throw error;
  }
}
