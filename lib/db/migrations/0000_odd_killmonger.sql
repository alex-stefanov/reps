CREATE TYPE "public"."intensity" AS ENUM('chill', 'steady', 'grind');--> statement-breakpoint
CREATE TYPE "public"."standing_type" AS ENUM('commit', 'gym');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'done');--> statement-breakpoint
CREATE TYPE "public"."track" AS ENUM('byox', 'project', 'leetcode', 'linkedin');--> statement-breakpoint
CREATE TABLE "commit_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"commit_found" boolean NOT NULL,
	"commit_ref" text,
	"checked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_completions" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"tasks_done" integer DEFAULT 0 NOT NULL,
	"tasks_total" integer DEFAULT 0 NOT NULL,
	"contribution_level" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "day_completions_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"hours" real,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hours_per_week" integer NOT NULL,
	"intensity" "intensity" NOT NULL,
	"start_date" date NOT NULL,
	"weeks" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"date" date NOT NULL,
	"week_index" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "schedule_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_day_id" uuid NOT NULL,
	"track" "track" NOT NULL,
	"label" text NOT NULL,
	"hours" real NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"done_at" timestamp with time zone,
	"idea_id" uuid
);
--> statement-breakpoint
CREATE TABLE "standing_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "standing_type" NOT NULL,
	"date" date NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verification_source" text,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" text NOT NULL,
	"github_handle" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"leetcode_on" boolean DEFAULT true NOT NULL,
	"gym_on" boolean DEFAULT true NOT NULL,
	"daily_commit_on" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "commit_verifications" ADD CONSTRAINT "commit_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_completions" ADD CONSTRAINT "day_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_tasks" ADD CONSTRAINT "schedule_tasks_schedule_day_id_schedule_days_id_fk" FOREIGN KEY ("schedule_day_id") REFERENCES "public"."schedule_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_tasks" ADD CONSTRAINT "schedule_tasks_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standing_tasks" ADD CONSTRAINT "standing_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commit_verifications_user_date" ON "commit_verifications" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_days_program_date" ON "schedule_days" USING btree ("program_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "standing_tasks_user_type_date" ON "standing_tasks" USING btree ("user_id","type","date");