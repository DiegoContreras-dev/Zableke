import assert from "node:assert/strict";
import test from "node:test";

import { OfferingsService } from "@/backend/modules/offerings/service/offerings.service";
import type { AuditLogEntry } from "@/backend/modules/audit/repository/audit-log.repository";

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

function makeRepoMock(overrides: Record<string, unknown> = {}) {
  return {
    createOffering: async (data: Record<string, unknown>) => makeOfferingRecord(data),
    findOfferingById: async () => makeOfferingRecord(),
    updateOffering: async (_id: string, data: Record<string, unknown>) => makeOfferingRecord(data),
    deleteOffering: async () => undefined,
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
    findSlotById: async () => ({
      id: "slot-1",
      offeringId: "offering-1",
      offering: makeOfferingRecord(),
      tutorId: "tutor-1",
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      maxCapacity: 10,
      roomName: null,
      googleFormOptionLabel: null,
      tutor: { userId: "user-1", isActive: true, user: { firstName: "Ana", lastName: "García", email: "ana@ucn.cl" } },
      _count: { enrollments: 0 },
    }),
    deleteEnrollment: async () => undefined,
    countEnrollmentsBySlot: async () => 0,
    ...overrides,
  };
}

function makeSemestersMock() {
  return {
    activeCode: async () => "2026-1",
    assertWritable: async () => ({ code: "2026-1", status: "ACTIVE" }),
  };
}

function makeAuditLogMock() {
  const calls: AuditLogEntry[] = [];
  return {
    calls,
    record: async (entry: AuditLogEntry) => {
      calls.push(entry);
    },
  };
}

test("createOffering registra un AuditLog de CREATE", async () => {
  const audit = makeAuditLogMock();
  const service = new OfferingsService(
    makeRepoMock() as never,
    makeSemestersMock() as never,
    audit as never,
  );

  const view = await service.createOffering({ name: "Cálculo I" }, "user-1");

  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].entity, "Offering");
  assert.equal(audit.calls[0].entityId, view.id);
  assert.equal(audit.calls[0].action, "CREATE");
  assert.equal(audit.calls[0].actorId, "user-1");
});

test("deleteOffering registra un AuditLog de DELETE con snapshot previo", async () => {
  const audit = makeAuditLogMock();
  const service = new OfferingsService(
    makeRepoMock() as never,
    makeSemestersMock() as never,
    audit as never,
  );

  await service.deleteOffering("offering-1", "user-2");

  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].entity, "Offering");
  assert.equal(audit.calls[0].entityId, "offering-1");
  assert.equal(audit.calls[0].action, "DELETE");
  assert.equal(audit.calls[0].actorId, "user-2");
  assert.ok(audit.calls[0].beforeData);
});

test("createEnrollment registra un AuditLog de CREATE para Enrollment", async () => {
  const audit = makeAuditLogMock();
  const service = new OfferingsService(
    makeRepoMock() as never,
    makeSemestersMock() as never,
    audit as never,
  );

  await service.createEnrollment(
    { slotId: "slot-1", studentEmail: "e@ucn.cl", studentName: "Estudiante" },
    "user-3",
  );

  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].entity, "Enrollment");
  assert.equal(audit.calls[0].action, "CREATE");
  assert.equal(audit.calls[0].actorId, "user-3");
});
