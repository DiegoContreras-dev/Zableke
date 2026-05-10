import { AuthError } from "@/backend/common/errors/auth.error";
import { DayOfWeek, EnrollmentSource } from "@prisma/client";

const SEMESTER_RE = /^\d{4}-[12]$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface CreateOfferingInput {
  name: string;
  semester?: string;
}

export interface UpdateOfferingInput {
  name?: string;
  status?: "OPEN" | "CLOSED";
}

export interface CreateSlotInput {
  offeringId: string;
  tutorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomName?: string;
  maxCapacity: number;
}

export interface CreateEnrollmentInput {
  slotId: string;
  studentEmail: string;
  studentName: string;
  studentPhone?: string;
  source: EnrollmentSource;
  googleFormResponseId?: string;
}

export function getCurrentSemester(date = new Date()): string {
  const year = date.getFullYear();
  const semester = date.getMonth() <= 6 ? 1 : 2;
  return `${year}-${semester}`;
}

function readObject(raw: unknown, label: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new AuthError(`${label} is invalid`, "INVALID_INPUT", 400);
  }
  return raw as Record<string, unknown>;
}

function readRequiredString(obj: Record<string, unknown>, field: string): string {
  const value = typeof obj[field] === "string" ? obj[field].trim() : "";
  if (!value) {
    throw new AuthError(`${field} is required`, "INVALID_INPUT", 400);
  }
  return value;
}

function parseSemester(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !SEMESTER_RE.test(value.trim())) {
    throw new AuthError("semester must use YYYY-1 or YYYY-2 format", "INVALID_INPUT", 400);
  }
  return value.trim();
}

function parseTime(value: unknown, field: string): string {
  if (typeof value !== "string" || !TIME_RE.test(value.trim())) {
    throw new AuthError(`${field} must use HH:mm format`, "INVALID_INPUT", 400);
  }
  return value.trim();
}

export function parseCreateOfferingInput(raw: unknown): CreateOfferingInput {
  const obj = readObject(raw, "Offering input");
  return {
    name: readRequiredString(obj, "name"),
    semester: parseSemester(obj.semester),
  };
}

export function parseUpdateOfferingInput(raw: unknown): UpdateOfferingInput {
  const obj = readObject(raw, "Offering input");
  const result: UpdateOfferingInput = {};

  if (typeof obj.name === "string") {
    const name = obj.name.trim();
    if (!name) throw new AuthError("name cannot be empty", "INVALID_INPUT", 400);
    result.name = name;
  }
  if (typeof obj.status === "string") {
    const status = obj.status.toUpperCase();
    if (status !== "OPEN" && status !== "CLOSED") {
      throw new AuthError("status must be OPEN or CLOSED", "INVALID_INPUT", 400);
    }
    result.status = status;
  }

  return result;
}

export function parseCreateSlotInput(raw: unknown): CreateSlotInput {
  const obj = readObject(raw, "Slot input");
  const day = typeof obj.dayOfWeek === "string" ? obj.dayOfWeek.toUpperCase() : "";
  if (!Object.values(DayOfWeek).includes(day as DayOfWeek)) {
    throw new AuthError("dayOfWeek is invalid", "INVALID_INPUT", 400);
  }

  const startTime = parseTime(obj.startTime, "startTime");
  const endTime = parseTime(obj.endTime, "endTime");
  if (endTime <= startTime) {
    throw new AuthError("endTime must be after startTime", "INVALID_INPUT", 400);
  }

  const maxCapacity = typeof obj.maxCapacity === "number" ? obj.maxCapacity : 30;
  if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
    throw new AuthError("maxCapacity must be a positive integer", "INVALID_INPUT", 400);
  }

  return {
    offeringId: readRequiredString(obj, "offeringId"),
    tutorId: readRequiredString(obj, "tutorId"),
    dayOfWeek: day as DayOfWeek,
    startTime,
    endTime,
    roomName: typeof obj.roomName === "string" ? obj.roomName.trim() || undefined : undefined,
    maxCapacity,
  };
}

export function parseCreateEnrollmentInput(raw: unknown): CreateEnrollmentInput {
  const obj = readObject(raw, "Enrollment input");
  const studentEmail = readRequiredString(obj, "studentEmail").toLowerCase();
  if (!studentEmail.includes("@")) {
    throw new AuthError("studentEmail is invalid", "INVALID_INPUT", 400);
  }

  return {
    slotId: readRequiredString(obj, "slotId"),
    studentEmail,
    studentName: readRequiredString(obj, "studentName"),
    studentPhone: typeof obj.studentPhone === "string" ? obj.studentPhone.trim() || undefined : undefined,
    source: typeof obj.source === "string" && obj.source.toUpperCase() === "GOOGLE_FORM" ? EnrollmentSource.GOOGLE_FORM : EnrollmentSource.MANUAL,
    googleFormResponseId: typeof obj.googleFormResponseId === "string" ? obj.googleFormResponseId.trim() || undefined : undefined,
  };
}

export function parseDateOnly(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new AuthError("date must use YYYY-MM-DD format", "INVALID_INPUT", 400);
  }
  return value.trim();
}
