CREATE TABLE `creem_processed_webhooks` (
	`webhook_id` text(512) PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (STRFTIME('%s', 'now') * 1000) NOT NULL
);
