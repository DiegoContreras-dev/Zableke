import { AuthError } from "@/backend/common/errors/auth.error";
import {
  getCurrentSemester,
  parseCreateEnrollmentInput,
  parseCreateOfferingInput,
  parseCreateSlotInput,
  parseDateOnly,
  parseUpdateOfferingInput,
  type CreateEnrollmentInput,
} from "@/backend/modules/offerings/dto/offering.dto";
import type {
  EnrollmentView,
  GoogleFormLinkView,
  OfferingView,
  SlotAttendanceView,
  SlotView,
  SyncResultView,
  TutorOptionView,
} from "@/backend/modules/offerings/model/offering.model";
import {
  OfferingsRepository,
  type EnrollmentRecord,
  type OfferingRecord,
  type SlotRecord,
  type TutorOptionRecord,
} from "@/backend/modules/offerings/repository/offerings.repository";
import type { CurrentUserLike } from "@/backend/common/guards/role.guard";

import { ServiceAccountFormsClient } from "@/backend/modules/offerings/google-forms/forms-client";
import { syncResponses } from "@/backend/modules/offerings/google-forms/response-sync";
import { prisma } from "@/infrastructure/prisma/client";

function toSlotView(slot: SlotRecord): SlotView {
  return {
    id: slot.id,
    offeringId: slot.offeringId,
    offeringName: slot.offering.name,
    tutorId: slot.tutorId,
    tutorName: `${slot.tutor.user.firstName} ${slot.tutor.user.lastName}`,
    tutorEmail: slot.tutor.user.email,
    roomName: slot.roomName,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxCapacity: slot.maxCapacity,
    enrolledCount: slot._count.enrollments,
  };
}

function offeringSlotToView(offering: OfferingRecord, slot: OfferingRecord["slots"][number]): SlotView {
  return {
    id: slot.id,
    offeringId: slot.offeringId,
    offeringName: offering.name,
    tutorId: slot.tutorId,
    tutorName: `${slot.tutor.user.firstName} ${slot.tutor.user.lastName}`,
    tutorEmail: slot.tutor.user.email,
    roomName: slot.roomName,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxCapacity: slot.maxCapacity,
    enrolledCount: slot._count.enrollments,
  };
}

function toOfferingView(offering: OfferingRecord): OfferingView {
  return {
    id: offering.id,
    name: offering.name,
    semester: offering.semester,
    status: offering.status,
    slotsCount: offering._count.slots,
    enrollmentsCount: offering._count.enrollments,
    targetCareers: (offering as OfferingRecord & { targetCareers?: string[] }).targetCareers ?? [],
    googleFormQuestionId: offering.googleFormQuestionId,
    createdAt: offering.createdAt.toISOString(),
    updatedAt: offering.updatedAt.toISOString(),
    slots: offering.slots.map((slot) => offeringSlotToView(offering, slot)),
  };
}

function toEnrollmentView(enrollment: EnrollmentRecord): EnrollmentView {
  return {
    id: enrollment.id,
    slotId: enrollment.slotId,
    offeringId: enrollment.offeringId,
    studentEmail: enrollment.studentEmail,
    studentName: enrollment.studentName,
    studentRut: enrollment.studentRut,
    studentCareer: enrollment.studentCareer,
    studentPhone: enrollment.studentPhone,
    source: enrollment.source,
    googleFormResponseId: enrollment.googleFormResponseId,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  };
}

function toTutorOptionView(tutor: TutorOptionRecord): TutorOptionView {
  return {
    tutorId: tutor.id,
    userId: tutor.userId,
    name: `${tutor.user.firstName} ${tutor.user.lastName}`,
    email: tutor.user.email,
  };
}

function isAdmin(user: CurrentUserLike): boolean {
  return user.roles.includes("ADMIN");
}

type GoogleFormsBatchReply = {
  createItem?: {
    itemId?: string;
    questionId?: Array<{ questionId?: string }>;
  };
};

export class OfferingsService {
  constructor(private readonly repo = new OfferingsRepository()) {}

  async createOffering(rawInput: unknown, createdById: string): Promise<OfferingView> {
    const input = parseCreateOfferingInput(rawInput);
    const offering = await this.repo.createOffering({
      name: input.name,
      semester: input.semester ?? getCurrentSemester(),
      targetCareers: input.targetCareers ?? [],
      createdById,
    });
    return toOfferingView(offering);
  }

  async updateOffering(id: string, rawInput: unknown): Promise<OfferingView> {
    await this.getOfferingRecord(id);
    const input = parseUpdateOfferingInput(rawInput);
    const offering = await this.repo.updateOffering(id, input);
    return toOfferingView(offering);
  }

  async getOfferingsBySemester(semester?: string): Promise<OfferingView[]> {
    const offerings = await this.repo.findOfferingsBySemester(semester ?? getCurrentSemester());
    return offerings.map(toOfferingView);
  }

  async getOfferingById(id: string): Promise<OfferingView> {
    return toOfferingView(await this.getOfferingRecord(id));
  }

  async closeOffering(id: string): Promise<OfferingView> {
    await this.getOfferingRecord(id);
    const offering = await this.repo.updateOffering(id, { status: "CLOSED" });
    return toOfferingView(offering);
  }

  async deleteOffering(id: string): Promise<boolean> {
    await this.getOfferingRecord(id);
    await this.repo.deleteOffering(id);
    return true;
  }

  async addSlot(rawInput: unknown): Promise<SlotView> {
    const input = parseCreateSlotInput(rawInput);
    const offering = await this.getOfferingRecord(input.offeringId);
    if (offering.status !== "OPEN") {
      throw new AuthError("Cannot add slots to a closed offering", "INVALID_STATE", 400);
    }

    const tutor = await this.repo.findTutorById(input.tutorId);
    if (!tutor || !tutor.isActive || !tutor.user.isActive) {
      throw new AuthError("Tutor not found or inactive", "RESOURCE_NOT_FOUND", 404);
    }

    const [tutorConflict, roomConflict] = await Promise.all([
      this.repo.findTutorSlotConflict(input),
      input.roomName
        ? this.repo.findRoomSlotConflict({
            roomName: input.roomName,
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
          })
        : Promise.resolve(null),
    ]);

    if (tutorConflict) {
      throw new AuthError(
        `El tutor ya tiene un horario asignado en ese bloque (conflicto: ${tutorConflict.id})`,
        "TUTOR_SCHEDULE_CONFLICT",
        409
      );
    }

    if (roomConflict) {
      throw new AuthError(
        `La sala "${input.roomName}" ya está ocupada en ese bloque (conflicto: ${roomConflict.id})`,
        "ROOM_SCHEDULE_CONFLICT",
        409
      );
    }

    const slot = await this.repo.createSlot(input);
    return toSlotView(slot);
  }

  async removeSlot(slotId: string): Promise<boolean> {
    const slot = await this.repo.findSlotById(slotId);
    if (!slot) throw new AuthError("Slot not found", "RESOURCE_NOT_FOUND", 404);
    await this.repo.deleteSlot(slotId);
    return true;
  }

  async getSlotsByTutor(userId: string): Promise<SlotView[]> {
    const tutorId = await this.repo.findTutorIdByUserId(userId);
    if (!tutorId) return [];
    const slots = await this.repo.findSlotsByTutor(tutorId);
    return slots.map(toSlotView);
  }

  async getTutorOptions(): Promise<TutorOptionView[]> {
    const tutors = await this.repo.findTutorOptions();
    return tutors.map(toTutorOptionView);
  }

  async getTutorStats(): Promise<import("@/backend/modules/offerings/model/offering.model").TutorStatView[]> {
    const tutors = await this.repo.findTutorStats();
    return tutors.map((t) => {
      const totalStudents = t.tutoringSlots.reduce((s, sl) => s + sl._count.enrollments, 0);
      const totalCapacity = t.tutoringSlots.reduce((s, sl) => s + sl.maxCapacity, 0);
      const fillRate = totalCapacity > 0 ? totalStudents / totalCapacity : 0;
      const grade = totalCapacity > 0 ? Math.max(1.0, Math.min(7.0, Math.round((fillRate * 6 + 1) * 10) / 10)) : 0;
      return {
        tutorId: t.id,
        userId: t.userId,
        name: `${t.user.firstName} ${t.user.lastName}`,
        email: t.user.email,
        totalSlots: t._count.tutoringSlots,
        totalStudents,
        totalCapacity,
        fillRate,
        grade,
      };
    });
  }

  async createEnrollment(rawInput: unknown): Promise<EnrollmentView> {
    const input = parseCreateEnrollmentInput(rawInput);
    const data = await this.prepareEnrollment(input);
    const enrollment = await this.repo.createEnrollment(data);
    return toEnrollmentView(enrollment);
  }

  async removeEnrollment(enrollmentId: string): Promise<boolean> {
    await this.repo.deleteEnrollment(enrollmentId);
    return true;
  }

  async getEnrolledStudents(slotId: string, user: CurrentUserLike): Promise<EnrollmentView[]> {
    const slot = await this.repo.findSlotById(slotId);
    if (!slot) throw new AuthError("Slot not found", "RESOURCE_NOT_FOUND", 404);

    if (!isAdmin(user)) {
      const tutorId = await this.repo.findTutorIdByUserId(user.id);
      if (!tutorId || tutorId !== slot.tutorId) {
        throw new AuthError("You cannot view enrollments for this slot", "FORBIDDEN", 403);
      }
    }

    const enrollments = await this.repo.findEnrollmentsBySlot(slotId);
    return enrollments.map(toEnrollmentView);
  }

  async getAttendanceForSlot(rawSlotId: string, rawDate: unknown, user: CurrentUserLike): Promise<SlotAttendanceView> {
    const date = parseDateOnly(rawDate);
    const slot = await this.repo.findSlotById(rawSlotId);
    if (!slot) throw new AuthError("Slot not found", "RESOURCE_NOT_FOUND", 404);

    if (!isAdmin(user)) {
      const tutorId = await this.repo.findTutorIdByUserId(user.id);
      if (!tutorId || tutorId !== slot.tutorId) {
        throw new AuthError("You cannot record attendance for this slot", "FORBIDDEN", 403);
      }
    }

    const schedule = await this.repo.getOrCreateScheduleForSlot({
      slotId: slot.id,
      date,
      createdById: user.id,
    });
    if (!schedule) throw new AuthError("Slot not found", "RESOURCE_NOT_FOUND", 404);

    const [enrollments, attendanceRecords] = await Promise.all([
      this.repo.findEnrollmentsBySlot(slot.id),
      this.repo.findAttendanceBySchedule(schedule.id),
    ]);
    const attendanceByEmail = new Map(
      attendanceRecords.map((record) => [record.studentEmail.toLowerCase(), record.status])
    );

    return {
      scheduleId: schedule.id,
      students: enrollments.map((enrollment) => ({
        studentEmail: enrollment.studentEmail,
        studentName: enrollment.studentName,
        studentCareer: enrollment.studentCareer,
        studentPhone: enrollment.studentPhone,
        status: attendanceByEmail.get(enrollment.studentEmail.toLowerCase()) ?? "PENDING",
      })),
    };
  }

  async generateGoogleForm(semester?: string, existingFormId?: string): Promise<GoogleFormLinkView> {
    const targetSemester = semester ?? getCurrentSemester();
    const offerings = await this.repo.findOfferingsBySemester(targetSemester);
    const openOfferings = offerings.filter((offering) => offering.status === "OPEN" && offering.slots.length > 0);
    if (openOfferings.length === 0) {
      throw new AuthError("There are no open offerings with slots for this semester", "INVALID_STATE", 400);
    }

    const client = new ServiceAccountFormsClient();

    // If no existing form was provided, create a new one automatically
    let resolvedFormId = existingFormId?.trim();
    if (!resolvedFormId) {
      const created = await client.createForm(`Tutoría ${targetSemester}`);
      resolvedFormId = created.formId;
    }

    // Remember initial items so we can clean them up after inserting ours
    const initialForm = await client.getForm(resolvedFormId);
    const initialItems = Array.isArray(initialForm.items)
      ? (initialForm.items as Array<{ itemId?: string }>)
      : [];
    const initialItemIds = initialItems.map((item) => item.itemId).filter((itemId): itemId is string => Boolean(itemId));

    const { buildPhase1Requests, buildPhase2Requests, groupOfferingsByCareers } = await import("@/backend/modules/offerings/google-forms/form-builder");
    const allCareers = await prisma.career.findMany({ orderBy: { name: "asc" } });

    // Group offerings by career for career-based form routing
    const careerGroups = groupOfferingsByCareers(openOfferings, allCareers);
    if (careerGroups.length === 0) {
      throw new AuthError(
        "No offerings have targetCareers assigned. Please assign careers to offerings before generating the form.",
        "INVALID_STATE",
        400
      );
    }

    const phase1Requests = buildPhase1Requests(careerGroups, allCareers);
    const phase1Result = await client.batchUpdateForm(resolvedFormId, phase1Requests);

    // phase1Result.replies layout:
    // [0] updateFormInfo
    // [1] Commitment question
    // [2] Page break "Datos Personales"
    // [3] Nombre y Apellidos
    // [4] RUT
    // [5] Correo electrónico
    // [6] Número de teléfono
    // [7] Carrera (radio question)
    // [8] Page break career[0]
    // [9] Page break career[1]
    // ...
    const replies = Array.isArray(phase1Result.replies)
      ? (phase1Result.replies as GoogleFormsBatchReply[])
      : [];

    // Extract the Carrera question's questionId and itemId for Phase 2 routing
    const carreraReply = replies[7];
    const carreraQuestionId = carreraReply?.createItem?.questionId?.[0]?.questionId;
    const carreraItemId = carreraReply?.createItem?.itemId;
    if (!carreraItemId) {
      throw new AuthError("Failed to read Carrera item ID from Google Forms API", "GOOGLE_VERIFY_ERROR", 502);
    }

    // Extract section IDs for each career group (starting at reply index 8)
    const careerSectionIds: string[] = [];
    for (let i = 0; i < careerGroups.length; i++) {
      const reply = replies[8 + i];
      const itemId = reply?.createItem?.itemId;
      if (!itemId) throw new AuthError("Failed to read career section ID from Google Forms API", "GOOGLE_VERIFY_ERROR", 502);
      careerSectionIds.push(itemId);
    }

    const phase2 = buildPhase2Requests(careerGroups, careerSectionIds, carreraQuestionId ?? "", carreraItemId, allCareers);
    await client.batchUpdateForm(resolvedFormId, phase2.requests);

    // ── Phase 3: Cleanup original items ──
    // Google Forms requires at least one item, so we couldn't delete the default question initially.
    // Now that our items are inserted, we safely find the original items and delete them by index.
    if (initialItemIds.length > 0) {
      const finalForm = await client.getForm(resolvedFormId);
      const currentItems = Array.isArray(finalForm.items)
        ? (finalForm.items as Array<{ itemId?: string }>)
        : [];
      const deleteRequests: unknown[] = [];

      // Delete from bottom to top so indices don't shift during deletion
      for (let i = currentItems.length - 1; i >= 0; i--) {
        const itemId = currentItems[i].itemId;
        if (itemId && initialItemIds.includes(itemId)) {
          deleteRequests.push({ deleteItem: { location: { index: i } } });
        }
      }
      if (deleteRequests.length > 0) {
        await client.batchUpdateForm(resolvedFormId, deleteRequests);
      }
    }

    const formUrl = `https://docs.google.com/forms/d/${resolvedFormId}/viewform`;
    const formEditUrl = `https://docs.google.com/forms/d/${resolvedFormId}/edit`;

    await Promise.all(
      phase2.slotLabels.map((item) => this.repo.updateSlotGoogleLabel(item.slotId, item.label))
    );
    const link = await this.repo.upsertGoogleFormLink({
      semester: targetSemester,
      formId: resolvedFormId,
      formUrl: formUrl,
      formEditUrl: formEditUrl,
    });

    return {
      formUrl: link.formUrl,
      formEditUrl: link.formEditUrl,
    };
  }

  async syncGoogleFormResponses(semester?: string): Promise<SyncResultView> {
    return syncResponses({
      semester: semester ?? getCurrentSemester(),
      client: new ServiceAccountFormsClient(),
      repo: this.repo,
    });
  }

  async getReportStats(semester?: string) {
    const target = semester ?? getCurrentSemester();
    const { offerings, careerGroups } = await this.repo.findReportStats(target);
    return {
      activeOfferingsCount: offerings.filter((o) => o.status === "OPEN").length,
      closedOfferingsCount: offerings.filter((o) => o.status === "CLOSED").length,
      totalSlots: offerings.reduce((s, o) => s + o._count.slots, 0),
      totalStudents: offerings.reduce((s, o) => s + o._count.enrollments, 0),
      careerBreakdown: careerGroups.map((g) => ({
        career: g.studentCareer ?? "Sin carrera",
        count: g._count.id,
      })),
    };
  }

  async getAllEnrollments(semester?: string) {
    const rows = await this.repo.findAllEnrollments(semester ?? getCurrentSemester());
    return rows.map((e) => ({ ...e, enrolledAt: e.enrolledAt.toISOString() }));
  }

  async prepareEnrollment(input: CreateEnrollmentInput) {
    const slot = await this.repo.findSlotById(input.slotId);
    if (!slot) throw new AuthError("Slot not found", "RESOURCE_NOT_FOUND", 404);
    if (slot.offering.status !== "OPEN") {
      throw new AuthError("Offering is closed", "INVALID_STATE", 400);
    }

    const enrolledCount = await this.repo.countEnrollmentsBySlot(slot.id);
    if (enrolledCount >= slot.maxCapacity) {
      throw new AuthError("Slot capacity exceeded", "INVALID_STATE", 409);
    }

    return {
      offeringId: slot.offeringId,
      slotId: slot.id,
      studentEmail: input.studentEmail,
      studentName: input.studentName,
      studentRut: input.studentRut,
      studentCareer: input.studentCareer,
      studentPhone: input.studentPhone,
      source: input.source,
      googleFormResponseId: input.googleFormResponseId,
    };
  }

  async getOfferingRecord(id: string): Promise<OfferingRecord> {
    const offering = await this.repo.findOfferingById(id);
    if (!offering) {
      throw new AuthError("Offering not found", "RESOURCE_NOT_FOUND", 404);
    }
    return offering;
  }
}
