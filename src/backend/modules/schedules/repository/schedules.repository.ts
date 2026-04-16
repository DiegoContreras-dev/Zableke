import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma, PrismaClient, ScheduleStatus } from "@prisma/client";

type PrismaLike = Pick<PrismaClient, "schedule" | "tutor">;

export type ScheduleRecord = Prisma.ScheduleGetPayload<{ include: { room: true } }>;

/** Tipo compacto para búsqueda de conflictos (sin include) */
type ScheduleConflictRecord = Prisma.ScheduleGetPayload<Record<string, never>>;

export interface ConflictCheckParams {
  tutorId: string;
  roomId: string;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string; // schedule to exclude when updating
}

export interface ConflictResult {
  tutorConflict: ScheduleConflictRecord | null;
  roomConflict: ScheduleConflictRecord | null;
}

export class SchedulesRepository {
  constructor(private readonly db: PrismaLike = prisma) {}

  async findTutorIdByUserId(userId: string): Promise<string | null> {
    const tutor = await this.db.tutor.findUnique({ where: { userId }, select: { id: true } });
    return tutor?.id ?? null;
  }

  async findById(id: string): Promise<ScheduleRecord | null> {
    return this.db.schedule.findUnique({ where: { id }, include: { room: true } });
  }

  async findAllByTutor(tutorId: string): Promise<ScheduleRecord[]> {
    return this.db.schedule.findMany({
      where: { tutorId, status: "ACTIVE" },
      orderBy: { startsAt: "asc" },
      include: { room: true },
    });
  }

  async findAll(filter?: { status?: ScheduleStatus }): Promise<ScheduleRecord[]> {
    return this.db.schedule.findMany({
      where: filter,
      orderBy: { startsAt: "asc" },
      include: { room: true },
    });
  }

  /**
   * Checks for overlapping ACTIVE schedules.
   * Two intervals [A, B) and [C, D) overlap when A < D && C < B.
   */
  async checkConflicts(params: ConflictCheckParams): Promise<ConflictResult> {
    const { tutorId, roomId, startsAt, endsAt, excludeId } = params;

    const baseWhere = {
      status: "ACTIVE" as ScheduleStatus,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    };

    const [tutorConflict, roomConflict] = await Promise.all([
      this.db.schedule.findFirst({ where: { ...baseWhere, tutorId } }),
      this.db.schedule.findFirst({ where: { ...baseWhere, roomId } }),
    ]);

    return { tutorConflict, roomConflict };
  }

  async create(data: {
    tutorId: string;
    roomId: string;
    createdById: string;
    title: string;
    description?: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<ScheduleRecord> {
    return this.db.schedule.create({ data, include: { room: true } });
  }

  async update(
    id: string,
    data: Partial<{
      roomId: string;
      title: string;
      description: string | null;
      startsAt: Date;
      endsAt: Date;
    }>
  ): Promise<ScheduleRecord> {
    return this.db.schedule.update({ where: { id }, data, include: { room: true } });
  }

  async cancel(id: string): Promise<ScheduleRecord> {
    return this.db.schedule.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { room: true },
    });
  }
}
