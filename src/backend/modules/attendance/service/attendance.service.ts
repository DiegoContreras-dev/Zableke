import { AuthError } from "@/backend/common/errors/auth.error";
import {
  AttendanceRepository,
  type AttendanceRecord,
} from "@/backend/modules/attendance/repository/attendance.repository";

export interface AttendanceView {
  id: string;
  scheduleId: string;
  studentEmail: string;
  studentName: string | null;
  status: string;
  markedById: string;
  markedAt: string;
  notes: string | null;
}

export interface StudentAttendanceInput {
  studentEmail: string;
  studentName?: string;
  /** PRESENT | ABSENT | JUSTIFIED */
  status: string;
  notes?: string;
}

export interface BulkAttendanceInput {
  scheduleId: string;
  attendances: StudentAttendanceInput[];
}

const ALLOWED_STATUSES = new Set(["PRESENT", "ABSENT", "JUSTIFIED"]);

function toView(r: AttendanceRecord): AttendanceView {
  return {
    id: r.id,
    scheduleId: r.scheduleId,
    studentEmail: r.studentEmail,
    studentName: r.studentName ?? null,
    status: r.status,
    markedById: r.markedById,
    markedAt: r.markedAt.toISOString(),
    notes: r.notes ?? null,
  };
}

function parseBulkInput(raw: unknown): BulkAttendanceInput {
  if (!raw || typeof raw !== "object") throw new AuthError("Invalid input", "INVALID_INPUT", 400);
  const obj = raw as Record<string, unknown>;

  if (typeof obj.scheduleId !== "string" || !obj.scheduleId.trim()) {
    throw new AuthError("scheduleId is required", "INVALID_INPUT", 400);
  }

  if (!Array.isArray(obj.attendances) || obj.attendances.length === 0) {
    throw new AuthError("attendances array is required and must not be empty", "INVALID_INPUT", 400);
  }

  const attendances: StudentAttendanceInput[] = obj.attendances.map((item: unknown, idx: number) => {
    if (!item || typeof item !== "object") throw new AuthError(`attendances[${idx}] is invalid`, "INVALID_INPUT", 400);
    const a = item as Record<string, unknown>;

    if (typeof a.studentEmail !== "string" || !a.studentEmail.includes("@")) {
      throw new AuthError(`attendances[${idx}].studentEmail is required`, "INVALID_INPUT", 400);
    }
    const status = typeof a.status === "string" ? a.status.toUpperCase() : "ABSENT";
    if (!ALLOWED_STATUSES.has(status)) {
      throw new AuthError(`attendances[${idx}].status must be PRESENT, ABSENT, or JUSTIFIED`, "INVALID_INPUT", 400);
    }

    return {
      studentEmail: a.studentEmail.toLowerCase().trim(),
      studentName: typeof a.studentName === "string" ? a.studentName.trim() : undefined,
      status,
      notes: typeof a.notes === "string" ? a.notes.trim() : undefined,
    };
  });

  return { scheduleId: obj.scheduleId.trim(), attendances };
}

export class AttendanceService {
  constructor(private readonly repo = new AttendanceRepository()) {}

  async recordBulkAttendance(rawInput: unknown, markedById: string): Promise<AttendanceView[]> {
    const input = parseBulkInput(rawInput);

    // Verificar que el schedule pertenece al tutor autenticado
    const isOwner = await this.repo.verifyScheduleOwnership(input.scheduleId, markedById);
    if (!isOwner) {
      throw new AuthError(
        "Schedule not found or you do not have permission to record attendance for it",
        "FORBIDDEN",
        403
      );
    }

    const results = await Promise.all(
      input.attendances.map((a) =>
        this.repo.upsert({
          scheduleId: input.scheduleId,
          studentEmail: a.studentEmail,
          studentName: a.studentName,
          status: a.status as "PRESENT" | "ABSENT" | "JUSTIFIED",
          markedById,
          notes: a.notes,
        })
      )
    );

    return results.map(toView);
  }

  async getAttendancesBySchedule(scheduleId: string): Promise<AttendanceView[]> {
    const records = await this.repo.findBySchedule(scheduleId);
    return records.map(toView);
  }
}
