-- Add isAdmin column to users table
ALTER TABLE `users` ADD COLUMN `is_admin` integer DEFAULT false NOT NULL;
