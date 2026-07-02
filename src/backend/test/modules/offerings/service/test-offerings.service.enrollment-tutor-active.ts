import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { OfferingsService } from "@/backend/modules/offerings/service/offerings.service";

function makeSlotRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "slot-1",
    offeringId: "offering-1",
    offering: { id: "offering-1", name: "Cálculo I", status: "OPEN", semester: "2026-1" },
    tutorId: "tutor-1",
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "10:00",
    maxCapacity: 10,
    roomName: null,
    googleFormOptionLabel: null,
    tutor: { userId: "user-1", isActive: true, user: { firstName: "Ana", lastName: "García", email: "ana@ucn.cl" } },
    _count: { enrollments: 0 },
    ...overrides,
  };
}

function makeRepoMock(overrides: Record<string, unknown> = {}) {
  return {
    findSlotById: async () => makeSlotRecord(),
    countEnrollmentsBySlot: async () => 0,
    createEnrollment: async (data: Record<string, unknown>) => ({
      id: "enr-1",
      studentPhone: null,
      enrolledAt: new Date(),
      ...data,
    }),
    ...overrides,
  };
}

test("prepareEnrollment lanza INVALID_STATE si el tutor del slot está inactivo", async () => {
  const repo = makeRepoMock({
    findSlotById: async () => makeSlotRecord({ tutor: { userId: "user-1", isActive: false, user: { firstName: "Ana", lastName: "García", email: "ana@ucn.cl" } } }),
  });
  const service = new OfferingsService(repo as never);

  await assert.rejects(
    () => service.prepareEnrollment({ slotId: "slot-1", studentEmail: "e@ucn.cl", studentName: "Estudiante" } as never),
    (err) => err instanceof AuthError && err.code === "INVALID_STATE"
  );
});

test("prepareEnrollment permite inscribir si el tutor del slot está activo", async () => {
  const service = new OfferingsService(makeRepoMock() as never);

  const result = await service.prepareEnrollment({ slotId: "slot-1", studentEmail: "e@ucn.cl", studentName: "Estudiante" } as never);

  assert.equal(result.slotId, "slot-1");
});
