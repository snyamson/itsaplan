CREATE TABLE "workspace_email_domain" (
	"workspace_id" integer NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_email_domain_workspace_id_domain_pk" PRIMARY KEY("workspace_id","domain")
);
--> statement-breakpoint
ALTER TABLE "workspace_email_domain" ADD CONSTRAINT "workspace_email_domain_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_email_domain_domain_idx" ON "workspace_email_domain" USING btree ("domain");