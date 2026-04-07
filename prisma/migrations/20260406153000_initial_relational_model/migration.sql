-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create enums
CREATE TYPE "role_code" AS ENUM ('ADMIN', 'TUTOR');
CREATE TYPE "schedule_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "attendance_status" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'JUSTIFIED');
CREATE TYPE "notification_type" AS ENUM ('SCHEDULE_CREATED', 'SCHEDULE_UPDATED', 'SCHEDULE_CANCELLED', 'SCHEDULE_REMINDER');
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- Create tables
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" "role_code" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "tutors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "department" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "capacity" INTEGER,
    "location" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tutor_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "schedule_status" NOT NULL DEFAULT 'SCHEDULED',
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "cancelled_by_user_id" UUID,
    "cancel_reason" VARCHAR(280),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "schedules_starts_before_ends" CHECK ("starts_at" < "ends_at")
);

CREATE TABLE "attendances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "student_email" CITEXT NOT NULL,
    "student_name" VARCHAR(120),
    "status" "attendance_status" NOT NULL DEFAULT 'PRESENT',
    "marked_by_user_id" UUID NOT NULL,
    "marked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "recipient_user_id" UUID,
    "recipient_email" CITEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "subject" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_user_id" UUID,
    "action" "audit_action" NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64),
    "metadata" JSONB,
    "ip" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "tutors_user_id_key" ON "tutors"("user_id");
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");
CREATE UNIQUE INDEX "uq_attendances_schedule_student_email" ON "attendances"("schedule_id", "student_email");

-- Create secondary indexes
CREATE INDEX "idx_user_roles_role_id" ON "user_roles"("role_id");
CREATE INDEX "idx_schedules_tutor_starts_at" ON "schedules"("tutor_id", "starts_at");
CREATE INDEX "idx_schedules_room_starts_at" ON "schedules"("room_id", "starts_at");
CREATE INDEX "idx_schedules_status_starts_at" ON "schedules"("status", "starts_at");
CREATE INDEX "idx_attendances_student_email" ON "attendances"("student_email");
CREATE INDEX "idx_notifications_status_created_at" ON "notifications"("status", "created_at");
CREATE INDEX "idx_notifications_recipient_email" ON "notifications"("recipient_email");
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "idx_audit_logs_actor_created_at" ON "audit_logs"("actor_user_id", "created_at");

-- Add business constraints
ALTER TABLE "users"
    ADD CONSTRAINT "users_email_institutional_chk"
    CHECK ("email" ~* '^[A-Z0-9._%+-]+@(ucn\\.cl|alumnos\\.ucn\\.cl)$');

ALTER TABLE "rooms"
    ADD CONSTRAINT "rooms_capacity_positive_chk"
    CHECK ("capacity" IS NULL OR "capacity" > 0);

-- Add foreign keys
ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tutors"
    ADD CONSTRAINT "tutors_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedules"
    ADD CONSTRAINT "schedules_tutor_id_fkey"
    FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "schedules"
    ADD CONSTRAINT "schedules_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "schedules"
    ADD CONSTRAINT "schedules_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "schedules"
    ADD CONSTRAINT "schedules_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "schedules"
    ADD CONSTRAINT "schedules_cancelled_by_user_id_fkey"
    FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_marked_by_user_id_fkey"
    FOREIGN KEY ("marked_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_recipient_user_id_fkey"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Avoid overlap of active schedules by tutor and room
ALTER TABLE "schedules"
    ADD CONSTRAINT "schedules_no_tutor_overlap"
    EXCLUDE USING gist (
        "tutor_id" WITH =,
        tstzrange("starts_at", "ends_at", '[)') WITH &&
    )
    WHERE ("status" <> 'CANCELLED');

ALTER TABLE "schedules"
    ADD CONSTRAINT "schedules_no_room_overlap"
    EXCLUDE USING gist (
        "room_id" WITH =,
        tstzrange("starts_at", "ends_at", '[)') WITH &&
    )
    WHERE ("status" <> 'CANCELLED');

-- Keep updated_at current on manual SQL updates
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tutors_set_updated_at
BEFORE UPDATE ON "tutors"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_rooms_set_updated_at
BEFORE UPDATE ON "rooms"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_schedules_set_updated_at
BEFORE UPDATE ON "schedules"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Generic audit trigger (uses app.current_user_id when available)
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor UUID;
    v_entity_id TEXT;
    v_payload JSONB;
BEGIN
    BEGIN
        v_actor := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
    EXCEPTION
        WHEN others THEN
            v_actor := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        v_entity_id := to_jsonb(OLD) ->> 'id';
        v_payload := jsonb_build_object('old', to_jsonb(OLD));
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := to_jsonb(NEW) ->> 'id';
        v_payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSE
        v_entity_id := to_jsonb(NEW) ->> 'id';
        v_payload := jsonb_build_object('new', to_jsonb(NEW));
    END IF;

    INSERT INTO "audit_logs" (
        "actor_user_id",
        "action",
        "entity_type",
        "entity_id",
        "metadata",
        "created_at"
    )
    VALUES (
        v_actor,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'CREATE'::"audit_action"
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'::"audit_action"
            ELSE 'DELETE'::"audit_action"
        END,
        TG_TABLE_NAME,
        v_entity_id,
        v_payload,
        CURRENT_TIMESTAMP
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

-- Append-only guarantee for audit_logs
CREATE OR REPLACE FUNCTION public.block_audit_logs_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only and cannot be updated or deleted';
END;
$$;

CREATE TRIGGER trg_audit_logs_block_update
BEFORE UPDATE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION public.block_audit_logs_mutation();

CREATE TRIGGER trg_audit_logs_block_delete
BEFORE DELETE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION public.block_audit_logs_mutation();

-- Register auditing on core entities
CREATE TRIGGER trg_audit_users
AFTER INSERT OR UPDATE OR DELETE ON "users"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_roles
AFTER INSERT OR UPDATE OR DELETE ON "roles"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON "user_roles"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_tutors
AFTER INSERT OR UPDATE OR DELETE ON "tutors"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_rooms
AFTER INSERT OR UPDATE OR DELETE ON "rooms"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_schedules
AFTER INSERT OR UPDATE OR DELETE ON "schedules"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_attendances
AFTER INSERT OR UPDATE OR DELETE ON "attendances"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_notifications
AFTER INSERT OR UPDATE OR DELETE ON "notifications"
FOR EACH ROW
EXECUTE FUNCTION public.write_audit_log();
