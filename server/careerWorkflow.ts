import { and, eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
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
  buildResumeContext,
  getProfile,
  getRunningRun,
  markScheduleRun,
  recordDailyReport,
  requireCareerDb,
  updateSourceResult,
} from "./careerStore";

type SourceRow = Awaited<ReturnType<typeof getActiveSources>>[number];

export function resolveReportLanguage(profileLanguage: string | null | undefined, scheduleLanguage: string) {
  return profileLanguage === "hi" || scheduleLanguage === "hi" ? "hi" as const : "en" as const;
}

export function buildCoverNotePrompt(language: "en" | "hi", job: DiscoveredJob, resumeContext: ReturnType<typeof buildResumeContext>) {
  const languageName = language === "hi" ? "Hindi" : "English";
  return {
    system: `Write a concise, truthful, reviewable cover-note draft in ${languageName}. Use only the supplied verified profile context. Do not invent employment, credentials, salary, visa eligibility, or contact details. State uncertainty rather than guessing. This is a draft only; do not imply that it was submitted.`,
    user: JSON.stringify({ job: { title: job.title, company: job.company, location: job.location, description: job.description?.slice(0, 2_000) }, resumeContext }),
  };
}

export async function generateCoverNoteDraft(language: "en" | "hi", job: DiscoveredJob, resumeContext: ReturnType<typeof buildResumeContext>) {
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
    signal: AbortSignal.timeout(12_000),
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
  resumeContext: ReturnType<typeof buildResumeContext>
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

async function generateDailySummary(
  language: "en" | "hi",
  stats: Record<string, number>,
  blockers: string[]
) {
  const languageName = language === "hi" ? "Hindi" : "English";
  const fallback = language === "hi"
    ? `दैनिक जॉब रन पूरा हुआ। ${stats.newJobs} नए अवसर मिले, ${stats.highPriority} उच्च-प्राथमिकता match हैं और ${stats.sourceErrors} source errors दर्ज हुए।`
    : `Daily job run completed. ${stats.newJobs} new opportunities were found, ${stats.highPriority} are high-priority matches, and ${stats.sourceErrors} source errors were recorded.`;
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
    return typeof content === "string" && content.trim() ? content.trim() : fallback;
  } catch {
    return fallback;
  }
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
    const summary = effectiveLanguage === "hi"
      ? "रन छोड़ा गया क्योंकि आपका career profile अभी पूरा नहीं है। पहले skills, experience और preferences सहेजें।"
      : "Run skipped because your career profile is incomplete. Save skills, experience, and preferences first.";
    await completeWorkflowRun(run.id, { status: "skipped", statistics: stats, summary, error: "Missing candidate profile" });
    await recordDailyReport(schedule.userId, run.id, effectiveLanguage, summary, stats);
    return { ok: true, skipped: "missing-profile" };
  }

  const sources = await getActiveSources(schedule.userId);
  const stats = { newJobs: 0, highPriority: 0, sourceErrors: 0, sourcesChecked: sources.length };
  const blockers: string[] = [];
  const highPriorityTitles: string[] = [];

  try {
    for (const source of sources) {
      let sourceJobs: DiscoveredJob[] = [];
      try {
        sourceJobs = await fetchSourceJobs(source);
        await updateSourceResult(source.id, { fetchedAt: new Date() });
      } catch (error) {
        stats.sourceErrors += 1;
        const message = error instanceof Error ? error.message : "Unknown source failure";
        blockers.push(`${source.name}: ${message}`);
        await updateSourceResult(source.id, { error: message, fetchedAt: new Date() });
        continue;
      }

      for (const job of sourceJobs.slice(0, 150)) {
        const externalKey = stableExternalKey(source.id, job.sourceJobId);
        const existing = (await db.select().from(jobListings).where(and(eq(jobListings.userId, schedule.userId), eq(jobListings.externalKey, externalKey))).limit(1))[0];
        if (existing) continue;

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
        const shouldExplain = deterministic.overallScore >= schedule.highPriorityThreshold;
        const rationale = shouldExplain
          ? await generateMatchExplanation(effectiveLanguage, job, deterministic, buildResumeContext(profile))
          : deterministic.rationale;
        await db.insert(jobMatches).values({
          userId: schedule.userId,
          jobId,
          overallScore: deterministic.overallScore,
          skillsScore: deterministic.skillsScore,
          experienceScore: deterministic.experienceScore,
          locationScore: deterministic.locationScore,
          eligibility: deterministic.eligibility,
          rationale,
          rationaleLanguage: effectiveLanguage,
          evidence: deterministic.evidence,
        });
        stats.newJobs += 1;
        if (deterministic.overallScore >= schedule.highPriorityThreshold) {
          stats.highPriority += 1;
          highPriorityTitles.push(`${job.title} — ${job.company} (${deterministic.overallScore})`);
        }
      }
    }

    const summary = await generateDailySummary(effectiveLanguage, stats, blockers);
    const status = stats.sourceErrors > 0 ? "completed_with_warnings" : "completed";
    await completeWorkflowRun(run.id, { status, statistics: stats, summary, error: blockers.length ? blockers.join(" | ") : null });
    if (shouldRecordDailyReport(status)) await recordDailyReport(schedule.userId, run.id, effectiveLanguage, summary, stats);
    await markScheduleRun(schedule.id);

    if (stats.highPriority > 0) {
      await notifyOwner({
        title: `${stats.highPriority} high-priority job match${stats.highPriority === 1 ? "" : "es"}`,
        content: highPriorityTitles.slice(0, 3).join("\n"),
      });
    }
    if (stats.sourceErrors > 0) {
      await notifyOwner({
        title: "Career monitoring needs attention",
        content: `${stats.sourceErrors} configured source${stats.sourceErrors === 1 ? "" : "s"} could not be checked. Review the latest workflow report before relying on today’s results.`,
      });
    }
    return { ok: true, stats, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected workflow failure";
    await completeWorkflowRun(run.id, { status: "failed", statistics: stats, summary: "Scheduled job run failed.", error: message });
    await notifyOwner({ title: "Career monitoring run failed", content: "A scheduled run stopped before completion. No external action was taken; review the workflow log for details." });
    throw error;
  }
}
