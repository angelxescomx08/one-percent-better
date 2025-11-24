CREATE TABLE "user_access" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"has_lifetime_access" boolean NOT NULL,
	"trial_ends_at" timestamp NOT NULL,
	"stripe_customer_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_access_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_access_stripe_customer_idx" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_access_trial_expiration_idx" ON "user_access" USING btree ("has_lifetime_access","trial_ends_at");--> statement-breakpoint
CREATE INDEX "user_access_payment_intent_idx" ON "user_access" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "user_access_lifetime_status_idx" ON "user_access" USING btree ("has_lifetime_access");