CREATE TABLE `booking_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`exception_date` text NOT NULL,
	`status` text DEFAULT 'released' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_booking_exceptions_booking_date` ON `booking_exceptions` (`booking_id`,`exception_date`);--> statement-breakpoint
CREATE INDEX `idx_booking_exceptions_status` ON `booking_exceptions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_booking_exception_booking_date` ON `booking_exceptions` (`booking_id`,`exception_date`);--> statement-breakpoint
CREATE TABLE `bookings` (
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
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_room_time` ON `bookings` (`room_id`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `idx_bookings_user_created_at` ON `bookings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_bookings_recurring_day` ON `bookings` (`is_recurring`,`day_of_week`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_name_unique` ON `locations` (`name`);--> statement-breakpoint
CREATE INDEX `idx_locations_name` ON `locations` (`name`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_rooms_location_id` ON `rooms` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_rooms_location_name` ON `rooms` (`location_id`,`name`);