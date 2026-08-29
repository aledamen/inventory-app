CREATE TABLE "curated_picks" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"headline" text NOT NULL,
	"description" text,
	"combo_sku" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
