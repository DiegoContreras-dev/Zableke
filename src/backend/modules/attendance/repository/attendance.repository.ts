import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma, AttendanceStatus } from "@prisma/client";

export type AttendanceRecord = Prisma.AttendanceGetPayload<Record<string, never>>;

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
