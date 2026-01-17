CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`slug` text NOT NULL,
	`color` text,
	`icon` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `creation_screenshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_id` integer NOT NULL,
	`url` text NOT NULL,
	`is_main` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creation_id`) REFERENCES `creations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `screenshots_creation_idx` ON `creation_screenshots` (`creation_id`);--> statement-breakpoint
CREATE INDEX `screenshots_is_main_idx` ON `creation_screenshots` (`is_main`);--> statement-breakpoint
CREATE TABLE `creation_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`viewed_at` integer NOT NULL,
	FOREIGN KEY (`creation_id`) REFERENCES `creations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `views_creation_session_idx` ON `creation_views` (`creation_id`,`session_id`);--> statement-breakpoint
CREATE TABLE `creations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`category_id` text,
	`tags` text,
	`user_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`icon_url` text,
	`theme_color` text,
	`author` text,
	`screenshot_url` text,
	`favicon` text,
	`screenshot` text,
	`overview` text,
	`og_image` text,
	`og_title` text,
	`og_description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_visited` integer,
	`notes` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`search_results` text,
	`views` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creations_url_unique` ON `creations` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `creations_slug_unique` ON `creations` (`slug`);--> statement-breakpoint
CREATE INDEX `creations_user_idx` ON `creations` (`user_id`);--> statement-breakpoint
CREATE INDEX `creations_status_idx` ON `creations` (`status`);--> statement-breakpoint
CREATE INDEX `creations_views_idx` ON `creations` (`views`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	`session_token` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`username` text,
	`password` text,
	`bio` text,
	`avatar` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`is_suspended` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);