-- Activity Logs Table
CREATE TABLE IF NOT EXISTS `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`instance_id` text,
	`event` text NOT NULL,
	`details` text,
	`level` text DEFAULT 'info' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instance_id`) REFERENCES `instances`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX IF NOT EXISTS `activity_logs_user_id_idx` ON `activity_logs` (`user_id`);
CREATE INDEX IF NOT EXISTS `activity_logs_instance_id_idx` ON `activity_logs` (`instance_id`);

-- Contacts Table
CREATE TABLE IF NOT EXISTS `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`jid` text NOT NULL,
	`name` text,
	`phone_number` text,
	`last_interaction_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX IF NOT EXISTS `contacts_user_id_idx` ON `contacts` (`user_id`);
CREATE INDEX IF NOT EXISTS `contacts_jid_idx` ON `contacts` (`jid`);

-- Scheduled Messages Table
CREATE TABLE IF NOT EXISTS `scheduled_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`instance_id` text NOT NULL,
	`remote_jid` text NOT NULL,
	`message` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instance_id`) REFERENCES `instances`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX IF NOT EXISTS `scheduled_messages_user_id_idx` ON `scheduled_messages` (`user_id`);
CREATE INDEX IF NOT EXISTS `scheduled_messages_instance_id_idx` ON `scheduled_messages` (`instance_id`);
CREATE INDEX IF NOT EXISTS `scheduled_messages_status_idx` ON `scheduled_messages` (`status`);
