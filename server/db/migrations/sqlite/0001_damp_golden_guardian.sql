DROP TABLE `location_members`;--> statement-breakpoint
DROP TABLE `room_members`;--> statement-breakpoint
DROP TABLE `user_members`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`github_data` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password", "name", "role", "github_data", "created_at", "updated_at") SELECT "id", "email", "password", "name", "role", "github_data", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `locations` ADD `owner_id` text NOT NULL REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `idx_locations_owner_id` ON `locations` (`owner_id`);