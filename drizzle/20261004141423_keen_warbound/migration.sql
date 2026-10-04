-- Development reset approved before staging/production deployment.
-- Discard the old shared catalog and any expenses; preserve users unchanged.
-- Drop the child table first so foreign keys can remain enabled throughout.
DROP TABLE `expenses`;
--> statement-breakpoint
DROP TABLE `categories`;
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`archived_at` integer,
	CONSTRAINT `fk_categories_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `categories_user_id_id_unique` UNIQUE(`user_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text,
	`original_text` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_expenses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `expenses_user_category_fk` FOREIGN KEY (`user_id`,`category_id`) REFERENCES `categories`(`user_id`,`id`) ON DELETE RESTRICT,
	CONSTRAINT "expenses_amount_minor_check" CHECK(typeof("amount_minor") = 'integer' AND "amount_minor" > 0 AND "amount_minor" <= 9007199254740991),
	CONSTRAINT "expenses_currency_check" CHECK("currency" GLOB '[A-Z][A-Z][A-Z]')
);
--> statement-breakpoint
CREATE INDEX `categories_user_archived_at_idx` ON `categories` (`user_id`,`archived_at`);
--> statement-breakpoint
CREATE INDEX `expenses_user_occurred_at_idx` ON `expenses` (`user_id`,`occurred_at`);
