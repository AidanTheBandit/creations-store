-- Step 1: Create creations table with new fields
CREATE TABLE `creations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL UNIQUE,
	`title` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`description` text,
	`category_id` text,
	`tags` text,
	`user_id` text,
	`status` text NOT NULL DEFAULT 'draft',
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
	`is_archived` integer DEFAULT 0 NOT NULL,
	`is_favorite` integer DEFAULT 0 NOT NULL,
	`search_results` text,
	`views` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

-- Step 2: Copy existing data from bookmarks to creations
INSERT INTO creations (
	id, url, title, slug, description, category_id, tags, user_id, status,
	favicon, screenshot, overview, og_image, og_title, og_description,
	created_at, updated_at, last_visited, notes, is_archived, is_favorite,
	search_results, views
)
SELECT
	id, url, title, slug, description, category_id, tags, user_id, status,
	favicon, screenshot, overview, og_image, og_title, og_description,
	created_at, updated_at, last_visited, notes, is_archived, is_favorite,
	search_results, views
FROM bookmarks;

-- Step 3: Migrate favicon to iconUrl and screenshot to screenshotUrl for existing data
UPDATE creations SET icon_url = favicon WHERE favicon IS NOT NULL;
UPDATE creations SET screenshot_url = screenshot WHERE screenshot IS NOT NULL;

-- Step 4: Create indexes for creations
CREATE INDEX IF NOT EXISTS `creations_user_idx` ON `creations` (`user_id`);
CREATE INDEX IF NOT EXISTS `creations_status_idx` ON `creations` (`status`);
CREATE INDEX IF NOT EXISTS `creations_views_idx` ON `creations` (`views`);

-- Step 5: Create creation_screenshots table
CREATE TABLE `creation_screenshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_id` integer NOT NULL,
	`url` text NOT NULL,
	`is_main` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creation_id`) REFERENCES `creations`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Step 6: Create indexes for creation_screenshots
CREATE INDEX IF NOT EXISTS `screenshots_creation_idx` ON `creation_screenshots` (`creation_id`);
CREATE INDEX IF NOT EXISTS `screenshots_is_main_idx` ON `creation_screenshots` (`is_main`);

-- Step 7: Migrate existing screenshots to creation_screenshots table
INSERT INTO creation_screenshots (creation_id, url, is_main, created_at)
SELECT id, screenshot_url, 1, created_at
FROM creations
WHERE screenshot_url IS NOT NULL;
