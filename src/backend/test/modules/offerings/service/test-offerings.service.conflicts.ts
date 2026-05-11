import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { OfferingsService } from "@/backend/modules/offerings/service/offerings.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_INPUT = {
  offeringId: "offering-1",
  tutorId: "tutor-1",
  dayOfWeek: "MONDAY" as const,
  startTime: "09:55",
  endTime: "11:25",
  maxCapacity: 30,
  roomName: "207",
};

function makeSlotRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "slot-1",
    offeringId: "offering-1",
    tutorId: "tutor-1",
    dayOfWeek: "MONDAY",
    startTime: "09:55",
    endTime: "11:25",
    maxCapacity: 30,
    roomName: "207",
    googleFormOptionLabel: null,
    offering: { id: "offering-1", name: "Cálculo I", status: "OPEN", semester: "2026-1" },
    tutor: { user: { firstName: "Ana", lastName: "García", email: "ana@ucn.cl" } },
    _count: { enrollments: 0 },
    ...overrides,
  };
}

function makeOfferingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "offering-1",
    name: "Cálculo I",
    semester: "2026-1",
    status: "OPEN",
    googleFormQuestionId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    slots: [],
    _count: { slots: 0, enrollments: 0 },
    ...overrides,
  };
}

function makeTutorRecord() {
  return {
    id: "tutor-1",
    userId: "user-1",
    isActive: true,
    user: { firstName: "Ana", lastName: "García", email: "ana@ucn.cl", isActive: true },
  };
}

/** Crea un mock del repo con todas las operaciones necesarias. */
function makeRepoMock(overrides: Record<string, unknown> = {}) {
  return {
    // offerings
    findOfferingById: async (id: string) =>
      id === "offering-1" ? makeOfferingRecord() : null,
    updateOffering: async (_id: string, data: Record<string, unknown>) =>
      makeOfferingRecord(data),
    createOffering: async (data: Record<string, unknown>) => makeOfferingRecord(data),
    findOfferingsBySemester: async () => [],
    deleteOffering: async () => undefined,

    // tutors
    findTutorById: async (id: string) => (id === "tutor-1" ? makeTutorRecord() : null),
    findTutorIdByUserId: async () => "tutor-1",
    findTutorOptions: async () => [makeTutorRecord()],

    // slots
    createSlot: async (data: Record<string, unknown>) => makeSlotRecord(data),
    findSlotById: async (id: string) => (id === "slot-1" ? makeSlotRecord() : null),
    findSlotsByTutor: async () => [makeSlotRecord()],
    deleteSlot: async () => undefined,
    updateSlotGoogleLabel: async () => undefined,

    // conflict checks  ← las dos claves bajo test
    findTutorSlotConflict: async () => null,
    findRoomSlotConflict: async () => null,

    // enrollments
    createEnrollment: async () => ({
      id: "enr-1",
      slotId: "slot-1",
      offeringId: "offering-1",
      studentEmail: "e@ucn.cl",
      studentName: "Estudiante",
      studentPhone: null,
      source: "MANUAL",
      googleFormResponseId: null,
      enrolledAt: new Date(),
    }),
    findEnrollmentsBySlot: async () => [],
    countEnrollmentsBySlot: async () => 0,
    createManyEnrollments: async () => 0,
    hasProcessedResponse: async () => false,

    // google forms / attendance
    upsertGoogleFormLink: async () => ({
      semester: "2026-1",
      formId: "f1",
      formUrl: "https://forms.google.com/f1",
      formEditUrl: null,
    }),
    findGoogleFormLink: async () => null,
    markGoogleFormSynced: async () => undefined,
    getOrCreateScheduleForSlot: async () => null,
    findAttendanceBySchedule: async () => [],

    ...overrides,
  };
}

// ─── addSlot — camino feliz ───────────────────────────────────────────────────

test("OfferingsService.addSlot crea el slot cuando no hay conflictos", async () => {
  const service = new OfferingsService(makeRepoMock() as never);

  const result = await service.addSlot(BASE_INPUT);

  assert.equal(result.tutorId, "tutor-1");
  assert.equal(result.dayOfWeek, "MONDAY");
  assert.equal(result.startTime, "09:55");
  assert.equal(result.endTime, "11:25");
});

// ─── addSlot — oferta cerrada ─────────────────────────────────────────────────

test("OfferingsService.addSlot lanza INVALID_STATE si la oferta está cerrada", async () => {
  const repo = makeRepoMock({
    findOfferingById: async () => makeOfferingRecord({ status: "CLOSED" }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.addSlot(BASE_INPUT),
    (err) => err instanceof AuthError && err.code === "INVALID_STATE"
  );
});

// ─── addSlot — tutor inactivo ─────────────────────────────────────────────────

test("OfferingsService.addSlot lanza RESOURCE_NOT_FOUND si el tutor no existe", async () => {
  const repo = makeRepoMock({
    findTutorById: async () => null,
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.addSlot(BASE_INPUT),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

test("OfferingsService.addSlot lanza RESOURCE_NOT_FOUND si el tutor está inactivo", async () => {
  const repo = makeRepoMock({
    findTutorById: async () => ({ ...makeTutorRecord(), isActive: false }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.addSlot(BASE_INPUT),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

// ─── addSlot — conflicto de TUTOR ────────────────────────────────────────────

test("OfferingsService.addSlot lanza TUTOR_SCHEDULE_CONFLICT cuando el tutor ya tiene ese bloque", async () => {
  const repo = makeRepoMock({
    findTutorSlotConflict: async () => ({ id: "slot-existing" }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.addSlot(BASE_INPUT),
    (err) => err instanceof AuthError && err.code === "TUTOR_SCHEDULE_CONFLICT"
  );
});

test("OfferingsService.addSlot prioriza el error de tutor sobre el de sala si ambos existen", async () => {
  const repo = makeRepoMock({
    findTutorSlotConflict: async () => ({ id: "slot-tutor-conflict" }),
    findRoomSlotConflict: async () => ({ id: "slot-room-conflict" }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.addSlot(BASE_INPUT),
    (err) => err instanceof AuthError && err.code === "TUTOR_SCHEDULE_CONFLICT"
  );
});

// ─── addSlot — conflicto de SALA ─────────────────────────────────────────────

test("OfferingsService.addSlot lanza ROOM_SCHEDULE_CONFLICT cuando la sala ya está ocupada", async () => {
  const repo = makeRepoMock({
    findRoomSlotConflict: async () => ({ id: "slot-room-existing" }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.addSlot({ ...BASE_INPUT, roomName: "207" }),
    (err) => err instanceof AuthError && err.code === "ROOM_SCHEDULE_CONFLICT"
  );
});

test("OfferingsService.addSlot NO verifica conflicto de sala si roomName no se provee", async () => {
  let roomCheckCalled = false;
  const repo = makeRepoMock({
    findRoomSlotConflict: async () => {
      roomCheckCalled = true;
      return { id: "would-conflict" };
    },
  });
  const service = new OfferingsService(repo as never);

  // Sin roomName → debe crear el slot sin lanzar error de sala
  const result = await service.addSlot({ ...BASE_INPUT, roomName: undefined });
  assert.ok(result.id, "Debe retornar el slot creado");
  assert.equal(roomCheckCalled, false, "No debe consultar conflicto de sala sin roomName");
});

// ─── addSlot — mensaje de error describe la sala ─────────────────────────────

test("OfferingsService.addSlot incluye el nombre de la sala en el mensaje de error de sala", async () => {
  const repo = makeRepoMock({
    findRoomSlotConflict: async () => ({ id: "slot-conflict" }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.addSlot({ ...BASE_INPUT, roomName: "Sala 301" }),
    (err) => {
      assert.ok(err instanceof AuthError);
      assert.ok(
        err.message.includes("Sala 301"),
        `El mensaje debe incluir el nombre de la sala. Recibido: "${err.message}"`
      );
      return true;
    }
  );
});
