CREATE TABLE `recruiterEmailEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`threadId` varchar(255),
	`sender` varchar(320) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`receivedAt` timestamp,
	`snippet` text,
	`matchedContactId` int,
	`reviewStatus` varchar(32) NOT NULL DEFAULT 'unreviewed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recruiterEmailEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `recruiterEmailEvents_user_message_unique` UNIQUE(`userId`,`messageId`)
);
--> statement-breakpoint
CREATE INDEX `recruiterEmailEvents_user_review_idx` ON `recruiterEmailEvents` (`userId`,`reviewStatus`);