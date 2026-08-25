CREATE TABLE `reelProductionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reelNumber` int NOT NULL,
	`batchNumber` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`category` varchar(120) NOT NULL,
	`topicKey` varchar(255) NOT NULL,
	`claimSlug` varchar(255),
	`productionStatus` enum('queued','researching','producing','qc_passed','delivered','blocked') NOT NULL DEFAULT 'queued',
	`evidenceStatus` enum('unverified','verified','needs_review') NOT NULL DEFAULT 'unverified',
	`driveFolderId` varchar(128),
	`driveVideoFileId` varchar(128),
	`deliveryVerified` boolean NOT NULL DEFAULT false,
	`sourceMetadata` json,
	`qcMetadata` json,
	`blocker` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reelProductionItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `reelProductionItems_user_number_unique` UNIQUE(`userId`,`reelNumber`),
	CONSTRAINT `reelProductionItems_user_topic_unique` UNIQUE(`userId`,`topicKey`)
);
--> statement-breakpoint
CREATE TABLE `reelProductionRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetReelNumber` int NOT NULL,
	`triggerType` varchar(32) NOT NULL DEFAULT 'manual',
	`workflowRunStatus` enum('running','completed','completed_with_warnings','failed','skipped') NOT NULL DEFAULT 'running',
	`summary` text,
	`error` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reelProductionRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reelProductionSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`driveRootFolderId` varchar(128),
	`activeBatchNumber` int NOT NULL DEFAULT 1,
	`nextReelNumber` int NOT NULL DEFAULT 1,
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 0 4 * * *',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`isEnabled` boolean NOT NULL DEFAULT false,
	`lastRunAt` timestamp,
	`lastDeliveryVerifiedAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reelProductionSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `reelProductionSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `reelProductionItems_user_status_idx` ON `reelProductionItems` (`userId`,`productionStatus`,`reelNumber`);--> statement-breakpoint
CREATE INDEX `reelProductionRuns_user_started_idx` ON `reelProductionRuns` (`userId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `reelProductionSettings_enabled_idx` ON `reelProductionSettings` (`isEnabled`);