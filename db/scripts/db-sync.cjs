/**
 * db-sync.cjs -- Sincroniza el esquema de la BD con el Prisma schema actual.
 * Se ejecuta al arrancar el contenedor, ANTES de iniciar Next.js.
 * Usa PrismaClient directamente (sin el CLI de prisma).
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const STATEMENTS = [
  // extensions
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  // enums
  `DO $$ BEGIN CREATE TYPE "ScheduleStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "NotificationType" AS ENUM ('CREATED', 'UPDATED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // users
  `CREATE TABLE IF NOT EXISTS "users" (
    "id"          TEXT        NOT NULL PRIMARY KEY,
    "email"       TEXT        NOT NULL,
    "firstName"   TEXT        NOT NULL DEFAULT '',
    "lastName"    TEXT        NOT NULL DEFAULT '',
    "phone"       TEXT,
    "bio"         TEXT,
    "linkedinUrl" TEXT,
    "isActive"    BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone"        TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio"          TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedinUrl"  TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName"    TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName"     TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT`,

  // roles
  `CREATE TABLE IF NOT EXISTS "roles" (
    "id"          TEXT        NOT NULL PRIMARY KEY,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name")`,

  // user_roles
  `CREATE TABLE IF NOT EXISTS "user_roles" (
    "id"        TEXT        NOT NULL PRIMARY KEY,
    "userId"    TEXT        NOT NULL,
    "roleId"    TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_userId_roleId_key" ON "user_roles"("userId","roleId")`,
  `CREATE INDEX IF NOT EXISTS "user_roles_roleId_idx" ON "user_roles"("roleId")`,

  // tutors
  `CREATE TABLE IF NOT EXISTS "tutors" (
    "id"         TEXT        NOT NULL PRIMARY KEY,
    "userId"     TEXT        NOT NULL,
    "department" TEXT,
    "isActive"   BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "tutors_userId_key" ON "tutors"("userId")`,

  // rooms
  `CREATE TABLE IF NOT EXISTS "rooms" (
    "id"        TEXT        NOT NULL PRIMARY KEY,
    "name"      TEXT        NOT NULL,
    "location"  TEXT,
    "capacity"  INTEGER,
    "isActive"  BOOLEAN     NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "rooms_name_location_key" ON "rooms"("name","location")`,

  // schedules
  `CREATE TABLE IF NOT EXISTS "schedules" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "tutorId"     TEXT NOT NULL,
    "roomId"      TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "startsAt"    TIMESTAMPTZ NOT NULL,
    "endsAt"      TIMESTAMPTZ NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "schedules_tutorId_idx"     ON "schedules"("tutorId", "startsAt", "endsAt")`,
  `CREATE INDEX IF NOT EXISTS "schedules_roomId_idx"      ON "schedules"("roomId",  "startsAt", "endsAt")`,
  `CREATE INDEX IF NOT EXISTS "schedules_createdById_idx" ON "schedules"("createdById")`,

  // attendances
  `CREATE TABLE IF NOT EXISTS "attendances" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "scheduleId"   TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentName"  TEXT,
    "status"       TEXT NOT NULL DEFAULT 'PRESENT',
    "markedById"   TEXT NOT NULL,
    "markedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "notes"        TEXT,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "attendances_scheduleId_studentEmail_key" ON "attendances"("scheduleId","studentEmail")`,
  `CREATE INDEX IF NOT EXISTS "attendances_studentEmail_idx" ON "attendances"("studentEmail")`,
  `CREATE INDEX IF NOT EXISTS "attendances_markedById_idx"   ON "attendances"("markedById")`,

  // notifications
  `CREATE TABLE IF NOT EXISTS "notifications" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "scheduleId"   TEXT NOT NULL,
    "type"         TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'PENDING',
    "recipient"    TEXT NOT NULL,
    "subject"      TEXT NOT NULL,
    "body"         TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt"       TIMESTAMPTZ,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "notifications_scheduleId_idx" ON "notifications"("scheduleId")`,
  `CREATE INDEX IF NOT EXISTS "notifications_status_idx"     ON "notifications"("status")`,

  // audit_logs
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "actorId"    TEXT,
    "entity"     TEXT NOT NULL,
    "entityId"   TEXT NOT NULL,
    "action"     TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData"  JSONB,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "scheduleId" TEXT
  )`,

  // seed roles
  `INSERT INTO "roles" ("id","name","description","createdAt","updatedAt")
   VALUES ('role_admin','ADMIN','Administrador del sistema',NOW(),NOW()),
          ('role_tutor','TUTOR','Tutor academico',NOW(),NOW())
   ON CONFLICT ("name") DO NOTHING`,
];

async function main() {
  const prisma = new PrismaClient();
  let ok = 0;
  let warns = 0;
  try {
    for (const sql of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
        ok++;
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.warn('[db-sync] Advertencia:', err.message.split('\n')[0]);
          warns++;
        } else {
          ok++;
        }
      }
    }

    // Seed admin@ce.ucn.cl si no existe
    const existing = await prisma.$queryRaw`SELECT id FROM "users" WHERE "email" = 'admin@ce.ucn.cl' LIMIT 1`;
    if (!existing || existing.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const uid = 'user_admin_seed';
      await prisma.$executeRawUnsafe(
        `INSERT INTO "users" ("id","email","firstName","lastName","passwordHash","isActive","createdAt","updatedAt")
         VALUES ($1,'admin@ce.ucn.cl','Admin','UCN',$2,true,NOW(),NOW())
         ON CONFLICT ("email") DO NOTHING`,
        uid, hash
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO "user_roles" ("id","userId","roleId","createdAt")
         VALUES (gen_random_uuid()::text,$1,'role_admin',NOW())
         ON CONFLICT ("userId","roleId") DO NOTHING`,
        uid
      );
      console.log('[db-sync] Admin seed: admin@ce.ucn.cl creado.');
    }

    console.log(`[db-sync] Sincronizacion completada: ${ok} OK, ${warns} advertencias.`);
  } finally {
    await prisma.$disconnect();
  }
}

main();