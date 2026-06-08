ALTER TABLE `tree_configs` ADD `allow_non_leaf_answers` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tree_task_results` ADD `selected_link` text;