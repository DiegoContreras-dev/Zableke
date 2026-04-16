import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma, AttendanceStatus } from "@prisma/client";

export type AttendanceRecord = Prisma.AttendanceGetPayload<Record<string, never>>;

export interface AttendanceWithSchedule extends AttendanceRecord {
  schedule: {
    id: string;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date;
    status: string;
    room: { name: string } | null;
  };
}

export interface CreateAttendanceInput {
  scheduleId: string;
  studentEmail: string;
  studentName?: string;
  status: AttendanceStatus;
  markedById: string;
  notes?: string;
}

export class AttendanceRepository {
  async upsert(input: CreateAttendanceInput): Promise<AttendanceRecord> {
    return prisma.attendance.upsert({
      where: {
        scheduleId_studentEmail: {
          scheduleId: input.scheduleId,
          studentEmail: input.studentEmail,
        },
      },
      create: {
        scheduleId: input.scheduleId,
        studentEmail: input.studentEmail,
        studentName: input.studentName,
        status: input.status,
        markedById: input.markedById,
        notes: input.notes,
      },
      update: {
        studentName: input.studentName,
        status: input.status,
        markedById: input.markedById,
        notes: input.notes,
        markedAt: new Date(),
      },
    });
  }

  async findBySchedule(scheduleId: string): Promise<AttendanceRecord[]> {
    return prisma.attendance.findMany({
      where: { scheduleId },
      orderBy: { studentEmail: "asc" },
    });
  }

  async findByStudentEmail(studentEmail: string): Promise<AttendanceRecord[]> {
    return prisma.attendance.findMany({
      where: { studentEmail },
      orderBy: { markedAt: "desc" },
    });
  }

  async findByMarker(markedById: string): Promise<AttendanceWithSchedule[]> {
    const rows = await prisma.attendance.findMany({
      where: { markedById },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            status: true,
            room: { select: { name: true } },
          },
        },
      },
      orderBy: { markedAt: "desc" },
    });
    return rows as unknown as AttendanceWithSchedule[];
  }

  /** Verifica que el schedule exista y pertenezca al tutor del userId indicado */
  async verifyScheduleOwnership(scheduleId: string, userId: string): Promise<boolean> {
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        tutor: { userId },
      },
    });
    return schedule !== null;
  }
}
