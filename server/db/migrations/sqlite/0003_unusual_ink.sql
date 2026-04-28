CREATE TABLE `user_members` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`user_id` text NOT NULL,
	`member_id` text,
	`invited_email` text NOT NULL,
	`invitation_id` text,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by` text,
	`accepted_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_members_invitation_id_unique` ON `user_members` (`invitation_id`);--> statement-breakpoint
CREATE INDEX `idx_user_members_location_id` ON `user_members` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_user_members_user_id` ON `user_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_members_member_id` ON `user_members` (`member_id`);--> statement-breakpoint
CREATE INDEX `idx_user_members_location_status` ON `user_members` (`location_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_user_members_location_email` ON `user_members` (`location_id`,`invited_email`);