CREATE TABLE "academic_semesters" (
  "code" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNING',
  "months" INTEGER[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academic_semesters_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "academic_semesters_status_idx" ON "academic_semesters"("status");
