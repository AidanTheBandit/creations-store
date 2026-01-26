CREATE TABLE `creation_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creation_id`) REFERENCES `creations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_creation_idx` ON `creation_reviews` (`creation_id`);--> statement-breakpoint
CREATE INDEX `reviews_user_idx` ON `creation_reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `reviews_creation_user_idx` ON `creation_reviews` (`creation_id`,`user_id`);