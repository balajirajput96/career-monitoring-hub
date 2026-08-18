import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const jobTrackEnum = mysqlEnum("track", ["pharma_qa", "ai_automation"]);
export const jobSourceTypeEnum = mysqlEnum("sourceType", [
  "greenhouse",
  "lever",
  "company_careers",
  "manual_url",
  "rss",
]);
export const verificationEnum = mysqlEnum("verificationStatus", [
  "unverified",
  "verified",
  "stale",
  "rejected",
]);
export const eligibilityEnum = mysqlEnum("eligibility", [
  "eligible",
  "review",
  "ineligible",
]);
export const applicationStatusEnum = mysqlEnum("applicationStatus", [
  "found",
  "shortlisted",
  "approval_pending",
  "applied",
  "rejected",
  "follow_up",
  "closed",
]);
export const approvalActionEnum = mysqlEnum("approvalAction", [
  "application_submit",
  "message_send",
  "post_publish",
]);
export const approvalStatusEnum = mysqlEnum("approvalStatus", [
  "pending",
  "approved",
  "declined",
  "executed",
  "expired",
]);
export const workflowRunStatusEnum = mysqlEnum("workflowRunStatus", [
  "running",
  "completed",
  "completed_with_warnings",
  "failed",
  "skipped",
]);

export const candidateProfiles = mysqlTable(
  "candidateProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    headline: varchar("headline", { length: 255 }).notNull().default("Career profile"),
    yearsExperience: int("yearsExperience").notNull().default(0),
    skills: json("skills").$type<string[]>().notNull(),
    certifications: json("certifications").$type<string[]>().notNull(),
    preferredRoles: json("preferredRoles").$type<string[]>().notNull(),
    preferredLocations: json("preferredLocations").$type<string[]>().notNull(),
    preferredTracks: json("preferredTracks").$type<Array<"pharma_qa" | "ai_automation">>().notNull(),
    resumeVersions: json("resumeVersions").$type<Array<{ name: string; notes?: string; url?: string; storageKey?: string }>>().notNull(),
    summary: text("summary"),
    education: json("education").$type<string[]>().notNull(),
    verifiedExperience: json("verifiedExperience").$type<Array<{ title: string; years: number; domain: string }>>().notNull(),
    factsSource: text("factsSource"),
    outputLanguage: varchar("outputLanguage", { length: 5 }).notNull().default("en"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("candidateProfiles_user_idx").on(table.userId)]
);

export const jobSources = mysqlTable(
  "jobSources",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    sourceType: jobSourceTypeEnum.notNull(),
    track: jobTrackEnum.notNull(),
    endpointUrl: text("endpointUrl").notNull(),
    config: json("config").$type<Record<string, unknown>>(),
    isActive: boolean("isActive").notNull().default(true),
    lastFetchedAt: timestamp("lastFetchedAt"),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("jobSources_user_active_idx").on(table.userId, table.isActive)]
);

export const jobListings = mysqlTable(
  "jobListings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    sourceId: int("sourceId"),
    externalKey: varchar("externalKey", { length: 500 }).notNull(),
    track: jobTrackEnum.notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    company: varchar("company", { length: 300 }).notNull(),
    location: varchar("location", { length: 300 }).notNull(),
    workplaceType: varchar("workplaceType", { length: 64 }).notNull().default("unknown"),
    description: text("description"),
    sourceUrl: text("sourceUrl").notNull(),
    applicationUrl: text("applicationUrl"),
    postedAt: timestamp("postedAt"),
    discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
    verificationStatus: verificationEnum.notNull().default("unverified"),
    eligibility: eligibilityEnum.notNull().default("review"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("jobListings_user_external_key_unique").on(table.userId, table.externalKey),
    index("jobListings_user_track_discovered_idx").on(table.userId, table.track, table.discoveredAt),
    index("jobListings_source_idx").on(table.sourceId),
  ]
);

export const jobMatches = mysqlTable(
  "jobMatches",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    jobId: int("jobId").notNull(),
    overallScore: int("overallScore").notNull(),
    skillsScore: int("skillsScore").notNull(),
    experienceScore: int("experienceScore").notNull(),
    locationScore: int("locationScore").notNull(),
    eligibility: eligibilityEnum.notNull(),
    rationale: text("rationale"),
    rationaleLanguage: varchar("rationaleLanguage", { length: 5 }).notNull().default("en"),
    evidence: json("evidence").$type<Record<string, unknown>>(),
    evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("jobMatches_user_job_unique").on(table.userId, table.jobId),
    index("jobMatches_user_score_idx").on(table.userId, table.overallScore),
  ]
);

export const applications = mysqlTable(
  "applications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    jobId: int("jobId").notNull(),
    status: applicationStatusEnum.notNull().default("found"),
    resumeVersion: varchar("resumeVersion", { length: 180 }),
    coverNoteDraft: text("coverNoteDraft"),
    coverNoteLanguage: varchar("coverNoteLanguage", { length: 5 }).notNull().default("en"),
    externalReference: varchar("externalReference", { length: 300 }),
    submittedAt: timestamp("submittedAt"),
    followUpAt: timestamp("followUpAt"),
    lastActionAt: timestamp("lastActionAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("applications_user_job_unique").on(table.userId, table.jobId),
    index("applications_user_status_idx").on(table.userId, table.status),
  ]
);

export const recruiterContacts = mysqlTable(
  "recruiterContacts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    applicationId: int("applicationId"),
    jobId: int("jobId"),
    name: varchar("name", { length: 255 }).notNull(),
    company: varchar("company", { length: 300 }),
    role: varchar("role", { length: 255 }),
    email: varchar("email", { length: 320 }),
    linkedInUrl: text("linkedInUrl"),
    responseStatus: varchar("responseStatus", { length: 64 }).notNull().default("discovered"),
    lastContactAt: timestamp("lastContactAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("recruiterContacts_user_status_idx").on(table.userId, table.responseStatus)]
);

export const recruiterEmailEvents = mysqlTable(
  "recruiterEmailEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    messageId: varchar("messageId", { length: 255 }).notNull(),
    threadId: varchar("threadId", { length: 255 }),
    sender: varchar("sender", { length: 320 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    receivedAt: timestamp("receivedAt"),
    snippet: text("snippet"),
    matchedContactId: int("matchedContactId"),
    reviewStatus: varchar("reviewStatus", { length: 32 }).notNull().default("unreviewed"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("recruiterEmailEvents_user_message_unique").on(table.userId, table.messageId),
    index("recruiterEmailEvents_user_review_idx").on(table.userId, table.reviewStatus),
  ]
);

export const approvalRequests = mysqlTable(
  "approvalRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    jobId: int("jobId"),
    applicationId: int("applicationId"),
    actionType: approvalActionEnum.notNull(),
    status: approvalStatusEnum.notNull().default("pending"),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    decidedAt: timestamp("decidedAt"),
    executedAt: timestamp("executedAt"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("approvalRequests_user_status_idx").on(table.userId, table.status)]
);

export const workflowSchedules = mysqlTable(
  "workflowSchedules",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    cronExpression: varchar("cronExpression", { length: 64 }).notNull().default("0 30 3 * * *"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    isEnabled: boolean("isEnabled").notNull().default(false),
    language: varchar("language", { length: 5 }).notNull().default("en"),
    highPriorityThreshold: int("highPriorityThreshold").notNull().default(80),
    lastRunAt: timestamp("lastRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("workflowSchedules_task_uid_idx").on(table.scheduleCronTaskUid)]
);

export const workflowRuns = mysqlTable(
  "workflowRuns",
  {
    id: int("id").autoincrement().primaryKey(),
    scheduleId: int("scheduleId").notNull(),
    userId: int("userId").notNull(),
    triggerType: varchar("triggerType", { length: 32 }).notNull().default("schedule"),
    status: workflowRunStatusEnum.notNull().default("running"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    statistics: json("statistics").$type<Record<string, number>>(),
    summary: text("summary"),
    error: text("error"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("workflowRuns_schedule_started_idx").on(table.scheduleId, table.startedAt)]
);

export const dailyReports = mysqlTable(
  "dailyReports",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    workflowRunId: int("workflowRunId").notNull().unique(),
    reportDate: varchar("reportDate", { length: 10 }).notNull(),
    language: varchar("language", { length: 5 }).notNull().default("en"),
    content: text("content").notNull(),
    contentEnglish: text("contentEnglish"),
    contentHindi: text("contentHindi"),
    statistics: json("statistics").$type<Record<string, number>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("dailyReports_user_date_idx").on(table.userId, table.reportDate)]
);
