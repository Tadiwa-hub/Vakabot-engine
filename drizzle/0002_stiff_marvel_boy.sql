CREATE TABLE `chat_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`customer_jid` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`customer_jid` text NOT NULL,
	`paused_until` text,
	`last_human_interaction_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `groq_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`date` text NOT NULL,
	`minute_timestamp` text NOT NULL,
	`requests_count` integer DEFAULT 0,
	`tokens_count` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `instance_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`instance_id` text NOT NULL,
	`date` text NOT NULL,
	`hour` text NOT NULL,
	`message_count` integer DEFAULT 0,
	FOREIGN KEY (`instance_id`) REFERENCES `instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price_usd` integer NOT NULL,
	`ai_responses_limit` integer NOT NULL,
	`whatsapp_numbers_limit` integer NOT NULL,
	`keywords_limit` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL,
	`paynow_reference` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD',
	`reference` text,
	`method` text,
	`poll_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `instances` ADD `pairing_code` text;
--> statement-breakpoint
ALTER TABLE `instances` ADD `is_group_enabled` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `business_name` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `business_type` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `location` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `hours` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `owner_name` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `ai_instructions` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `ai_usage_count` integer DEFAULT 0;
--> statement-breakpoint
CREATE INDEX `instances_user_id_idx` ON `instances` (`user_id`);
--> statement-breakpoint
CREATE INDEX `instances_status_idx` ON `instances` (`status`);
--> statement-breakpoint
CREATE INDEX `payments_user_id_idx` ON `payments` (`user_id`);
--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);
--> statement-breakpoint
CREATE INDEX `chat_history_user_id_idx` ON `chat_history` (`user_id`);
--> statement-breakpoint
CREATE INDEX `chat_history_customer_jid_idx` ON `chat_history` (`customer_jid`);