import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma } from "@prisma/client";

export interface AuditLogEntry {
  actorId: string | null;
  entity: string;
  entityId: string;
  action: string;
  beforeData?: unknown;
  afterData?: unknown;
}

export class AuditLogRepository {
  /**
   * Best-effort write: audit logging must never block or fail the business
   * operation it's recording, so failures are caught and logged instead of
   * thrown.
   */
  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          entity: entry.entity,
          entityId: entry.entityId,
          action: entry.action,
          beforeData: entry.beforeData as Prisma.InputJsonValue | undefined,
          afterData: entry.afterData as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      console.error(`[audit] failed to record ${entry.action} on ${entry.entity}:${entry.entityId}`, error);
    }
  }
}
