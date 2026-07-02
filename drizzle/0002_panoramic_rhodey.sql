CREATE TABLE "influencer_compensation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"influencer_id" integer NOT NULL,
	"trigger" text NOT NULL,
	"trigger_value" numeric(10, 2),
	"reward_product_id" integer,
	"reward_quantity" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "influencer_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"influencer_id" integer NOT NULL,
	"delivery_date" date NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"trigger_ref" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "influencer_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"influencer_id" integer NOT NULL,
	"post_date" date NOT NULL,
	"social_network_id" integer,
	"content_type" text DEFAULT 'post' NOT NULL,
	"url" text,
	"notes" text,
	"compensated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "capital_movements" ADD COLUMN "payment_method_id" integer;--> statement-breakpoint
ALTER TABLE "influencer_compensation_rules" ADD CONSTRAINT "influencer_compensation_rules_influencer_id_influencers_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influencer_deliveries" ADD CONSTRAINT "influencer_deliveries_influencer_id_influencers_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influencer_posts" ADD CONSTRAINT "influencer_posts_influencer_id_influencers_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influencer_posts" ADD CONSTRAINT "influencer_posts_social_network_id_social_networks_id_fk" FOREIGN KEY ("social_network_id") REFERENCES "public"."social_networks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_movements" ADD CONSTRAINT "capital_movements_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;