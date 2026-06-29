CREATE TABLE "google_drive_connections" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "accountEmail" TEXT,
  "encryptedRefreshToken" TEXT,
  "sharedDriveId" TEXT,
  "rootFolderId" TEXT,
  "rootFolderName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_drive_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "drive_semester_configs" (
  "id" TEXT NOT NULL,
  "semester" TEXT NOT NULL,
  "months" INTEGER[],
  "semesterFolderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "drive_semester_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tutor_drive_folders" (
  "id" TEXT NOT NULL,
  "tutorId" TEXT NOT NULL,
  "semester" TEXT NOT NULL,
  "folderId" TEXT,
  "folderUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tutor_drive_folders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drive_semester_configs_semester_key" ON "drive_semester_configs"("semester");
CREATE UNIQUE INDEX "tutor_drive_folders_tutorId_semester_key" ON "tutor_drive_folders"("tutorId", "semester");
CREATE INDEX "tutor_drive_folders_semester_idx" ON "tutor_drive_folders"("semester");

ALTER TABLE "tutor_drive_folders"
ADD CONSTRAINT "tutor_drive_folders_tutorId_fkey"
FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
