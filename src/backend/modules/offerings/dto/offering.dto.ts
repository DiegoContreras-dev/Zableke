import { AuthError } from "@/backend/common/errors/auth.error";
import { DayOfWeek, EnrollmentSource } from "@prisma/client";

const SEMESTER_RE = /^\d{4}-[12]$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface CreateOfferingInput {
  name: string;
  semester?: string;
  targetCareers?: string[];
}

export interface UpdateOfferingInput {
  name?: string;
  status?: "OPEN" | "CLOSED";
  targetCareers?: string[];
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
  studentRut?: string;
  studentCareer?: string;
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
    targetCareers: parseStringArray(obj.targetCareers),
  };
}

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new AuthError("targetCareers must be an array of strings", "INVALID_INPUT", 400);
  }
  return value.map((v) => {
    if (typeof v !== "string" || !v.trim()) {
      throw new AuthError("Each career in targetCareers must be a non-empty string", "INVALID_INPUT", 400);
    }
    return v.trim();
  });
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
  if (obj.targetCareers !== undefined) {
    result.targetCareers = parseStringArray(obj.targetCareers);
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

export interface UpdateSlotInput {
  tutorId?: string;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  roomName?: string | null;
  maxCapacity?: number;
}

export function parseUpdateSlotInput(raw: unknown): UpdateSlotInput {
  const obj = readObject(raw, "UpdateSlot input");
  const result: UpdateSlotInput = {};

  if (typeof obj.tutorId === "string") {
    const v = obj.tutorId.trim();
    if (!v) throw new AuthError("tutorId cannot be empty", "INVALID_INPUT", 400);
    result.tutorId = v;
  }

  if (typeof obj.dayOfWeek === "string") {
    const day = obj.dayOfWeek.toUpperCase();
    if (!Object.values(DayOfWeek).includes(day as DayOfWeek)) {
      throw new AuthError("dayOfWeek is invalid", "INVALID_INPUT", 400);
    }
    result.dayOfWeek = day as DayOfWeek;
  }

  if (obj.startTime !== undefined || obj.endTime !== undefined) {
    const startTime = parseTime(obj.startTime, "startTime");
    const endTime = parseTime(obj.endTime, "endTime");
    if (endTime <= startTime) {
      throw new AuthError("endTime must be after startTime", "INVALID_INPUT", 400);
    }
    result.startTime = startTime;
    result.endTime = endTime;
  }

  if (obj.roomName !== undefined) {
    result.roomName = typeof obj.roomName === "string" ? obj.roomName.trim() || null : null;
  }

  if (obj.maxCapacity !== undefined) {
    const maxCapacity = typeof obj.maxCapacity === "number" ? obj.maxCapacity : Number(obj.maxCapacity);
    if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
      throw new AuthError("maxCapacity must be a positive integer", "INVALID_INPUT", 400);
    }
    result.maxCapacity = maxCapacity;
  }

  return result;
}

export function parseCreateEnrollmentInput(raw: unknown): CreateEnrollmentInput {
  const obj = readObject(raw, "Enrollment input");
  const studentEmail = readRequiredString(obj, "studentEmail").toLowerCase();
  if (!studentEmail.includes("@")) {
    throw new AuthError("studentEmail is invalid", "INVALID_INPUT", 400);
  }

  let finalPhone = typeof obj.studentPhone === "string" ? obj.studentPhone.trim() || undefined : undefined;
  if (finalPhone) {
    let cleanPhone = finalPhone.replace(/[^\d+]/g, '');
    if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
      cleanPhone = '+56' + cleanPhone;
    } else if (cleanPhone.startsWith('569') && cleanPhone.length === 11) {
      cleanPhone = '+' + cleanPhone;
    }
    if (cleanPhone.startsWith('+569') && cleanPhone.length === 12) {
      finalPhone = `+56 9 ${cleanPhone.slice(4, 8)} ${cleanPhone.slice(8)}`;
    } else {
      finalPhone = cleanPhone;
    }
  }

  let finalRut = typeof obj.studentRut === "string" ? obj.studentRut.trim() || undefined : undefined;
  if (finalRut) {
    const cleanRut = finalRut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleanRut.length >= 2) {
      const dv = cleanRut.slice(-1);
      const numberStr = cleanRut.slice(0, -1);
      // Format number with dots
      const formattedNumber = numberStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      finalRut = `${formattedNumber}-${dv}`;
    } else {
      finalRut = cleanRut;
    }
  }

  return {
    slotId: readRequiredString(obj, "slotId"),
    studentEmail,
    studentName: readRequiredString(obj, "studentName"),
    studentRut: finalRut,
    studentCareer: typeof obj.studentCareer === "string" ? obj.studentCareer.trim() || undefined : undefined,
    studentPhone: finalPhone,
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
