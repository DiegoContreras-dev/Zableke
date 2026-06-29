import { prisma } from "@/infrastructure/prisma/client";
import type { DayOfWeek, EnrollmentSource, Prisma, PrismaClient } from "@prisma/client";

type Db = Pick<
  PrismaClient,
  | "attendance"
  | "enrollment"
  | "googleFormLink"
  | "role"
  | "schedule"
  | "tutor"
  | "tutoringOffering"
  | "tutoringSlot"
  | "user"
  | "$transaction"
>;

export type OfferingRecord = Prisma.TutoringOfferingGetPayload<{
  include: {
    slots: {
      include: {
        tutor: { include: { user: true } };
        _count: { select: { enrollments: true } };
      };
    };
    _count: { select: { slots: true; enrollments: true } };
  };
}>;

export type SlotRecord = Prisma.TutoringSlotGetPayload<{
  include: {
    offering: true;
    tutor: { include: { user: true } };
    _count: { select: { enrollments: true } };
  };
}>;

export type EnrollmentRecord = Prisma.EnrollmentGetPayload<Record<string, never>>;

export type TutorOptionRecord = Prisma.TutorGetPayload<{ include: { user: true } }>;

export class OfferingsRepository {
  constructor(private readonly db: Db = prisma) {}

  async createOffering(data: {
    name: string;
    semester: string;
    targetCareers?: string[];
    createdById: string;
  }): Promise<OfferingRecord> {
    return this.db.tutoringOffering.create({
      data,
      include: this.offeringInclude(),
    });
  }

  async findOfferingById(id: string): Promise<OfferingRecord | null> {
    return this.db.tutoringOffering.findUnique({
      where: { id },
      include: this.offeringInclude(),
    });
  }

  async findOfferingsBySemester(semester: string): Promise<OfferingRecord[]> {
    return this.db.tutoringOffering.findMany({
      where: { semester },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: this.offeringInclude(),
    });
  }

  async updateOffering(
    id: string,
    data: Partial<{ name: string; status: "OPEN" | "CLOSED"; googleFormQuestionId: string | null; targetCareers: string[] }>
  ): Promise<OfferingRecord> {
    return this.db.tutoringOffering.update({
      where: { id },
      data,
      include: this.offeringInclude(),
    });
  }

  async deleteOffering(id: string): Promise<void> {
    await this.db.tutoringOffering.delete({ where: { id } });
  }

  async createSlot(data: {
    offeringId: string;
    tutorId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    roomName?: string;
    maxCapacity: number;
  }): Promise<SlotRecord> {
    return this.db.tutoringSlot.create({
      data,
      include: this.slotInclude(),
    });
  }

  async updateSlotGoogleLabel(id: string, googleFormOptionLabel: string): Promise<void> {
    await this.db.tutoringSlot.update({
      where: { id },
      data: { googleFormOptionLabel },
    });
  }

  async deleteSlot(id: string): Promise<void> {
    await this.db.tutoringSlot.delete({ where: { id } });
  }

  async findSlotById(id: string): Promise<SlotRecord | null> {
    return this.db.tutoringSlot.findUnique({
      where: { id },
      include: this.slotInclude(),
    });
  }

  async findSlotsByTutor(tutorId: string, semester: string): Promise<SlotRecord[]> {
    return this.db.tutoringSlot.findMany({
      where: { tutorId, offering: { status: "OPEN", semester } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: this.slotInclude(),
    });
  }

  async findTutorIdByUserId(userId: string): Promise<string | null> {
    const tutor = await this.db.tutor.findUnique({ where: { userId }, select: { id: true } });
    return tutor?.id ?? null;
  }

  async findTutorById(tutorId: string): Promise<TutorOptionRecord | null> {
    return this.db.tutor.findUnique({ where: { id: tutorId }, include: { user: true } });
  }

  async findTutorOptions(): Promise<TutorOptionRecord[]> {
    return this.db.tutor.findMany({
      where: { isActive: true, user: { isActive: true } },
      orderBy: { user: { firstName: "asc" } },
      include: { user: true },
    });
  }

  async findTutorSlotConflict(params: {
    tutorId: string;
    semester: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    excludeId?: string;
  }): Promise<{ id: string } | null> {
    return this.db.tutoringSlot.findFirst({
      where: {
        tutorId: params.tutorId,
        offering: { semester: params.semester },
        dayOfWeek: params.dayOfWeek,
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  async findRoomSlotConflict(params: {
    roomName: string;
    semester: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    excludeId?: string;
  }): Promise<{ id: string } | null> {
    return this.db.tutoringSlot.findFirst({
      where: {
        roomName: params.roomName,
        offering: { semester: params.semester },
        dayOfWeek: params.dayOfWeek,
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  async createEnrollment(data: {
    offeringId: string;
    slotId: string;
    studentEmail: string;
    studentName: string;
    studentRut?: string;
    studentCareer?: string;
    studentPhone?: string;
    source: EnrollmentSource;
    googleFormResponseId?: string;
  }): Promise<EnrollmentRecord> {
    return this.db.enrollment.create({ data });
  }

  async createManyEnrollments(data: Array<{
    offeringId: string;
    slotId: string;
    studentEmail: string;
    studentName: string;
    studentRut?: string;
    studentCareer?: string;
    studentPhone?: string;
    source: EnrollmentSource;
    googleFormResponseId?: string;
  }>): Promise<number> {
    const result = await this.db.enrollment.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  async findEnrollmentsBySlot(slotId: string): Promise<EnrollmentRecord[]> {
    return this.db.enrollment.findMany({
      where: { slotId },
      orderBy: { studentName: "asc" },
    });
  }

  async countEnrollmentsBySlot(slotId: string): Promise<number> {
    return this.db.enrollment.count({ where: { slotId } });
  }

  async deleteEnrollment(id: string): Promise<void> {
    await this.db.enrollment.delete({ where: { id } });
  }

  async hasProcessedResponse(responseId: string): Promise<boolean> {
    const count = await this.db.enrollment.count({ where: { googleFormResponseId: responseId } });
    return count > 0;
  }

  async upsertGoogleFormLink(data: {
    semester: string;
    formId: string;
    formUrl: string;
    formEditUrl?: string | null;
  }) {
    return this.db.googleFormLink.upsert({
      where: { semester: data.semester },
      update: {
        formId: data.formId,
        formUrl: data.formUrl,
        formEditUrl: data.formEditUrl,
      },
      create: data,
    });
  }

  async findGoogleFormLink(semester: string) {
    return this.db.googleFormLink.findUnique({ where: { semester } });
  }

  async markGoogleFormSynced(semester: string): Promise<void> {
    await this.db.googleFormLink.update({
      where: { semester },
      data: { lastSyncedAt: new Date() },
    });
  }

  async getOrCreateScheduleForSlot(params: {
    slotId: string;
    date: string;
    createdById: string;
  }) {
    const slot = await this.findSlotById(params.slotId);
    if (!slot) return null;

    const dayStart = new Date(`${params.date}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await this.db.schedule.findFirst({
      where: {
        tutoringSlotId: params.slotId,
        startsAt: { gte: dayStart, lt: dayEnd },
      },
      include: { room: true },
    });
    if (existing) return existing;

    return this.db.schedule.create({
      data: {
        tutoringSlotId: params.slotId,
        tutorId: slot.tutorId,
        createdById: params.createdById,
        title: slot.offering.name,
        description: slot.offering.semester,
        startsAt: new Date(`${params.date}T${slot.startTime}:00`),
        endsAt: new Date(`${params.date}T${slot.endTime}:00`),
        roomName: slot.roomName,
      },
      include: { room: true },
    });
  }

  async findAttendanceBySchedule(scheduleId: string) {
    return this.db.attendance.findMany({ where: { scheduleId } });
  }

  async findTutorStats(semester: string): Promise<
    Array<{
      id: string;
      userId: string;
      user: { firstName: string; lastName: string; email: string };
      _count: { tutoringSlots: number };
      tutoringSlots: Array<{ maxCapacity: number; _count: { enrollments: number } }>;
    }>
  > {
    return this.db.tutor.findMany({
      where: { isActive: true, user: { isActive: true } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { tutoringSlots: { where: { offering: { semester } } } } },
        tutoringSlots: {
          where: { offering: { semester } },
          select: { maxCapacity: true, _count: { select: { enrollments: true } } },
        },
      },
      orderBy: { user: { firstName: "asc" } },
    });
  }

  async findReportStats(semester: string) {
    const [offerings, careerGroups] = await Promise.all([
      this.db.tutoringOffering.findMany({
        where: { semester },
        include: { _count: { select: { slots: true, enrollments: true } } },
      }),
      this.db.enrollment.groupBy({
        by: ["studentCareer"],
        where: { offering: { semester }, studentCareer: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);
    return { offerings, careerGroups };
  }

  async findAllEnrollments(semester: string) {
    return this.db.enrollment.findMany({
      where: { offering: { semester } },
      include: {
        offering: { select: { name: true, semester: true } },
        slot: {
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            roomName: true,
            tutor: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
      orderBy: [{ offering: { name: "asc" } }, { studentName: "asc" }],
    });
  }

  private offeringInclude() {
    return {
      slots: {
        orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }],
        include: {
          tutor: { include: { user: true } },
          _count: { select: { enrollments: true } },
        },
      },
      _count: { select: { slots: true, enrollments: true } },
    };
  }

  private slotInclude() {
    return {
      offering: true,
      tutor: { include: { user: true } },
      _count: { select: { enrollments: true } },
    };
  }
}
