CREATE TABLE `message_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`instance_name` text NOT NULL,
	`remote_jid` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0,
	`max_retries` integer DEFAULT 5,
	`last_retry_at` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `message_queue_status_idx` ON `message_queue` (`status`);
--> statement-breakpoint
CREATE INDEX `message_queue_user_id_idx` ON `message_queue` (`user_id`);
--> statement-breakpoint
CREATE INDEX `message_queue_created_at_idx` ON `message_queue` (`created_at`);
