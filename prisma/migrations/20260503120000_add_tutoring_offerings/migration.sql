-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('GOOGLE_FORM', 'MANUAL');

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN "roomName" TEXT;
ALTER TABLE "schedules" ADD COLUMN "tutoringSlotId" TEXT;
ALTER TABLE "schedules" ALTER COLUMN "roomId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tutoring_offerings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "status" "OfferingStatus" NOT NULL DEFAULT 'OPEN',
    "googleFormQuestionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutoring_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutoring_slots" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "roomName" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 30,
    "googleFormOptionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutoring_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentPhone" TEXT,
    "source" "EnrollmentSource" NOT NULL DEFAULT 'MANUAL',
    "googleFormResponseId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_form_links" (
    "id" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "formUrl" TEXT NOT NULL,
    "formEditUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_form_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutoring_offerings_name_semester_key" ON "tutoring_offerings"("name", "semester");
CREATE INDEX "tutoring_offerings_semester_idx" ON "tutoring_offerings"("semester");
CREATE INDEX "tutoring_offerings_createdById_idx" ON "tutoring_offerings"("createdById");
CREATE INDEX "tutoring_slots_offeringId_idx" ON "tutoring_slots"("offeringId");
CREATE INDEX "tutoring_slots_tutorId_idx" ON "tutoring_slots"("tutorId");
CREATE INDEX "tutoring_slots_dayOfWeek_idx" ON "tutoring_slots"("dayOfWeek");
CREATE UNIQUE INDEX "enrollments_slotId_studentEmail_key" ON "enrollments"("slotId", "studentEmail");
CREATE UNIQUE INDEX "enrollments_offeringId_studentEmail_key" ON "enrollments"("offeringId", "studentEmail");
CREATE INDEX "enrollments_studentEmail_idx" ON "enrollments"("studentEmail");
CREATE INDEX "enrollments_googleFormResponseId_idx" ON "enrollments"("googleFormResponseId");
CREATE UNIQUE INDEX "google_form_links_semester_key" ON "google_form_links"("semester");
CREATE INDEX "schedules_tutoringSlotId_startsAt_idx" ON "schedules"("tutoringSlotId", "startsAt");

-- AddForeignKey
ALTER TABLE "tutoring_offerings" ADD CONSTRAINT "tutoring_offerings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tutoring_slots" ADD CONSTRAINT "tutoring_slots_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "tutoring_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutoring_slots" ADD CONSTRAINT "tutoring_slots_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "tutoring_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "tutoring_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_tutoringSlotId_fkey" FOREIGN KEY ("tutoringSlotId") REFERENCES "tutoring_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
