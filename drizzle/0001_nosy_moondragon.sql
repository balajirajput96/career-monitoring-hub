CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`applicationStatus` enum('found','shortlisted','approval_pending','applied','rejected','follow_up','closed') NOT NULL DEFAULT 'found',
	`resumeVersion` varchar(180),
	`coverNoteDraft` text,
	`coverNoteLanguage` varchar(5) NOT NULL DEFAULT 'en',
	`externalReference` varchar(300),
	`submittedAt` timestamp,
	`followUpAt` timestamp,
	`lastActionAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `applications_user_job_unique` UNIQUE(`userId`,`jobId`)
);
--> statement-breakpoint
CREATE TABLE `approvalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int,
	`applicationId` int,
	`approvalAction` enum('application_submit','message_send','post_publish') NOT NULL,
	`approvalStatus` enum('pending','approved','declined','executed','expired') NOT NULL DEFAULT 'pending',
	`payload` json NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	`executedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approvalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidateProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`headline` varchar(255) NOT NULL DEFAULT 'Career profile',
	`yearsExperience` int NOT NULL DEFAULT 0,
	`skills` json NOT NULL,
	`certifications` json NOT NULL,
	`preferredRoles` json NOT NULL,
	`preferredLocations` json NOT NULL,
	`preferredTracks` json NOT NULL,
	`resumeVersions` json NOT NULL,
	`summary` text,
	`outputLanguage` varchar(5) NOT NULL DEFAULT 'en',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidateProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidateProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `dailyReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workflowRunId` int NOT NULL,
	`reportDate` varchar(10) NOT NULL,
	`language` varchar(5) NOT NULL DEFAULT 'en',
	`content` text NOT NULL,
	`statistics` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyReports_workflowRunId_unique` UNIQUE(`workflowRunId`)
);
--> statement-breakpoint
CREATE TABLE `jobListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceId` int,
	`externalKey` varchar(500) NOT NULL,
	`jobTrack` enum('pharma_qa','ai_automation') NOT NULL,
	`title` varchar(300) NOT NULL,
	`company` varchar(300) NOT NULL,
	`location` varchar(300) NOT NULL,
	`workplaceType` varchar(64) NOT NULL DEFAULT 'unknown',
	`description` text,
	`sourceUrl` text NOT NULL,
	`applicationUrl` text,
	`postedAt` timestamp,
	`discoveredAt` timestamp NOT NULL DEFAULT (now()),
	`verificationStatus` enum('unverified','verified','stale','rejected') NOT NULL DEFAULT 'unverified',
	`eligibility` enum('eligible','review','ineligible') NOT NULL DEFAULT 'review',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobListings_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobListings_user_external_key_unique` UNIQUE(`userId`,`externalKey`)
);
--> statement-breakpoint
CREATE TABLE `jobMatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`overallScore` int NOT NULL,
	`skillsScore` int NOT NULL,
	`experienceScore` int NOT NULL,
	`locationScore` int NOT NULL,
	`eligibility` enum('eligible','review','ineligible') NOT NULL DEFAULT 'review',
	`rationale` text,
	`rationaleLanguage` varchar(5) NOT NULL DEFAULT 'en',
	`evidence` json,
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobMatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobMatches_user_job_unique` UNIQUE(`userId`,`jobId`)
);
--> statement-breakpoint
CREATE TABLE `jobSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`jobSourceType` enum('greenhouse','lever','company_careers','manual_url','rss') NOT NULL,
	`jobTrack` enum('pharma_qa','ai_automation') NOT NULL,
	`endpointUrl` text NOT NULL,
	`config` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastFetchedAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recruiterContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`applicationId` int,
	`jobId` int,
	`name` varchar(255) NOT NULL,
	`company` varchar(300),
	`role` varchar(255),
	`email` varchar(320),
	`linkedInUrl` text,
	`responseStatus` varchar(64) NOT NULL DEFAULT 'discovered',
	`lastContactAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruiterContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`userId` int NOT NULL,
	`triggerType` varchar(32) NOT NULL DEFAULT 'schedule',
	`workflowRunStatus` enum('running','completed','completed_with_warnings','failed','skipped') NOT NULL DEFAULT 'running',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`statistics` json,
	`summary` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflowRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 30 3 * * *',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`scheduleCronTaskUid` varchar(65),
	`isEnabled` boolean NOT NULL DEFAULT false,
	`language` varchar(5) NOT NULL DEFAULT 'en',
	`highPriorityThreshold` int NOT NULL DEFAULT 80,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `workflowSchedules_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `applications_user_status_idx` ON `applications` (`userId`,`applicationStatus`);--> statement-breakpoint
CREATE INDEX `approvalRequests_user_status_idx` ON `approvalRequests` (`userId`,`approvalStatus`);--> statement-breakpoint
CREATE INDEX `candidateProfiles_user_idx` ON `candidateProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `dailyReports_user_date_idx` ON `dailyReports` (`userId`,`reportDate`);--> statement-breakpoint
CREATE INDEX `jobListings_user_track_discovered_idx` ON `jobListings` (`userId`,`jobTrack`,`discoveredAt`);--> statement-breakpoint
CREATE INDEX `jobListings_source_idx` ON `jobListings` (`sourceId`);--> statement-breakpoint
CREATE INDEX `jobMatches_user_score_idx` ON `jobMatches` (`userId`,`overallScore`);--> statement-breakpoint
CREATE INDEX `jobSources_user_active_idx` ON `jobSources` (`userId`,`isActive`);--> statement-breakpoint
CREATE INDEX `recruiterContacts_user_status_idx` ON `recruiterContacts` (`userId`,`responseStatus`);--> statement-breakpoint
CREATE INDEX `workflowRuns_schedule_started_idx` ON `workflowRuns` (`scheduleId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `workflowSchedules_task_uid_idx` ON `workflowSchedules` (`scheduleCronTaskUid`);