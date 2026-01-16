ALTER TABLE `bookmarks` ADD `views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `bookmarks_views_idx` ON `bookmarks` (`views`);