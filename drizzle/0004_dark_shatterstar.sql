-- jobSources.jobSourceType and jobSources.jobTrack were renamed in place
-- during the verified production contract repair before this generated file
-- was created. Do not repeat those non-idempotent statements here.
ALTER TABLE `jobListings` RENAME COLUMN `jobTrack` TO `track`;--> statement-breakpoint
DROP INDEX `jobListings_user_track_discovered_idx` ON `jobListings`;--> statement-breakpoint
CREATE INDEX `jobListings_user_track_discovered_idx` ON `jobListings` (`userId`,`track`,`discoveredAt`);
