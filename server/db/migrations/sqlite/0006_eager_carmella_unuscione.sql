CREATE TABLE `onboarding_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`content` text DEFAULT '{}' NOT NULL,
	`completed_sections` text DEFAULT '[]' NOT NULL,
	`is_complete` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_responses_user_id_unique` ON `onboarding_responses` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_responses_user_id` ON `onboarding_responses` (`user_id`);