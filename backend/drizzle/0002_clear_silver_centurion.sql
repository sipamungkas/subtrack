CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "subscription_limit" SET DEFAULT 10;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "newsletter_enabled" boolean DEFAULT true NOT NULL;