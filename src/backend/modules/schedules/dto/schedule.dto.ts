import { AuthError } from "@/backend/common/errors/auth.error";

export interface CreateScheduleInput {
  tutorId: string;
  roomId: string;
  title: string;
  description?: string;
  startsAt: string; // ISO 8601
  endsAt: string;   // ISO 8601
}

export interface UpdateScheduleInput {
  id: string;
  roomId?: string;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
}

function parseIso(value: string, field: string): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new AuthError(`'${field}' must be a valid ISO 8601 date`, "INVALID_INPUT", 400);
  }
  return d;
}

export function parseCreateScheduleInput(raw: unknown): CreateScheduleInput {
  if (!raw || typeof raw !== "object") {
    throw new AuthError("Invalid schedule input", "INVALID_INPUT", 400);
  }
  const c = raw as Record<string, unknown>;

  const tutorId = typeof c.tutorId === "string" ? c.tutorId.trim() : "";
  const roomId = typeof c.roomId === "string" ? c.roomId.trim() : "";
  const title = typeof c.title === "string" ? c.title.trim() : "";
  const startsAt = typeof c.startsAt === "string" ? c.startsAt.trim() : "";
  const endsAt = typeof c.endsAt === "string" ? c.endsAt.trim() : "";

  if (!tutorId) throw new AuthError("tutorId is required", "INVALID_INPUT", 400);
  if (!roomId) throw new AuthError("roomId is required", "INVALID_INPUT", 400);
  if (!title) throw new AuthError("title is required", "INVALID_INPUT", 400);
  if (!startsAt) throw new AuthError("startsAt is required", "INVALID_INPUT", 400);
  if (!endsAt) throw new AuthError("endsAt is required", "INVALID_INPUT", 400);

  const start = parseIso(startsAt, "startsAt");
  const end = parseIso(endsAt, "endsAt");

  if (end <= start) {
    throw new AuthError("endsAt must be after startsAt", "INVALID_INPUT", 400);
  }

  return {
    tutorId,
    roomId,
    title,
    description: typeof c.description === "string" ? c.description.trim() || undefined : undefined,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

export function parseUpdateScheduleInput(raw: unknown): UpdateScheduleInput {
  if (!raw || typeof raw !== "object") {
    throw new AuthError("Invalid schedule input", "INVALID_INPUT", 400);
  }
  const c = raw as Record<string, unknown>;
  const id = typeof c.id === "string" ? c.id.trim() : "";
  if (!id) throw new AuthError("id is required", "INVALID_INPUT", 400);

  const result: UpdateScheduleInput = { id };

  if (typeof c.roomId === "string") result.roomId = c.roomId.trim();
  if (typeof c.title === "string") result.title = c.title.trim();
  if (typeof c.description === "string") result.description = c.description.trim() || undefined;

  if (c.startsAt !== undefined || c.endsAt !== undefined) {
    const startsAt = typeof c.startsAt === "string" ? c.startsAt.trim() : undefined;
    const endsAt = typeof c.endsAt === "string" ? c.endsAt.trim() : undefined;
    if (startsAt) result.startsAt = parseIso(startsAt, "startsAt").toISOString();
    if (endsAt) result.endsAt = parseIso(endsAt, "endsAt").toISOString();
    if (result.startsAt && result.endsAt && new Date(result.endsAt) <= new Date(result.startsAt)) {
      throw new AuthError("endsAt must be after startsAt", "INVALID_INPUT", 400);
    }
  }

  return result;
}
