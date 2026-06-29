import assert from "node:assert/strict";
import test from "node:test";

import { OfferingsRepository } from "@/backend/modules/offerings/repository/offerings.repository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Crea un slot stub que Prisma devolvería desde findFirst. */
function slotStub(id = "slot-1") {
  return { id };
}

/**
 * Fábrica de un db mock mínimo.
 * Solo exponemos los métodos que OfferingsRepository usa en findRoomSlotConflict.
 */
function makeDbMock(tutoringSlotFindFirst: (args: unknown) => Promise<{ id: string } | null>) {
  return {
    tutoringSlot: { findFirst: tutoringSlotFindFirst },
    // Los demás modelos no se necesitan para estas pruebas
  } as never;
}

// ─── findRoomSlotConflict ─────────────────────────────────────────────────────

test("OfferingsRepository.findRoomSlotConflict retorna null cuando no hay solapamiento", async () => {
  const db = makeDbMock(async () => null);
  const repo = new OfferingsRepository(db);

  const result = await repo.findRoomSlotConflict({
    semester: "2026-1",
    roomName: "207",
    dayOfWeek: "MONDAY",
    startTime: "09:55",
    endTime: "11:25",
  });

  assert.equal(result, null);
});

test("OfferingsRepository.findRoomSlotConflict retorna el slot cuando hay solapamiento", async () => {
  const db = makeDbMock(async () => slotStub("slot-ocupado"));
  const repo = new OfferingsRepository(db);

  const result = await repo.findRoomSlotConflict({
    semester: "2026-1",
    roomName: "207",
    dayOfWeek: "MONDAY",
    startTime: "09:55",
    endTime: "11:25",
  });

  assert.deepEqual(result, { id: "slot-ocupado" });
});

test("OfferingsRepository.findRoomSlotConflict excluye el slot indicado en excludeId", async () => {
  let capturedWhere: Record<string, unknown> = {};

  const db = makeDbMock(async (args) => {
    capturedWhere = (args as { where: Record<string, unknown> }).where;
    return null;
  });
  const repo = new OfferingsRepository(db);

  await repo.findRoomSlotConflict({
    semester: "2026-1",
    roomName: "207",
    dayOfWeek: "TUESDAY",
    startTime: "11:40",
    endTime: "13:10",
    excludeId: "slot-self",
  });

  assert.deepEqual(
    capturedWhere["id"],
    { not: "slot-self" },
    "El where debe incluir { id: { not: excludeId } }"
  );
});

test("OfferingsRepository.findRoomSlotConflict NO incluye cláusula id cuando no hay excludeId", async () => {
  let capturedWhere: Record<string, unknown> = {};

  const db = makeDbMock(async (args) => {
    capturedWhere = (args as { where: Record<string, unknown> }).where;
    return null;
  });
  const repo = new OfferingsRepository(db);

  await repo.findRoomSlotConflict({
    semester: "2026-1",
    roomName: "207",
    dayOfWeek: "WEDNESDAY",
    startTime: "09:55",
    endTime: "11:25",
  });

  assert.equal(
    Object.prototype.hasOwnProperty.call(capturedWhere, "id"),
    false,
    "No debe incluir la clave 'id' si no se pasa excludeId"
  );
});

test("OfferingsRepository.findRoomSlotConflict filtra por roomName, dayOfWeek y solapamiento temporal", async () => {
  let capturedWhere: Record<string, unknown> = {};

  const db = makeDbMock(async (args) => {
    capturedWhere = (args as { where: Record<string, unknown> }).where;
    return null;
  });
  const repo = new OfferingsRepository(db);

  await repo.findRoomSlotConflict({
    semester: "2026-1",
    roomName: "Lab-301",
    dayOfWeek: "FRIDAY",
    startTime: "14:30",
    endTime: "16:00",
  });

  assert.equal(capturedWhere["roomName"], "Lab-301");
  assert.equal(capturedWhere["dayOfWeek"], "FRIDAY");
  assert.deepEqual(capturedWhere["startTime"], { lt: "16:00" });
  assert.deepEqual(capturedWhere["endTime"], { gt: "14:30" });
});

// ─── findTutorSlotConflict (regresión) ────────────────────────────────────────

test("OfferingsRepository.findTutorSlotConflict retorna null cuando no hay solapamiento", async () => {
  const db = {
    tutoringSlot: { findFirst: async () => null },
  } as never;
  const repo = new OfferingsRepository(db);

  const result = await repo.findTutorSlotConflict({
    semester: "2026-1",
    tutorId: "tutor-1",
    dayOfWeek: "MONDAY",
    startTime: "09:55",
    endTime: "11:25",
  });

  assert.equal(result, null);
});

test("OfferingsRepository.findTutorSlotConflict retorna el slot conflictivo", async () => {
  const db = {
    tutoringSlot: { findFirst: async () => slotStub("slot-tutor-conflict") },
  } as never;
  const repo = new OfferingsRepository(db);

  const result = await repo.findTutorSlotConflict({
    semester: "2026-1",
    tutorId: "tutor-1",
    dayOfWeek: "MONDAY",
    startTime: "09:55",
    endTime: "11:25",
  });

  assert.deepEqual(result, { id: "slot-tutor-conflict" });
});
