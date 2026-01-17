-- Add isSuspended column to users table
ALTER TABLE `users` ADD COLUMN `is_suspended` integer DEFAULT 0 NOT NULL;
