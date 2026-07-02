import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { OfferingsService } from "@/backend/modules/offerings/service/offerings.service";
import { parseUpdateSlotInput } from "@/backend/modules/offerings/dto/offering.dto";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    _count: { enrollments: 5 },
    ...overrides,
  };
}

function makeTutorRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "tutor-1",
    userId: "user-1",
    isActive: true,
    user: { firstName: "Ana", lastName: "García", email: "ana@ucn.cl", isActive: true },
    ...overrides,
  };
}

function makeGoogleFormLinkRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "link-1",
    semester: "2026-1",
    formId: "form-abc",
    formUrl: "https://forms.google.com/form-abc",
    formEditUrl: "https://forms.google.com/form-abc/edit",
    lastSyncedAt: new Date("2026-06-01T12:00:00Z"),
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T12:00:00Z"),
    ...overrides,
  };
}

function makeRepoMock(overrides: Record<string, unknown> = {}) {
  return {
    findSlotById: async (id: string) => (id === "slot-1" ? makeSlotRecord() : null),
    findTutorById: async (id: string) => (id === "tutor-1" ? makeTutorRecord() : null),
    findTutorSlotConflict: async () => null,
    findRoomSlotConflict: async () => null,
    updateSlot: async (_id: string, data: Record<string, unknown>) => {
      // Prisma ignora los campos undefined; el mock debe hacer lo mismo
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) clean[k] = v;
      }
      return makeSlotRecord(clean);
    },
    findAllGoogleFormLinks: async () => [makeGoogleFormLinkRecord()],
    deleteGoogleFormLink: async () => undefined,
    // stubs for other repo methods used in OfferingsService
    findOfferingById: async () => null,
    findOfferingsBySemester: async () => [],
    findTutorIdByUserId: async () => null,
    findTutorOptions: async () => [],
    createOffering: async () => ({}),
    updateOffering: async () => ({}),
    deleteOffering: async () => undefined,
    createSlot: async () => makeSlotRecord(),
    deleteSlot: async () => undefined,
    updateSlotGoogleLabel: async () => undefined,
    createEnrollment: async () => ({}),
    findEnrollmentsBySlot: async () => [],
    countEnrollmentsBySlot: async () => 0,
    removeEnrollment: async () => undefined,
    createManyEnrollments: async () => 0,
    hasProcessedResponse: async () => false,
    upsertGoogleFormLink: async () => ({}),
    findGoogleFormLink: async () => null,
    markGoogleFormSynced: async () => undefined,
    getOrCreateScheduleForSlot: async () => null,
    findAttendanceBySchedule: async () => [],
    findTutorStats: async () => [],
    findReportStats: async () => ({ offerings: [], careerGroups: [] }),
    findAllEnrollments: async () => [],
    findSlotsByTutor: async () => [],
    findOfferingRecord: async () => null,
    ...overrides,
  };
}

// ─── updateSlot — camino feliz ────────────────────────────────────────────────

test("OfferingsService.updateSlot actualiza el slot y retorna SlotView", async () => {
  const service = new OfferingsService(makeRepoMock() as never);

  const result = await service.updateSlot("slot-1", {
    dayOfWeek: "TUESDAY",
    maxCapacity: 20,
  });

  assert.equal(result.id, "slot-1");
  assert.ok(result.tutorName, "SlotView debe tener tutorName");
  assert.ok(result.tutorEmail, "SlotView debe tener tutorEmail");
});

test("OfferingsService.updateSlot sin cambios retorna el slot existente", async () => {
  const service = new OfferingsService(makeRepoMock() as never);

  const result = await service.updateSlot("slot-1", {});

  assert.equal(result.id, "slot-1");
  assert.equal(result.dayOfWeek, "MONDAY");
});

// ─── updateSlot — slot inexistente ───────────────────────────────────────────

test("OfferingsService.updateSlot lanza RESOURCE_NOT_FOUND si el slot no existe", async () => {
  const repo = makeRepoMock({
    findSlotById: async () => null,
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.updateSlot("no-existe", { maxCapacity: 10 }),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

// ─── updateSlot — tutor nuevo inactivo/inexistente ────────────────────────────

test("OfferingsService.updateSlot lanza RESOURCE_NOT_FOUND si el nuevo tutor no existe", async () => {
  const repo = makeRepoMock({
    findTutorById: async () => null,
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.updateSlot("slot-1", { tutorId: "tutor-inexistente" }),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

test("OfferingsService.updateSlot lanza RESOURCE_NOT_FOUND si el nuevo tutor está inactivo", async () => {
  const repo = makeRepoMock({
    findTutorById: async () => makeTutorRecord({ isActive: false }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.updateSlot("slot-1", { tutorId: "tutor-1" }),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

test("OfferingsService.updateSlot lanza RESOURCE_NOT_FOUND si el usuario del tutor está inactivo", async () => {
  const repo = makeRepoMock({
    findTutorById: async () =>
      makeTutorRecord({ user: { firstName: "Ana", lastName: "García", email: "ana@ucn.cl", isActive: false } }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.updateSlot("slot-1", { tutorId: "tutor-1" }),
    (err) => err instanceof AuthError && err.code === "RESOURCE_NOT_FOUND"
  );
});

// ─── updateSlot — conflictos de horario ──────────────────────────────────────

test("OfferingsService.updateSlot lanza TUTOR_SCHEDULE_CONFLICT cuando el tutor tiene ese bloque ocupado", async () => {
  const repo = makeRepoMock({
    findTutorSlotConflict: async () => ({ id: "slot-conflicto" }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.updateSlot("slot-1", { dayOfWeek: "WEDNESDAY" }),
    (err) => err instanceof AuthError && err.code === "TUTOR_SCHEDULE_CONFLICT"
  );
});

test("OfferingsService.updateSlot lanza ROOM_SCHEDULE_CONFLICT cuando la sala está ocupada", async () => {
  const repo = makeRepoMock({
    findRoomSlotConflict: async () => ({ id: "slot-sala-conflicto" }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.updateSlot("slot-1", { roomName: "301" }),
    (err) => err instanceof AuthError && err.code === "ROOM_SCHEDULE_CONFLICT"
  );
});

test("OfferingsService.updateSlot NO verifica conflicto de sala si roomName no cambia a un valor nuevo", async () => {
  let roomCheckCalled = false;
  const repo = makeRepoMock({
    findRoomSlotConflict: async () => {
      roomCheckCalled = true;
      return { id: "slot-sala" };
    },
    findSlotById: async () => makeSlotRecord({ roomName: null }),
  });
  const service = new OfferingsService(repo as never);

  // roomName no se pasa → no debe verificar sala
  await service.updateSlot("slot-1", { maxCapacity: 10 });
  assert.equal(roomCheckCalled, false, "No debe consultar conflicto de sala si roomName no cambia");
});

// ─── parseUpdateSlotInput ────────────────────────────────────────────────────

test("parseUpdateSlotInput acepta objeto vacío (sin cambios)", () => {
  const result = parseUpdateSlotInput({});
  assert.deepEqual(result, {});
});

test("parseUpdateSlotInput acepta campos válidos completos", () => {
  const result = parseUpdateSlotInput({
    tutorId: "tutor-99",
    dayOfWeek: "friday",
    startTime: "14:30",
    endTime: "16:00",
    roomName: "Sala 5",
    maxCapacity: 25,
  });
  assert.equal(result.tutorId, "tutor-99");
  assert.equal(result.dayOfWeek, "FRIDAY");
  assert.equal(result.startTime, "14:30");
  assert.equal(result.endTime, "16:00");
  assert.equal(result.roomName, "Sala 5");
  assert.equal(result.maxCapacity, 25);
});

test("parseUpdateSlotInput normaliza dayOfWeek a mayúsculas", () => {
  const result = parseUpdateSlotInput({ dayOfWeek: "wednesday" });
  assert.equal(result.dayOfWeek, "WEDNESDAY");
});

test("parseUpdateSlotInput lanza INVALID_INPUT si tutorId está vacío", () => {
  assert.throws(
    () => parseUpdateSlotInput({ tutorId: "   " }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseUpdateSlotInput lanza INVALID_INPUT si dayOfWeek no es válido", () => {
  assert.throws(
    () => parseUpdateSlotInput({ dayOfWeek: "DOMINGO" }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseUpdateSlotInput lanza INVALID_INPUT si endTime <= startTime", () => {
  assert.throws(
    () => parseUpdateSlotInput({ startTime: "11:25", endTime: "09:55" }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseUpdateSlotInput lanza INVALID_INPUT si maxCapacity no es entero positivo", () => {
  assert.throws(
    () => parseUpdateSlotInput({ maxCapacity: 0 }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
  assert.throws(
    () => parseUpdateSlotInput({ maxCapacity: -5 }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseUpdateSlotInput acepta roomName null para limpiar la sala", () => {
  const result = parseUpdateSlotInput({ roomName: null });
  assert.equal(result.roomName, null);
});

test("parseUpdateSlotInput convierte roomName vacío a null", () => {
  const result = parseUpdateSlotInput({ roomName: "   " });
  assert.equal(result.roomName, null);
});

// ─── getGoogleFormLinks ───────────────────────────────────────────────────────

test("OfferingsService.getGoogleFormLinks retorna lista de GoogleFormLinkFullView", async () => {
  const service = new OfferingsService(makeRepoMock() as never);

  const result = await service.getGoogleFormLinks();

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "link-1");
  assert.equal(result[0].semester, "2026-1");
  assert.equal(result[0].formId, "form-abc");
  assert.equal(result[0].formUrl, "https://forms.google.com/form-abc");
  assert.equal(typeof result[0].createdAt, "string", "createdAt debe ser ISO string");
  assert.equal(typeof result[0].updatedAt, "string", "updatedAt debe ser ISO string");
  assert.equal(typeof result[0].lastSyncedAt, "string", "lastSyncedAt debe ser ISO string cuando tiene valor");
});

test("OfferingsService.getGoogleFormLinks retorna vacío cuando no hay links", async () => {
  const repo = makeRepoMock({ findAllGoogleFormLinks: async () => [] });
  const service = new OfferingsService(repo as never);

  const result = await service.getGoogleFormLinks();
  assert.deepEqual(result, []);
});

test("OfferingsService.getGoogleFormLinks retorna lastSyncedAt null si no hay sync", async () => {
  const repo = makeRepoMock({
    findAllGoogleFormLinks: async () => [makeGoogleFormLinkRecord({ lastSyncedAt: null })],
  });
  const service = new OfferingsService(repo as never);

  const result = await service.getGoogleFormLinks();
  assert.equal(result[0].lastSyncedAt, null);
});

// ─── deleteGoogleFormLink ─────────────────────────────────────────────────────

test("OfferingsService.deleteGoogleFormLink retorna true y delega al repo", async () => {
  let deletedId = "";
  const repo = makeRepoMock({
    deleteGoogleFormLink: async (id: string) => {
      deletedId = id;
    },
  });
  const service = new OfferingsService(repo as never);

  const result = await service.deleteGoogleFormLink("link-1");

  assert.equal(result, true);
  assert.equal(deletedId, "link-1");
});
