-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`bio` text,
	`avatar` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	`session_token` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Add new columns to bookmarks table
ALTER TABLE `bookmarks` ADD COLUMN `user_id` text REFERENCES users(id);
ALTER TABLE `bookmarks` ADD COLUMN `status` text DEFAULT 'draft' NOT NULL;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS `sessions_session_token_unique` ON `sessions` (`session_token`);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
CREATE INDEX IF NOT EXISTS `users_email_idx` ON `users` (`email`);
CREATE INDEX IF NOT EXISTS `bookmarks_user_idx` ON `bookmarks` (`user_id`);
CREATE INDEX IF NOT EXISTS `bookmarks_status_idx` ON `bookmarks` (`status`);
