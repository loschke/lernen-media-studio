CREATE TABLE "users" (
	"sub" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"credits" integer DEFAULT 250 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
