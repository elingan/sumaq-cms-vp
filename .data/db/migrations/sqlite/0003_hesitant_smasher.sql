ALTER TABLE `rooms` RENAME TO `location_rooms`;--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_team_members_team_id` ON `team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX `idx_team_members_user_id` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_team_members_team_user` ON `team_members` (`team_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_teams_name` ON `teams` (`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_location_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_location_rooms`("id", "location_id", "name", "created_at", "updated_at") SELECT "id", "location_id", "name", "created_at", "updated_at" FROM `location_rooms`;--> statement-breakpoint
DROP TABLE `location_rooms`;--> statement-breakpoint
ALTER TABLE `__new_location_rooms` RENAME TO `location_rooms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_location_rooms_location_id` ON `location_rooms` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_location_rooms_location_name` ON `location_rooms` (`location_id`,`name`);--> statement-breakpoint
CREATE TABLE `__new_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`is_recurring` integer DEFAULT false NOT NULL,
	`day_of_week` integer,
	`title` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `location_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_bookings`("id", "room_id", "user_id", "start_time", "end_time", "is_recurring", "day_of_week", "title", "created_at", "updated_at") SELECT "id", "room_id", "user_id", "start_time", "end_time", "is_recurring", "day_of_week", "title", "created_at", "updated_at" FROM `bookings`;--> statement-breakpoint
DROP TABLE `bookings`;--> statement-breakpoint
ALTER TABLE `__new_bookings` RENAME TO `bookings`;--> statement-breakpoint
CREATE INDEX `idx_bookings_room_time` ON `bookings` (`room_id`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `idx_bookings_user_created_at` ON `bookings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_bookings_recurring_day` ON `bookings` (`is_recurring`,`day_of_week`);