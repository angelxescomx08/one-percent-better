ALTER TABLE "activity" DROP CONSTRAINT "activity_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "activity_user_id_idx";--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_category_id_idx" ON "activity" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "activity_unit_id_idx" ON "activity" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "activity_name_idx" ON "activity" USING btree ("name");--> statement-breakpoint
CREATE INDEX "activity_description_idx" ON "activity" USING btree ("description");--> statement-breakpoint
CREATE INDEX "category_name_idx" ON "category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "unit_category_id_idx" ON "unit" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "unit_name_idx" ON "unit" USING btree ("name");--> statement-breakpoint
CREATE INDEX "unit_short_name_idx" ON "unit" USING btree ("short_name");--> statement-breakpoint
CREATE INDEX "unit_short_name_category_id_idx" ON "unit" USING btree ("short_name","category_id");--> statement-breakpoint
ALTER TABLE "activity" DROP COLUMN "user_id";