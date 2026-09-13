-- Trecerea la mai multe înregistrări per comandă.
--
-- Pe server există deja comenzi cu piese, deci nu e de ajuns să adăugăm coloane:
-- fiecare comandă cântată primește o înregistrare „generația 1", iar piesele ei
-- se leagă de ea. Ordinea contează — coloana se adaugă liberă, se umple, și abia
-- pe urmă devine obligatorie.

CREATE TYPE "public"."render_status" AS ENUM('pending', 'running', 'done', 'failed');--> statement-breakpoint

CREATE TABLE "renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"lyrics_version" integer NOT NULL,
	"suno_task_id" text,
	"suno_model" text,
	"style_string" text,
	"status" "render_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "renders" ADD CONSTRAINT "renders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "renders_order_generation_key" ON "renders" USING btree ("order_id","generation");--> statement-breakpoint
CREATE UNIQUE INDEX "renders_suno_task_key" ON "renders" USING btree ("suno_task_id") WHERE "renders"."suno_task_id" is not null;--> statement-breakpoint
CREATE INDEX "renders_order_idx" ON "renders" USING btree ("order_id");--> statement-breakpoint

ALTER TABLE "orders" ADD COLUMN "renders_left" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "current_render_id" uuid;--> statement-breakpoint

-- liberă deocamdată: rândurile existente n-au ce pune în ea încă
ALTER TABLE "order_tracks" ADD COLUMN "render_id" uuid;--> statement-breakpoint

-- câte o înregistrare pentru fiecare comandă care a apucat să fie trimisă la Suno
INSERT INTO "renders" (
	"order_id", "generation", "lyrics_version", "suno_task_id", "suno_model",
	"style_string", "status", "created_at", "completed_at"
)
SELECT
	o."id",
	1,
	GREATEST(o."lyrics_version", 1),
	o."suno_task_id",
	o."suno_model",
	o."style_string",
	CASE
		WHEN EXISTS (SELECT 1 FROM "order_tracks" t WHERE t."order_id" = o."id")
		THEN 'done'::"public"."render_status"
		ELSE 'failed'::"public"."render_status"
	END,
	COALESCE(o."preview_ready_at", o."updated_at", o."created_at"),
	o."preview_ready_at"
FROM "orders" o
WHERE o."suno_task_id" IS NOT NULL
   OR EXISTS (SELECT 1 FROM "order_tracks" t WHERE t."order_id" = o."id");--> statement-breakpoint

UPDATE "order_tracks" t
   SET "render_id" = r."id"
  FROM "renders" r
 WHERE r."order_id" = t."order_id" AND r."generation" = 1;--> statement-breakpoint

UPDATE "orders" o
   SET "current_render_id" = r."id"
  FROM "renders" r
 WHERE r."order_id" = o."id" AND r."generation" = 1;--> statement-breakpoint

-- o piesă fără înregistrare n-ar avea cum să existe, dar dacă există e ruptă
DELETE FROM "order_tracks" WHERE "render_id" IS NULL;--> statement-breakpoint

ALTER TABLE "order_tracks" ALTER COLUMN "render_id" SET NOT NULL;--> statement-breakpoint

DROP INDEX "order_tracks_order_variant_key";--> statement-breakpoint
ALTER TABLE "order_tracks" ADD CONSTRAINT "order_tracks_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_tracks_render_variant_key" ON "order_tracks" USING btree ("render_id","variant");
