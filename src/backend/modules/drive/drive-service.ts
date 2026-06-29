import { prisma } from "@/infrastructure/prisma/client";
import { SemestersService } from "@/backend/modules/semesters/service/semesters.service";
import { decryptDriveToken, encryptDriveToken } from "./drive-crypto";
import {
  createManagedFolder,
  ensureUserWriterPermission,
  findManagedFolder,
  getDriveAccount,
  getDriveFile,
  listDriveFolders,
  listSharedDrives,
  refreshDriveAccessToken,
} from "./drive-client";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function defaultDriveMonths(semester: string): number[] {
  return semester.endsWith("-2") ? [8, 9, 10, 11, 12] : [3, 4, 5, 6, 7];
}

function driveId(value: string): string {
  const trimmed = value.trim();
  const folderMatch = trimmed.match(/\/folders\/([^/?]+)/);
  return folderMatch?.[1] ?? trimmed;
}

async function ensureFolder(
  accessToken: string,
  params: {
    parentId: string;
    name: string;
    propertyKey: string;
    propertyValue: string;
    appProperties?: Record<string, string>;
  },
) {
  const existing = await findManagedFolder(
    accessToken,
    params.parentId,
    params.propertyKey,
    params.propertyValue,
  );
  if (existing) return existing;
  return createManagedFolder(accessToken, {
    name: params.name,
    parentId: params.parentId,
    appProperties: {
      [params.propertyKey]: params.propertyValue,
      ...(params.appProperties ?? {}),
    },
  });
}

export class DriveService {
  async getPublicSettings(requestedSemester?: string) {
    const semester = requestedSemester ?? await new SemestersService().activeCode();
    const [connection, semesterConfig] = await Promise.all([
      prisma.googleDriveConnection.findUnique({ where: { id: "primary" } }),
      prisma.driveSemesterConfig.findUnique({ where: { semester } }),
    ]);
    return {
      connected: Boolean(connection?.encryptedRefreshToken && connection.status === "CONNECTED"),
      accountEmail: connection?.accountEmail ?? null,
      sharedDriveId: connection?.sharedDriveId ?? null,
      rootFolderId: connection?.rootFolderId ?? null,
      rootFolderName: connection?.rootFolderName ?? null,
      status: connection?.status ?? "DISCONNECTED",
      lastError: connection?.lastError ?? null,
      semester,
      months: semesterConfig?.months ?? defaultDriveMonths(semester),
    };
  }

  async connectAccount(params: {
    accountEmail: string;
    refreshToken?: string;
  }) {
    const existing = await prisma.googleDriveConnection.findUnique({ where: { id: "primary" } });
    const encryptedRefreshToken = params.refreshToken
      ? encryptDriveToken(params.refreshToken)
      : existing?.encryptedRefreshToken;
    if (!encryptedRefreshToken) {
      throw new Error("Google did not return a refresh token. Reconnect and grant consent.");
    }
    return prisma.googleDriveConnection.upsert({
      where: { id: "primary" },
      create: {
        id: "primary",
        accountEmail: params.accountEmail,
        encryptedRefreshToken,
        status: "CONNECTED",
      },
      update: {
        accountEmail: params.accountEmail,
        encryptedRefreshToken,
        status: "CONNECTED",
        lastError: null,
      },
    });
  }

  async disconnectAccount() {
    return prisma.googleDriveConnection.upsert({
      where: { id: "primary" },
      create: { id: "primary", status: "DISCONNECTED" },
      update: {
        encryptedRefreshToken: null,
        accountEmail: null,
        status: "DISCONNECTED",
        lastError: null,
      },
    });
  }

  async accessToken(): Promise<string> {
    const connection = await prisma.googleDriveConnection.findUnique({ where: { id: "primary" } });
    if (!connection?.encryptedRefreshToken || connection.status !== "CONNECTED") {
      throw new Error("Google Drive is not connected");
    }
    return refreshDriveAccessToken(decryptDriveToken(connection.encryptedRefreshToken));
  }

  async saveSettings(params: {
    rootFolderId: string;
    semester: string;
    months: number[];
  }) {
    if (!/^\d{4}-[12]$/.test(params.semester)) throw new Error("Invalid semester");
    const months = [...new Set(params.months)]
      .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
      .sort((a, b) => a - b);
    if (!params.rootFolderId.trim()) throw new Error("Root folder ID is required");
    if (months.length === 0) throw new Error("At least one month is required");

    const accessToken = await this.accessToken();
    const root = await getDriveFile(accessToken, driveId(params.rootFolderId));
    await prisma.$transaction([
      prisma.googleDriveConnection.update({
        where: { id: "primary" },
        data: {
          rootFolderId: root.id,
          rootFolderName: root.name,
          sharedDriveId: root.driveId ?? null,
          lastError: null,
        },
      }),
      prisma.driveSemesterConfig.upsert({
        where: { semester: params.semester },
        create: { semester: params.semester, months },
        update: { months, semesterFolderId: null },
      }),
    ]);
    return this.getPublicSettings(params.semester);
  }

  async testConnection() {
    const accessToken = await this.accessToken();
    const connection = await prisma.googleDriveConnection.findUnique({ where: { id: "primary" } });
    const account = await getDriveAccount(accessToken);
    const root = connection?.rootFolderId
      ? await getDriveFile(accessToken, connection.rootFolderId)
      : null;
    return { accountEmail: account.emailAddress, rootFolderName: root?.name ?? null };
  }

  async createRootFolder(name: string) {
    return this.createFolder(name, "root");
  }

  async createFolder(name: string, parentId: string) {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 120) {
      throw new Error("El nombre de la carpeta debe tener entre 1 y 120 caracteres");
    }
    if (!parentId.trim()) throw new Error("La carpeta padre es obligatoria");
    const accessToken = await this.accessToken();
    const folder = await createManagedFolder(accessToken, {
      name: cleanName,
      parentId,
    });
    return {
      id: folder.id,
      name: folder.name,
      url: folder.webViewLink ?? `https://drive.google.com/drive/folders/${folder.id}`,
    };
  }

  async browseFolders(parentId = "root") {
    const accessToken = await this.accessToken();
    return listDriveFolders(accessToken, parentId);
  }

  async browseSharedDrives() {
    const accessToken = await this.accessToken();
    return listSharedDrives(accessToken);
  }

  async provisionTutorFolder(tutorUserId: string, semester?: string) {
    semester ??= await new SemestersService().activeCode();
    const tutor = await prisma.tutor.findUnique({
      where: { userId: tutorUserId },
      include: { user: true },
    });
    if (!tutor) throw new Error("Tutor not found");

    const assignmentKey = { tutorId_semester: { tutorId: tutor.id, semester } };
    await prisma.tutorDriveFolder.upsert({
      where: assignmentKey,
      create: { tutorId: tutor.id, semester, status: "PENDING" },
      update: { status: "PENDING", lastError: null },
    });

    try {
      const connection = await prisma.googleDriveConnection.findUnique({ where: { id: "primary" } });
      if (!connection?.rootFolderId) throw new Error("Configure a root folder first");
      const config = await prisma.driveSemesterConfig.upsert({
        where: { semester },
        create: { semester, months: defaultDriveMonths(semester) },
        update: {},
      });
      const accessToken = await this.accessToken();

      const semesterFolder = await ensureFolder(accessToken, {
        parentId: connection.rootFolderId,
        name: semester,
        propertyKey: "zablekeSemester",
        propertyValue: semester,
      });
      if (config.semesterFolderId !== semesterFolder.id) {
        await prisma.driveSemesterConfig.update({
          where: { semester },
          data: { semesterFolderId: semesterFolder.id },
        });
      }

      const tutorFolder = await ensureFolder(accessToken, {
        parentId: semesterFolder.id,
        name: `${tutor.user.firstName} ${tutor.user.lastName}`.trim(),
        propertyKey: "zablekeTutorSemester",
        propertyValue: `${tutor.id}:${semester}`,
        appProperties: { zablekeTutorId: tutor.id },
      });

      for (const month of config.months) {
        const monthName = MONTH_NAMES[month - 1];
        if (!monthName) continue;
        await ensureFolder(accessToken, {
          parentId: tutorFolder.id,
          name: monthName,
          propertyKey: "zablekeMonth",
          propertyValue: `${semester}:${month}`,
        });
      }

      await ensureUserWriterPermission(accessToken, tutorFolder.id, tutor.user.email);
      return prisma.tutorDriveFolder.update({
        where: assignmentKey,
        data: {
          folderId: tutorFolder.id,
          folderUrl: tutorFolder.webViewLink ?? `https://drive.google.com/drive/folders/${tutorFolder.id}`,
          status: "READY",
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Drive error";
      await prisma.tutorDriveFolder.update({
        where: assignmentKey,
        data: { status: "FAILED", lastError: message },
      });
      throw error;
    }
  }

  async folderForTutorUser(tutorUserId: string, semester?: string) {
    semester ??= await new SemestersService().activeCode();
    const tutor = await prisma.tutor.findUnique({ where: { userId: tutorUserId } });
    if (!tutor) return null;
    return prisma.tutorDriveFolder.findUnique({
      where: { tutorId_semester: { tutorId: tutor.id, semester } },
    });
  }
}
