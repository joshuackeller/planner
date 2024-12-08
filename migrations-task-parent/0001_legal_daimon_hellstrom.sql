ALTER TABLE `task` ALTER COLUMN "complete" TO "complete" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `task` ALTER COLUMN "sort_order" TO "sort_order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `task` ALTER COLUMN "period" TO "period" text NOT NULL;--> statement-breakpoint
ALTER TABLE `task` ALTER COLUMN "date" TO "date" text NOT NULL;