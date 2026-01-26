CREATE TABLE `creation_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`user_agent` text,
	`referrer` text,
	`clicked_at` integer NOT NULL,
	FOREIGN KEY (`creation_id`) REFERENCES `creations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `clicks_creation_idx` ON `creation_clicks` (`creation_id`);--> statement-breakpoint
CREATE INDEX `clicks_session_idx` ON `creation_clicks` (`session_id`);--> statement-breakpoint
CREATE INDEX `clicks_creation_session_idx` ON `creation_clicks` (`creation_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `clicks_clicked_at_idx` ON `creation_clicks` (`clicked_at`);--> statement-breakpoint
CREATE TABLE `creation_daily_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_id` integer NOT NULL,
	`date` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`unique_clicks` integer DEFAULT 0 NOT NULL,
	`installs` integer DEFAULT 0 NOT NULL,
	`active_users` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`creation_id`) REFERENCES `creations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_stats_creation_idx` ON `creation_daily_stats` (`creation_id`);--> statement-breakpoint
CREATE INDEX `daily_stats_date_idx` ON `creation_daily_stats` (`date`);--> statement-breakpoint
CREATE INDEX `daily_stats_creation_date_idx` ON `creation_daily_stats` (`creation_id`,`date`);--> statement-breakpoint
CREATE TABLE `creation_installs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`user_agent` text,
	`installed_at` integer NOT NULL,
	FOREIGN KEY (`creation_id`) REFERENCES `creations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `installs_creation_idx` ON `creation_installs` (`creation_id`);--> statement-breakpoint
CREATE INDEX `installs_session_idx` ON `creation_installs` (`session_id`);--> statement-breakpoint
CREATE INDEX `installs_creation_session_idx` ON `creation_installs` (`creation_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `installs_installed_at_idx` ON `creation_installs` (`installed_at`);--> statement-breakpoint
ALTER TABLE `creations` ADD `proxy_code` text;--> statement-breakpoint
ALTER TABLE `creations` ADD `is_flagged` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `creations` ADD `flag_reason` text;--> statement-breakpoint
CREATE UNIQUE INDEX `creations_proxy_code_unique` ON `creations` (`proxy_code`);--> statement-breakpoint
CREATE INDEX `creations_proxy_code_idx` ON `creations` (`proxy_code`);