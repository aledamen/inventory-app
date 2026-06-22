CREATE TABLE "capital_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'aporte' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"notes" text,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"tabla" text NOT NULL,
	"accion" text NOT NULL,
	"registro_id" integer,
	"datos_anteriores" jsonb,
	"datos_nuevos" jsonb,
	"fecha" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_uses" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"sale_id" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"original_amount" numeric(10, 2) NOT NULL,
	"discount_applied" numeric(10, 2) NOT NULL,
	"final_amount" numeric(10, 2) NOT NULL,
	"client_name" text,
	"client_phone" text,
	"used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"discount_type" text DEFAULT 'percentage' NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_order_amount" numeric(10, 2),
	"max_uses" integer,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"influencer_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "influencers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"social_network_id" integer,
	"social_username" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_networks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "social_networks_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "coupon_id" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "discount_applied" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "shipping_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "returns" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_influencer_id_influencers_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_social_network_id_social_networks_id_fk" FOREIGN KEY ("social_network_id") REFERENCES "public"."social_networks"("id") ON DELETE set null ON UPDATE no action;