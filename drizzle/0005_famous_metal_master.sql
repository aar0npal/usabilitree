ALTER TABLE `users` ADD `creem_customer_id` text(255);--> statement-breakpoint
ALTER TABLE `users` ADD `study_limit` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
UPDATE `users` SET `study_limit` = 7 WHERE `study_limit` = 3;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripe_subscription_id`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripe_price_id`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripe_customer_id`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripe_current_period_end`;
