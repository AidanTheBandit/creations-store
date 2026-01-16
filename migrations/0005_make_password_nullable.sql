-- Recreate users table with nullable password
CREATE TABLE `users_new` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`password` text,
	`bio` text,
	`avatar` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Copy existing data
INSERT INTO users_new (id, email, name, password, bio, avatar, created_at, updated_at)
SELECT id, email, name, password, bio, avatar, created_at, updated_at FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS `users_email_idx` ON `users` (`email`);
