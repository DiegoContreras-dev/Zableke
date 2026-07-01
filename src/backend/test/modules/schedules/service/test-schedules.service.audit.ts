import assert from "node:assert/strict";
import test from "node:test";

import { SchedulesService } from "@/backend/modules/schedules/service/schedules.service";
import type { AuditLogEntry } from "@/backend/modules/audit/repository/audit-log.repository";

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
    checkConflicts: async () => ({ tutorConflict: null, roomConflict: null }),
    create: async (data: Record<string, unknown>) => makeScheduleRow({ ...data }),
    update: async (_id: string, data: Record<string, unknown>) => makeScheduleRow({ ...data }),
    cancel: async () => makeScheduleRow({ status: "CANCELLED" }),
    ...overrides,
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

test("createSchedule registra un AuditLog de CREATE", async () => {
  const audit = makeAuditLogMock();
  const service = new SchedulesService(makeRepoMock() as never, audit as never);

  const view = await service.createSchedule(
    {
      tutorId: "tutor-1",
      roomId: "room-1",
      title: "Cálculo I",
      startsAt: BASE_DATE.toISOString(),
      endsAt: BASE_DATE_END.toISOString(),
    },
    "user-1",
  );

  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].entity, "Schedule");
  assert.equal(audit.calls[0].entityId, view.id);
  assert.equal(audit.calls[0].action, "CREATE");
  assert.equal(audit.calls[0].actorId, "user-1");
});

test("updateSchedule registra un AuditLog de UPDATE con before/after", async () => {
  const audit = makeAuditLogMock();
  const service = new SchedulesService(makeRepoMock() as never, audit as never);

  await service.updateSchedule({ id: "sch-1", title: "Título actualizado" }, "user-2");

  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].entity, "Schedule");
  assert.equal(audit.calls[0].entityId, "sch-1");
  assert.equal(audit.calls[0].action, "UPDATE");
  assert.equal(audit.calls[0].actorId, "user-2");
  assert.ok(audit.calls[0].beforeData);
  assert.ok(audit.calls[0].afterData);
});

test("cancelSchedule registra un AuditLog de CANCEL", async () => {
  const audit = makeAuditLogMock();
  const service = new SchedulesService(makeRepoMock() as never, audit as never);

  await service.cancelSchedule("sch-1", "user-3");

  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].entity, "Schedule");
  assert.equal(audit.calls[0].entityId, "sch-1");
  assert.equal(audit.calls[0].action, "CANCEL");
  assert.equal(audit.calls[0].actorId, "user-3");
});
