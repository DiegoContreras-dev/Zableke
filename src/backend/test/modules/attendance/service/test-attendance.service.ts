import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import type { CurrentUserLike } from "@/backend/common/guards/role.guard";
import { AttendanceService } from "@/backend/modules/attendance/service/attendance.service";

const TUTOR_USER: CurrentUserLike = { id: "user-1", roles: ["TUTOR"] };
const ADMIN_USER: CurrentUserLike = { id: "admin-1", roles: ["ADMIN"] };
const OTHER_TUTOR: CurrentUserLike = { id: "otro-user", roles: ["TUTOR"] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "att-1",
    scheduleId: "sch-1",
    studentEmail: "student@ucn.cl",
    studentName: "Estudiante Demo",
    status: "PRESENT" as const,
    markedById: "user-1",
    markedAt: new Date("2026-04-15T10:00:00Z"),
    notes: null,
    ...overrides,
  };
}

function makeScheduleRecord(overrides: Record<string, unknown> = {}) {
  return {
    ...makeRecord(),
    schedule: {
      id: "sch-1",
      title: "Cálculo I",
      description: "P1",
      startsAt: new Date("2026-04-15T09:00:00Z"),
      endsAt: new Date("2026-04-15T10:30:00Z"),
      status: "ACTIVE",
      room: { name: "Lab 207" },
      tutoringSlot: {
        offering: { semester: "2026-1" },
      },
    },
    ...overrides,
  };
}

function makeRepoMock(overrides: Record<string, unknown> = {}) {
  return {
    verifyScheduleOwnership: async () => true,
    upsert: async (input: Record<string, unknown>) =>
      makeRecord({ studentEmail: input["studentEmail"], status: input["status"] }),
    findBySchedule: async () => [makeRecord()],
    findByTutor: async () => [makeScheduleRecord()],
    ...overrides,
  };
}

// ─── recordBulkAttendance — validaciones de entrada ───────────────────────────

test("AttendanceService.recordBulkAttendance rechaza input nulo", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  await assert.rejects(
    () => service.recordBulkAttendance(null, TUTOR_USER),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("AttendanceService.recordBulkAttendance rechaza scheduleId vacío", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  await assert.rejects(
    () =>
      service.recordBulkAttendance(
        { scheduleId: "", attendances: [{ studentEmail: "s@ucn.cl", status: "PRESENT" }] },
        TUTOR_USER
      ),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("AttendanceService.recordBulkAttendance rechaza array de asistencias vacío", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  await assert.rejects(
    () => service.recordBulkAttendance({ scheduleId: "sch-1", attendances: [] }, TUTOR_USER),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("AttendanceService.recordBulkAttendance rechaza email inválido", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  await assert.rejects(
    () =>
      service.recordBulkAttendance(
        {
          scheduleId: "sch-1",
          attendances: [{ studentEmail: "no-es-email", status: "PRESENT" }],
        },
        TUTOR_USER
      ),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("AttendanceService.recordBulkAttendance rechaza status inválido", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  await assert.rejects(
    () =>
      service.recordBulkAttendance(
        {
          scheduleId: "sch-1",
          attendances: [{ studentEmail: "s@ucn.cl", status: "UNKNOWN" }],
        },
        TUTOR_USER
      ),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("AttendanceService.recordBulkAttendance lanza FORBIDDEN si el tutor no es dueño", async () => {
  const repoMock = makeRepoMock({ verifyScheduleOwnership: async () => false });
  const service = new AttendanceService(repoMock as never);

  await assert.rejects(
    () =>
      service.recordBulkAttendance(
        {
          scheduleId: "sch-1",
          attendances: [{ studentEmail: "s@ucn.cl", status: "PRESENT" }],
        },
        OTHER_TUTOR
      ),
    (err) => err instanceof AuthError && err.code === "FORBIDDEN"
  );
});

test("AttendanceService.recordBulkAttendance permite al admin registrar sin ser dueño", async () => {
  const repoMock = makeRepoMock({ verifyScheduleOwnership: async () => false });
  const service = new AttendanceService(repoMock as never);

  const result = await service.recordBulkAttendance(
    {
      scheduleId: "sch-1",
      attendances: [{ studentEmail: "s@ucn.cl", status: "PRESENT" }],
    },
    ADMIN_USER
  );

  assert.equal(result.length, 1);
});

test("AttendanceService.recordBulkAttendance guarda y retorna AttendanceView[]", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  const result = await service.recordBulkAttendance(
    {
      scheduleId: "sch-1",
      attendances: [
        { studentEmail: "a@ucn.cl", status: "PRESENT" },
        { studentEmail: "b@ucn.cl", status: "ABSENT" },
      ],
    },
    TUTOR_USER
  );

  assert.equal(result.length, 2);
  assert.ok(result.every((r) => typeof r.markedAt === "string"));
  assert.ok(result.every((r) => typeof r.scheduleId === "string"));
});

test("AttendanceService.recordBulkAttendance normaliza emails a minúscula", async () => {
  let capturedEmail = "";
  const repoMock = makeRepoMock({
    upsert: async (input: Record<string, unknown>) => {
      capturedEmail = input["studentEmail"] as string;
      return makeRecord({ studentEmail: capturedEmail });
    },
  });
  const service = new AttendanceService(repoMock as never);

  await service.recordBulkAttendance(
    {
      scheduleId: "sch-1",
      attendances: [{ studentEmail: "UPPER@UCN.CL", status: "PRESENT" }],
    },
    TUTOR_USER
  );

  assert.equal(capturedEmail, "upper@ucn.cl");
});

test("AttendanceService.recordBulkAttendance acepta status en minúscula (normaliza a mayúscula)", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  // No debe lanzar: "present" → "PRESENT"
  const result = await service.recordBulkAttendance(
    {
      scheduleId: "sch-1",
      attendances: [{ studentEmail: "a@ucn.cl", status: "present" }],
    },
    TUTOR_USER
  );

  assert.equal(result.length, 1);
});

// ─── getAttendancesBySchedule ─────────────────────────────────────────────────

test("AttendanceService.getAttendancesBySchedule retorna AttendanceView[]", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  const result = await service.getAttendancesBySchedule("sch-1");

  assert.equal(result.length, 1);
  assert.equal(result[0]?.scheduleId, "sch-1");
  assert.equal(result[0]?.status, "PRESENT");
  // markedAt debe ser ISO string
  assert.match(result[0]!.markedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("AttendanceService.getAttendancesBySchedule retorna array vacío si no hay registros", async () => {
  const repoMock = makeRepoMock({ findBySchedule: async () => [] });
  const service = new AttendanceService(repoMock as never);

  const result = await service.getAttendancesBySchedule("sch-99");

  assert.deepEqual(result, []);
});

// ─── getMyAttendanceHistory ───────────────────────────────────────────────────

test("AttendanceService.getMyAttendanceHistory retorna AttendanceHistoryItem[]", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  const result = await service.getMyAttendanceHistory("user-1");

  assert.equal(result.length, 1);
  assert.equal(result[0]?.scheduleTitle, "Cálculo I");
  assert.equal(result[0]?.semester, "2026-1");
  assert.equal(result[0]?.roomName, "Lab 207");
  assert.match(result[0]!.scheduleStartsAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(result[0]!.scheduleEndsAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("AttendanceService.getMyAttendanceHistory incluye scheduleDescription nulo si no existe", async () => {
  const repoMock = makeRepoMock({
    findByTutor: async () => [
      makeScheduleRecord({
        schedule: {
          id: "sch-2",
          title: "Física II",
          description: null,
          startsAt: new Date("2026-04-10T08:00:00Z"),
          endsAt: new Date("2026-04-10T09:30:00Z"),
          status: "COMPLETED",
          room: null,
        },
      }),
    ],
  });
  const service = new AttendanceService(repoMock as never);

  const result = await service.getMyAttendanceHistory("user-1");

  assert.equal(result[0]?.scheduleDescription, null);
  assert.equal(result[0]?.roomName, null);
  assert.equal(result[0]?.scheduleStatus, "COMPLETED");
});

test("AttendanceService.getMyAttendanceHistory retorna vacío si el tutor no ha marcado asistencias", async () => {
  const repoMock = makeRepoMock({ findByTutor: async () => [] });
  const service = new AttendanceService(repoMock as never);

  const result = await service.getMyAttendanceHistory("user-sin-asistencias");

  assert.deepEqual(result, []);
});

test("AttendanceService.getMyAttendanceHistory filtra por los semestres seleccionados", async () => {
  let receivedUserId = "";
  let receivedSemesters: string[] | undefined;
  const repoMock = makeRepoMock({
    findByTutor: async (userId: string, semesters?: string[]) => {
      receivedUserId = userId;
      receivedSemesters = semesters;
      return [makeScheduleRecord()];
    },
  });
  const service = new AttendanceService(repoMock as never);

  await service.getMyAttendanceHistory("user-1", ["2026-1", "2026-2", "2026-1"]);

  assert.equal(receivedUserId, "user-1");
  assert.deepEqual(receivedSemesters, ["2026-1", "2026-2"]);
});

test("AttendanceService.getMyAttendanceHistory rechaza un semestre inválido", async () => {
  const service = new AttendanceService(makeRepoMock() as never);

  await assert.rejects(
    () => service.getMyAttendanceHistory("user-1", ["primer semestre"]),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT",
  );
});
