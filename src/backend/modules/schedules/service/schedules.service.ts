import { AuthError } from "@/backend/common/errors/auth.error";
import {
  parseCreateScheduleInput,
  parseUpdateScheduleInput,
  type CreateScheduleInput,
  type UpdateScheduleInput,
} from "@/backend/modules/schedules/dto/schedule.dto";
import type { ScheduleView } from "@/backend/modules/schedules/model/schedule.model";
import { SchedulesRepository } from "@/backend/modules/schedules/repository/schedules.repository";

function toView(r: { id: string; tutorId: string; roomId: string; room?: { name: string; location?: string | null } | null; createdById: string; title: string; description: string | null; startsAt: Date; endsAt: Date; status: string; createdAt: Date; updatedAt: Date }): ScheduleView {
  return {
    id: r.id,
    tutorId: r.tutorId,
    roomId: r.roomId,
    roomName: r.room?.name ?? null,
    createdById: r.createdById,
    title: r.title,
    description: r.description,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export class SchedulesService {
  constructor(private readonly repo = new SchedulesRepository()) {}

  async getSchedule(id: string): Promise<ScheduleView> {
    const schedule = await this.repo.findById(id);
    if (!schedule) {
      throw new AuthError("Schedule not found", "RESOURCE_NOT_FOUND", 404);
    }
    return toView(schedule);
  }

  async getSchedulesByTutor(userId: string): Promise<ScheduleView[]> {
    // userId (User.id) → buscar Tutor.id correspondiente
    const tutorId = await this.repo.findTutorIdByUserId(userId);
    if (!tutorId) return [];
    const schedules = await this.repo.findAllByTutor(tutorId);
    return schedules.map(toView);
  }

  async getAllSchedules(): Promise<ScheduleView[]> {
    const schedules = await this.repo.findAll();
    return schedules.map(toView);
  }

  async createSchedule(rawInput: unknown, createdById: string): Promise<ScheduleView> {
    const input: CreateScheduleInput = parseCreateScheduleInput(rawInput);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    const { tutorConflict, roomConflict } = await this.repo.checkConflicts({
      tutorId: input.tutorId,
      roomId: input.roomId,
      startsAt,
      endsAt,
    });

    if (tutorConflict) {
      throw new AuthError(
        `Tutor already has an active schedule overlapping this time slot (conflict: ${tutorConflict.id})`,
        "TUTOR_SCHEDULE_CONFLICT",
        409
      );
    }

    if (roomConflict) {
      throw new AuthError(
        `Room is already booked during this time slot (conflict: ${roomConflict.id})`,
        "ROOM_SCHEDULE_CONFLICT",
        409
      );
    }

    const schedule = await this.repo.create({
      tutorId: input.tutorId,
      roomId: input.roomId,
      createdById,
      title: input.title,
      description: input.description,
      startsAt,
      endsAt,
    });

    return toView(schedule);
  }

  async updateSchedule(rawInput: unknown): Promise<ScheduleView> {
    const input: UpdateScheduleInput = parseUpdateScheduleInput(rawInput);

    const existing = await this.repo.findById(input.id);
    if (!existing) {
      throw new AuthError("Schedule not found", "RESOURCE_NOT_FOUND", 404);
    }
    if (existing.status !== "ACTIVE") {
      throw new AuthError("Only ACTIVE schedules can be updated", "INVALID_STATE", 400);
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
    const roomId = input.roomId ?? existing.roomId;
    const tutorId = existing.tutorId;

    const { tutorConflict, roomConflict } = await this.repo.checkConflicts({
      tutorId,
      roomId,
      startsAt,
      endsAt,
      excludeId: input.id,
    });

    if (tutorConflict) {
      throw new AuthError(
        `Tutor already has an active schedule overlapping this time slot (conflict: ${tutorConflict.id})`,
        "TUTOR_SCHEDULE_CONFLICT",
        409
      );
    }

    if (roomConflict) {
      throw new AuthError(
        `Room is already booked during this time slot (conflict: ${roomConflict.id})`,
        "ROOM_SCHEDULE_CONFLICT",
        409
      );
    }

    const updated = await this.repo.update(input.id, {
      ...(input.roomId !== undefined ? { roomId: input.roomId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.startsAt !== undefined ? { startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt } : {}),
    });

    return toView(updated);
  }

  async cancelSchedule(id: string): Promise<ScheduleView> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AuthError("Schedule not found", "RESOURCE_NOT_FOUND", 404);
    }
    if (existing.status === "CANCELLED") {
      throw new AuthError("Schedule is already cancelled", "INVALID_STATE", 400);
    }
    const updated = await this.repo.cancel(id);
    return toView(updated);
  }
}
