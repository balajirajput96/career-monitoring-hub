import { parse as parseCookie } from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { notifyOwner } from "../_core/notification";
import { protectedProcedure, router } from "../_core/trpc";
import { buildResumeContext } from "../careerStore";
import { generateCoverNoteDraft } from "../careerWorkflow";
import { storagePut } from "../storage";
import {
  addSource,
  createApproval,
  decideApproval,
  getDashboardData,
  getJobForUser,
  getApplicationForUser,
  isDuplicateApplicationSubmission,
  getOrCreateSchedule,
  getProfile,
  listApplications,
  listRecruiterContacts,
  addRecruiterContact,
  updateRecruiterContact,
  listApprovals,
  listJobs,
  listSources,
  removeSource,
  saveProfile,
  updateApplication,
  updateSchedule,
} from "../careerStore";

const trackSchema = z.enum(["pharma_qa", "ai_automation"]);
const languageSchema = z.enum(["en", "hi"]);
const sourceTypeSchema = z.enum(["greenhouse", "lever"]);
const statusSchema = z.enum(["found", "shortlisted", "approval_pending", "applied", "rejected", "follow_up", "closed"]);

const resumeVersionSchema = z.object({
  name: z.string().trim().min(1).max(180),
  notes: z.string().trim().max(500).optional(),
  url: z.string().startsWith("/manus-storage/").optional(),
  storageKey: z.string().trim().min(1).max(600).optional(),
});

export const profileInputSchema = z.object({
  headline: z.string().trim().min(2).max(255),
  yearsExperience: z.number().int().min(0).max(60),
  education: z.array(z.string().trim().min(1).max(200)).max(20),
  verifiedExperience: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    years: z.number().min(0).max(60),
    domain: z.string().trim().min(1).max(200),
  })).max(20),
  factsSource: z.string().url().max(2_000).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(80),
  certifications: z.array(z.string().trim().min(1).max(160)).max(60),
  preferredRoles: z.array(z.string().trim().min(1).max(160)).max(30),
  preferredLocations: z.array(z.string().trim().min(1).max(120)).max(30),
  preferredTracks: z.array(trackSchema).min(1).max(2),
  resumeVersions: z.array(resumeVersionSchema).max(20),
  summary: z.string().trim().max(5_000).optional(),
  outputLanguage: languageSchema,
});

export const sourceInputSchema = z.object({
  name: z.string().trim().min(2).max(180),
  sourceType: sourceTypeSchema,
  track: trackSchema,
  endpointUrl: z.string().url().max(2_000),
  config: z.record(z.string(), z.unknown()).optional(),
}).superRefine((input, refinement) => {
  const url = new URL(input.endpointUrl);
  const isGreenhouse = input.sourceType === "greenhouse" && url.protocol === "https:" && url.hostname === "boards-api.greenhouse.io" && /^\/v1\/boards\/[^/]+\/jobs\/?$/.test(url.pathname);
  const isLever = input.sourceType === "lever" && url.protocol === "https:" && url.hostname === "api.lever.co" && /^\/v0\/postings\/[^/]+$/.test(url.pathname) && (url.searchParams.get("mode") ?? "json") === "json";
  if (!isGreenhouse && !isLever) {
    refinement.addIssue({ code: z.ZodIssueCode.custom, path: ["endpointUrl"], message: "Use a public HTTPS Greenhouse boards JSON endpoint or Lever postings JSON endpoint." });
  }
});

function requireSessionToken(header: string | undefined) {
  const token = parseCookie(header ?? "")[COOKIE_NAME] ?? "";
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in again before configuring the schedule." });
  return token;
}

export const careerRouter = router({
  overview: protectedProcedure.query(({ ctx }) => getDashboardData(ctx.user.id)),
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getProfile(ctx.user.id)),
    save: protectedProcedure.input(profileInputSchema).mutation(({ ctx, input }) => saveProfile(ctx.user.id, input)),
    uploadResume: protectedProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(180),
      contentType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
      base64: z.string().min(8).max(7_000_000),
    })).mutation(async ({ ctx, input }) => {
      const extension = input.contentType === "application/pdf" ? ".pdf" : ".docx";
      const safeStem = input.fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "resume";
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Resume files must be no larger than 5 MB." });
      }
      const expectedPdf = input.contentType === "application/pdf" && buffer.subarray(0, 4).toString() === "%PDF";
      const expectedDocx = input.contentType.includes("wordprocessingml") && buffer.subarray(0, 2).toString() === "PK";
      if (!expectedPdf && !expectedDocx) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a valid PDF or DOCX resume." });
      }
      const stored = await storagePut(`career-resumes/${ctx.user.id}/${safeStem}${extension}`, buffer, input.contentType);
      return { name: `${safeStem}${extension}`, storageKey: stored.key, url: stored.url };
    }),
  }),
  contacts: router({
    list: protectedProcedure.query(({ ctx }) => listRecruiterContacts(ctx.user.id)),
    add: protectedProcedure.input(z.object({
      applicationId: z.number().int().positive().optional(),
      jobId: z.number().int().positive().optional(),
      name: z.string().trim().min(1).max(255),
      company: z.string().trim().max(300).optional(),
      role: z.string().trim().max(255).optional(),
      email: z.string().email().max(320).optional(),
      linkedInUrl: z.string().url().max(2_000).optional(),
      responseStatus: z.enum(["discovered", "contacted", "replied", "no_response", "closed"]).optional(),
      lastContactAt: z.date().optional(),
      notes: z.string().trim().max(5_000).optional(),
    })).mutation(({ ctx, input }) => addRecruiterContact(ctx.user.id, { ...input, responseStatus: input.responseStatus ?? "discovered" })),
    update: protectedProcedure.input(z.object({
      contactId: z.number().int().positive(),
      responseStatus: z.enum(["discovered", "contacted", "replied", "no_response", "closed"]).optional(),
      lastContactAt: z.date().optional(),
      notes: z.string().trim().max(5_000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { contactId, ...values } = input;
      const updated = await updateRecruiterContact(ctx.user.id, contactId, values);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Recruiter contact not found." });
      if (values.responseStatus === "replied") await notifyOwner({ title: "Recruiter response recorded", content: `${updated.name}${updated.company ? ` at ${updated.company}` : ""} is marked as replied. Review the contact record and decide any next message manually.` });
      return updated;
    }),
  }),
  sources: router({
    list: protectedProcedure.query(({ ctx }) => listSources(ctx.user.id)),
    add: protectedProcedure.input(sourceInputSchema).mutation(({ ctx, input }) => addSource(ctx.user.id, { ...input, config: input.config ?? null })),
    remove: protectedProcedure.input(z.object({ sourceId: z.number().int().positive() })).mutation(({ ctx, input }) => removeSource(ctx.user.id, input.sourceId)),
  }),
  jobs: router({
    list: protectedProcedure.input(z.object({ track: trackSchema.optional(), location: z.string().trim().max(160).optional() }).optional()).query(({ ctx, input }) => listJobs(ctx.user.id, input)),
  }),
  applications: router({
    list: protectedProcedure.query(({ ctx }) => listApplications(ctx.user.id)),
    draftCoverNote: protectedProcedure.input(z.object({
      jobId: z.number().int().positive(),
      language: languageSchema.optional(),
    })).mutation(async ({ ctx, input }) => {
      const [job, profile] = await Promise.all([getJobForUser(ctx.user.id, input.jobId), getProfile(ctx.user.id)]);
      if (!job || !profile) throw new TRPCError({ code: "NOT_FOUND", message: "Job or career profile not found." });
      const language = input.language ?? (profile.outputLanguage === "hi" ? "hi" : "en");
      const draft = await generateCoverNoteDraft(language, {
        sourceJobId: job.externalKey,
        title: job.title,
        company: job.company,
        location: job.location,
        workplaceType: job.workplaceType,
        description: job.description ?? undefined,
        sourceUrl: job.sourceUrl,
        applicationUrl: job.applicationUrl ?? undefined,
        postedAt: job.postedAt ?? undefined,
      }, buildResumeContext(profile));
      return updateApplication(ctx.user.id, input.jobId, {
        coverNoteDraft: draft,
        coverNoteLanguage: language,
      });
    }),
    update: protectedProcedure.input(z.object({
      jobId: z.number().int().positive(),
      status: statusSchema,
      resumeVersion: z.string().trim().max(180).optional(),
      followUpAt: z.date().optional(),
      notes: z.string().trim().max(5_000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const job = await getJobForUser(ctx.user.id, input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
      const profile = await getProfile(ctx.user.id);
      if (input.resumeVersion && !(profile?.resumeVersions ?? []).some(resume => resume.name === input.resumeVersion || resume.storageKey === input.resumeVersion)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Select a resume version already stored in your profile." });
      }
      const existing = await getApplicationForUser(ctx.user.id, input.jobId);
      if (isDuplicateApplicationSubmission(existing?.status, input.status)) return existing;
      return updateApplication(ctx.user.id, input.jobId, input);
    }),
  }),
  approvals: router({
    list: protectedProcedure.query(({ ctx }) => listApprovals(ctx.user.id)),
    request: protectedProcedure.input(z.object({
      jobId: z.number().int().positive(),
      applicationId: z.number().int().positive().optional(),
      actionType: z.enum(["application_submit", "message_send", "post_publish"]),
      note: z.string().trim().max(2_000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const job = await getJobForUser(ctx.user.id, input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
      const approval = await createApproval(ctx.user.id, input.jobId, input.applicationId ?? null, input.actionType, {
        note: input.note ?? "",
        applicationUrl: job.applicationUrl,
        sourceUrl: job.sourceUrl,
      });
      await updateApplication(ctx.user.id, input.jobId, { status: "approval_pending" });
      await notifyOwner({ title: "Manual approval required", content: `${input.actionType.replaceAll("_", " ")} requested for ${job.title} at ${job.company}. No external action has been executed.` });
      return approval;
    }),
    decide: protectedProcedure.input(z.object({ approvalId: z.number().int().positive(), decision: z.enum(["approved", "declined"]) })).mutation(({ ctx, input }) => decideApproval(ctx.user.id, input.approvalId, input.decision)),
  }),
  schedule: router({
    get: protectedProcedure.query(({ ctx }) => getOrCreateSchedule(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      cronExpression: z.string().regex(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+$/, "Use a six-field UTC cron expression."),
      timezone: z.literal("Asia/Kolkata"),
      language: languageSchema,
      highPriorityThreshold: z.number().int().min(50).max(100),
    })).mutation(({ ctx, input }) => updateSchedule(ctx.user.id, input)),
    activate: protectedProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "production") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Deploy the project before activating a recurring schedule." });
      const schedule = await getOrCreateSchedule(ctx.user.id);
      const token = requireSessionToken(ctx.req.headers.cookie);
      const jobName = `career-monitor-${ctx.user.id}`;
      let taskUid = schedule.scheduleCronTaskUid;
      if (taskUid) {
        await updateHeartbeatJob(taskUid, { cron: schedule.cronExpression, enable: true, description: "Daily Career Monitoring Hub discovery and reporting" }, token);
      } else {
        const job = await createHeartbeatJob({ name: jobName, cron: schedule.cronExpression, path: "/api/scheduled/career-monitor", description: "Daily Career Monitoring Hub discovery and reporting" }, token);
        taskUid = job.taskUid;
      }
      return updateSchedule(ctx.user.id, { scheduleCronTaskUid: taskUid, isEnabled: true });
    }),
    pause: protectedProcedure.mutation(async ({ ctx }) => {
      const schedule = await getOrCreateSchedule(ctx.user.id);
      if (schedule.scheduleCronTaskUid) {
        const token = requireSessionToken(ctx.req.headers.cookie);
        await updateHeartbeatJob(schedule.scheduleCronTaskUid, { enable: false }, token);
      }
      return updateSchedule(ctx.user.id, { isEnabled: false });
    }),
    remove: protectedProcedure.mutation(async ({ ctx }) => {
      const schedule = await getOrCreateSchedule(ctx.user.id);
      if (schedule.scheduleCronTaskUid) {
        const token = requireSessionToken(ctx.req.headers.cookie);
        await deleteHeartbeatJob(schedule.scheduleCronTaskUid, token);
      }
      return updateSchedule(ctx.user.id, { scheduleCronTaskUid: null, isEnabled: false });
    }),
  }),
});
