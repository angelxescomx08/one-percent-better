CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"user_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"value" numeric NOT NULL,
	"note" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "unit_category_name_unique" UNIQUE("category_id","name")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_access" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"has_lifetime_access" boolean NOT NULL,
	"trial_ends_at" timestamp NOT NULL,
	"stripe_customer_id" text,
	"stripe_payment_intent_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"subscription_current_period_end" timestamp,
	"subscription_current_period_start" timestamp,
	"subscription_cancel_at_period_end" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_access_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_access_stripe_customer_idx" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "user_activity_unique" UNIQUE("user_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_category_id_idx" ON "activity" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "activity_unit_id_idx" ON "activity" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "activity_name_idx" ON "activity" USING btree ("name");--> statement-breakpoint
CREATE INDEX "activity_description_idx" ON "activity" USING btree ("description");--> statement-breakpoint
CREATE INDEX "activity_log_user_date_idx" ON "activity_log" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "activity_log_activity_date_idx" ON "activity_log" USING btree ("activity_id","date");--> statement-breakpoint
CREATE INDEX "activity_log_user_activity_date_idx" ON "activity_log" USING btree ("user_id","activity_id","date");--> statement-breakpoint
CREATE INDEX "category_name_idx" ON "category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "unit_category_id_idx" ON "unit" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "unit_name_idx" ON "unit" USING btree ("name");--> statement-breakpoint
CREATE INDEX "unit_short_name_idx" ON "unit" USING btree ("short_name");--> statement-breakpoint
CREATE INDEX "unit_short_name_category_id_idx" ON "unit" USING btree ("short_name","category_id");--> statement-breakpoint
CREATE INDEX "user_access_trial_expiration_idx" ON "user_access" USING btree ("has_lifetime_access","trial_ends_at");--> statement-breakpoint
CREATE INDEX "user_access_payment_intent_idx" ON "user_access" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "user_access_lifetime_status_idx" ON "user_access" USING btree ("has_lifetime_access");--> statement-breakpoint
CREATE INDEX "user_access_subscription_status_idx" ON "user_access" USING btree ("subscription_status");--> statement-breakpoint
CREATE INDEX "user_activity_user_idx" ON "user_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_activity_activity_idx" ON "user_activity" USING btree ("activity_id");