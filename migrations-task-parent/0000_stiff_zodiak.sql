CREATE TABLE `task` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`complete` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`period` text,
	`date` text
);
