PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_locations`("id", "name", "address", "created_at", "updated_at") SELECT "id", "name", "address", "created_at", "updated_at" FROM `locations`;--> statement-breakpoint
DROP TABLE `locations`;--> statement-breakpoint
ALTER TABLE `__new_locations` RENAME TO `locations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `locations_name_unique` ON `locations` (`name`);--> statement-breakpoint
CREATE INDEX `idx_locations_name` ON `locations` (`name`);