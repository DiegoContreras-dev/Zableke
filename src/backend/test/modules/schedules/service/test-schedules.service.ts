import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { SchedulesService } from "@/backend/modules/schedules/service/schedules.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_DATE = new Date("2026-04-15T09:00:00Z");
const BASE_DATE_END = new Date("2026-04-15T10:30:00Z");

function makeScheduleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sch-1",
    tutorId: "tutor-1",
    roomId: "room-1",
    createdById: "user-1",
    title: "Cálculo I",
    description: "Sección P1",
    startsAt: BASE_DATE,
    endsAt: BASE_DATE_END,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    room: { name: "Lab 207", location: "Edif. A" },
    ...overrides,
  };
}

function makeRepoMock(overrides: Record<string, unknown> = {}) {
  return {
    findById: async (id: string) => (id === "sch-1" ? makeScheduleRow() : null),
    findTutorIdByUserId: async (userId: string) => (userId === "user-1" ? "tutor-1" : null),
    findAllByTutor: async () => [makeScheduleRow()],
    findAll: async () => [makeScheduleRow()],
    checkConflicts: async () => ({ tutorConflict: null, roomConflict: null }),
    create: async (data: Record<string, unknown>) =>
      makeScheduleRow({ title: data["title"], description: data["description"] ?? null }),
    update: async (_id: string, data: Record<string, unknown>) =>
      makeScheduleRow({ ...data }),
    cancel: async () => makeScheduleRow({ status: "CANCELLED" }),
    ...overrides,
  };
}

// ─── getSchedule ──────────────────────────────────────────────────────────────

test("SchedulesService.getSchedule retorna ScheduleView para id existente", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.getSchedule("sch-1");

  assert.equal(result.id, "sch-1");
  assert.equal(result.title, "Cálculo I");
  assert.equal(result.roomName, "Lab 207");
  assert.match(result.startsAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(result.endsAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("SchedulesService.getSchedule lanza RESOURCE_NOT_FOUND para id inexistente", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  await assert.rejects(
    () => service.getSchedule("no-existe"),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

// ─── getSchedulesByTutor ──────────────────────────────────────────────────────

test("SchedulesService.getSchedulesByTutor retorna schedules del tutor", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.getSchedulesByTutor("user-1");

  assert.equal(result.length, 1);
  assert.equal(result[0]?.tutorId, "tutor-1");
});

test("SchedulesService.getSchedulesByTutor retorna vacío si el usuario no tiene perfil tutor", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.getSchedulesByTutor("user-sin-perfil");

  assert.deepEqual(result, []);
});

// ─── createSchedule ───────────────────────────────────────────────────────────

test("SchedulesService.createSchedule crea y retorna el schedule", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.createSchedule(
    {
      tutorId: "tutor-1",
      roomId: "room-1",
      title: "Álgebra Lineal",
      startsAt: "2026-05-01T09:00:00Z",
      endsAt: "2026-05-01T10:30:00Z",
    },
    "user-1"
  );

  assert.equal(result.title, "Álgebra Lineal");
  assert.equal(result.status, "ACTIVE");
});

test("SchedulesService.createSchedule lanza INVALID_INPUT con tutorId vacío", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  await assert.rejects(
    () =>
      service.createSchedule(
        {
          tutorId: "",
          roomId: "room-1",
          title: "Test",
          startsAt: "2026-05-01T09:00:00Z",
          endsAt: "2026-05-01T10:30:00Z",
        },
        "user-1"
      ),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("SchedulesService.createSchedule lanza INVALID_INPUT cuando endsAt <= startsAt", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  await assert.rejects(
    () =>
      service.createSchedule(
        {
          tutorId: "tutor-1",
          roomId: "room-1",
          title: "Test",
          startsAt: "2026-05-01T10:00:00Z",
          endsAt: "2026-05-01T09:00:00Z",
        },
        "user-1"
      ),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("SchedulesService.createSchedule lanza TUTOR_SCHEDULE_CONFLICT cuando hay conflicto de tutor", async () => {
  const repoMock = makeRepoMock({
    checkConflicts: async () => ({
      tutorConflict: makeScheduleRow({ id: "sch-conflict" }),
      roomConflict: null,
    }),
  });
  const service = new SchedulesService(repoMock as never);

  await assert.rejects(
    () =>
      service.createSchedule(
        {
          tutorId: "tutor-1",
          roomId: "room-1",
          title: "Conflicto",
          startsAt: "2026-05-01T09:00:00Z",
          endsAt: "2026-05-01T10:30:00Z",
        },
        "user-1"
      ),
    (err) => err instanceof AuthError && err.code === "TUTOR_SCHEDULE_CONFLICT"
  );
});

test("SchedulesService.createSchedule lanza ROOM_SCHEDULE_CONFLICT cuando hay conflicto de sala", async () => {
  const repoMock = makeRepoMock({
    checkConflicts: async () => ({
      tutorConflict: null,
      roomConflict: makeScheduleRow({ id: "sch-room-conflict" }),
    }),
  });
  const service = new SchedulesService(repoMock as never);

  await assert.rejects(
    () =>
      service.createSchedule(
        {
          tutorId: "tutor-1",
          roomId: "room-ocupada",
          title: "Conflicto sala",
          startsAt: "2026-05-01T09:00:00Z",
          endsAt: "2026-05-01T10:30:00Z",
        },
        "user-1"
      ),
    (err) => err instanceof AuthError && err.code === "ROOM_SCHEDULE_CONFLICT"
  );
});

// ─── updateSchedule ───────────────────────────────────────────────────────────

test("SchedulesService.updateSchedule lanza RESOURCE_NOT_FOUND para schedule inexistente", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  await assert.rejects(
    () => service.updateSchedule({ id: "no-existe", title: "Nuevo" }),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

test("SchedulesService.updateSchedule lanza INVALID_STATE si el schedule no está ACTIVE", async () => {
  const repoMock = makeRepoMock({
    findById: async () => makeScheduleRow({ status: "CANCELLED" }),
  });
  const service = new SchedulesService(repoMock as never);

  await assert.rejects(
    () => service.updateSchedule({ id: "sch-1", title: "Intento actualizar cancelado" }),
    (err) => err instanceof AuthError && err.code === "INVALID_STATE"
  );
});

test("SchedulesService.updateSchedule retorna schedule actualizado", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.updateSchedule({ id: "sch-1", title: "Título actualizado" });

  assert.ok(result.id);
  assert.equal(result.status, "ACTIVE");
});

// ─── cancelSchedule ───────────────────────────────────────────────────────────

test("SchedulesService.cancelSchedule lanza RESOURCE_NOT_FOUND para id inexistente", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  await assert.rejects(
    () => service.cancelSchedule("no-existe"),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

test("SchedulesService.cancelSchedule lanza INVALID_STATE si ya está cancelado", async () => {
  const repoMock = makeRepoMock({
    findById: async () => makeScheduleRow({ status: "CANCELLED" }),
  });
  const service = new SchedulesService(repoMock as never);

  await assert.rejects(
    () => service.cancelSchedule("sch-1"),
    (err) => err instanceof AuthError && err.code === "INVALID_STATE"
  );
});

test("SchedulesService.cancelSchedule retorna schedule con status CANCELLED", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.cancelSchedule("sch-1");

  assert.equal(result.status, "CANCELLED");
});

// ─── getAllSchedules ──────────────────────────────────────────────────────────

test("SchedulesService.getAllSchedules retorna todos los schedules", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.getAllSchedules();

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "sch-1");
});

test("SchedulesService ScheduleView tiene campos ISO para fechas", async () => {
  const service = new SchedulesService(makeRepoMock() as never);

  const result = await service.getSchedule("sch-1");

  assert.match(result.startsAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.match(result.endsAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.match(result.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(result.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
