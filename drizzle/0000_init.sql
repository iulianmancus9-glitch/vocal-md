CREATE TYPE "public"."email_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('lyrics', 'render', 'deliver', 'cleanup');--> statement-breakpoint
CREATE TYPE "public"."lyrics_source" AS ENUM('ai', 'ai_regen', 'user_edit', 'user_provided');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'lyrics_pending', 'lyrics_ready', 'rendering', 'preview_ready', 'paid', 'delivered', 'failed', 'refused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'refunded', 'partially_refunded', 'failed', 'disputed', 'canceled');--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"to_email" text NOT NULL,
	"template" text NOT NULL,
	"subject" text,
	"provider_message_id" text,
	"status" "email_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "job_type" NOT NULL,
	"order_id" uuid,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lyrics_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"source" "lyrics_source" NOT NULL,
	"title" text,
	"lyrics" text NOT NULL,
	"style_hint" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant" smallint NOT NULL,
	"suno_audio_id" text,
	"full_path" text,
	"preview_path" text,
	"full_bytes" bigint,
	"preview_bytes" bigint,
	"duration_seconds" real,
	"source_url" text,
	"source_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"access_token" text NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"locale" text DEFAULT 'ro' NOT NULL,
	"email" text,
	"newsletter_opt_in" boolean DEFAULT false NOT NULL,
	"style_id" text,
	"direction" text,
	"mood" text,
	"voice" text,
	"recipient" text,
	"recipient_other" text,
	"names" text[] DEFAULT '{}'::text[] NOT NULL,
	"occasion" text,
	"occasion_other" text,
	"lyrics_mode" text DEFAULT 'ai' NOT NULL,
	"title_wanted" text,
	"story" text,
	"language" text DEFAULT 'Română' NOT NULL,
	"song_title" text,
	"lyrics" text,
	"style_string" text,
	"lyrics_version" integer DEFAULT 0 NOT NULL,
	"regens_left" integer DEFAULT 2 NOT NULL,
	"suno_task_id" text,
	"suno_model" text,
	"terms_accepted_at" timestamp with time zone,
	"withdrawal_waived_at" timestamp with time zone,
	"legal_version" text,
	"consent_ip" text,
	"consent_user_agent" text,
	"failure_code" text,
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lyrics_ready_at" timestamp with time zone,
	"preview_ready_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text DEFAULT 'paddle' NOT NULL,
	"transaction_id" text NOT NULL,
	"customer_id" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"invoice_number" text,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"bucket" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lyrics_versions" ADD CONSTRAINT "lyrics_versions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tracks" ADD CONSTRAINT "order_tracks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_order_idx" ON "emails" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "emails_to_idx" ON "emails" USING btree ("to_email");--> statement-breakpoint
CREATE INDEX "jobs_pickup_idx" ON "jobs" USING btree ("run_after") WHERE "jobs"."status" = 'queued';--> statement-breakpoint
CREATE INDEX "jobs_order_idx" ON "jobs" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_active_key" ON "jobs" USING btree ("order_id","type") WHERE "jobs"."status" in ('queued', 'running');--> statement-breakpoint
CREATE UNIQUE INDEX "lyrics_versions_order_version_key" ON "lyrics_versions" USING btree ("order_id","version");--> statement-breakpoint
CREATE INDEX "lyrics_versions_order_idx" ON "lyrics_versions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_tracks_order_variant_key" ON "order_tracks" USING btree ("order_id","variant");--> statement-breakpoint
CREATE INDEX "order_tracks_order_idx" ON "order_tracks" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_public_id_key" ON "orders" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree ("email");--> statement-breakpoint
CREATE INDEX "orders_expires_at_idx" ON "orders" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_suno_task_id_key" ON "orders" USING btree ("suno_task_id") WHERE "orders"."suno_task_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_transaction_key" ON "payments" USING btree ("provider","transaction_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rate_limits_expires_idx" ON "rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_key" ON "webhook_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_unprocessed_idx" ON "webhook_events" USING btree ("received_at") WHERE "webhook_events"."processed_at" is null;