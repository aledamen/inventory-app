CREATE TABLE "recontact_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"contacted_at" timestamp,
	"notes" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "contact_after_days" integer;--> statement-breakpoint
ALTER TABLE "recontact_actions" ADD CONSTRAINT "recontact_actions_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recontact_actions" ADD CONSTRAINT "recontact_actions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recontact_actions" ADD CONSTRAINT "recontact_actions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recontact_actions_sale_uq" ON "recontact_actions" USING btree ("sale_id");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;