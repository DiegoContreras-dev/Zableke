import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import {
  parseCreateScheduleInput,
  parseUpdateScheduleInput,
} from "@/backend/modules/schedules/dto/schedule.dto";

// ─── parseCreateScheduleInput ─────────────────────────────────────────────────

test("parseCreateScheduleInput acepta input válido", () => {
  const result = parseCreateScheduleInput({
    tutorId: "tutor-1",
    roomId: "room-1",
    title: "Cálculo I",
    startsAt: "2026-05-01T09:00:00Z",
    endsAt: "2026-05-01T10:30:00Z",
  });

  assert.equal(result.tutorId, "tutor-1");
  assert.equal(result.roomId, "room-1");
  assert.equal(result.title, "Cálculo I");
  assert.match(result.startsAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(result.endsAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("parseCreateScheduleInput incluye description opcional", () => {
  const result = parseCreateScheduleInput({
    tutorId: "t1",
    roomId: "r1",
    title: "Test",
    description: "Sección P2",
    startsAt: "2026-05-01T09:00:00Z",
    endsAt: "2026-05-01T10:00:00Z",
  });

  assert.equal(result.description, "Sección P2");
});

test("parseCreateScheduleInput omite description si está vacía", () => {
  const result = parseCreateScheduleInput({
    tutorId: "t1",
    roomId: "r1",
    title: "Test",
    description: "   ",
    startsAt: "2026-05-01T09:00:00Z",
    endsAt: "2026-05-01T10:00:00Z",
  });

  assert.equal(result.description, undefined);
});

test("parseCreateScheduleInput lanza INVALID_INPUT si tutorId es vacío", () => {
  assert.throws(
    () =>
      parseCreateScheduleInput({
        tutorId: "",
        roomId: "r1",
        title: "Test",
        startsAt: "2026-05-01T09:00:00Z",
        endsAt: "2026-05-01T10:00:00Z",
      }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseCreateScheduleInput lanza INVALID_INPUT si roomId es vacío", () => {
  assert.throws(
    () =>
      parseCreateScheduleInput({
        tutorId: "t1",
        roomId: "",
        title: "Test",
        startsAt: "2026-05-01T09:00:00Z",
        endsAt: "2026-05-01T10:00:00Z",
      }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseCreateScheduleInput lanza INVALID_INPUT si title es vacío", () => {
  assert.throws(
    () =>
      parseCreateScheduleInput({
        tutorId: "t1",
        roomId: "r1",
        title: "",
        startsAt: "2026-05-01T09:00:00Z",
        endsAt: "2026-05-01T10:00:00Z",
      }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseCreateScheduleInput lanza INVALID_INPUT si startsAt no es fecha válida", () => {
  assert.throws(
    () =>
      parseCreateScheduleInput({
        tutorId: "t1",
        roomId: "r1",
        title: "Test",
        startsAt: "no-es-fecha",
        endsAt: "2026-05-01T10:00:00Z",
      }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseCreateScheduleInput lanza INVALID_INPUT si endsAt <= startsAt", () => {
  assert.throws(
    () =>
      parseCreateScheduleInput({
        tutorId: "t1",
        roomId: "r1",
        title: "Test",
        startsAt: "2026-05-01T10:00:00Z",
        endsAt: "2026-05-01T09:00:00Z",
      }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseCreateScheduleInput lanza INVALID_INPUT si endsAt === startsAt", () => {
  assert.throws(
    () =>
      parseCreateScheduleInput({
        tutorId: "t1",
        roomId: "r1",
        title: "Test",
        startsAt: "2026-05-01T09:00:00Z",
        endsAt: "2026-05-01T09:00:00Z",
      }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseCreateScheduleInput lanza INVALID_INPUT si el input no es objeto", () => {
  assert.throws(
    () => parseCreateScheduleInput("no-es-objeto"),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseCreateScheduleInput trimea espacios del título", () => {
  const result = parseCreateScheduleInput({
    tutorId: "t1",
    roomId: "r1",
    title: "  Cálculo I  ",
    startsAt: "2026-05-01T09:00:00Z",
    endsAt: "2026-05-01T10:00:00Z",
  });

  assert.equal(result.title, "Cálculo I");
});

// ─── parseUpdateScheduleInput ────────────────────────────────────────────────

test("parseUpdateScheduleInput acepta input mínimo con id", () => {
  const result = parseUpdateScheduleInput({ id: "sch-1" });

  assert.equal(result.id, "sch-1");
  assert.equal(result.title, undefined);
  assert.equal(result.roomId, undefined);
});

test("parseUpdateScheduleInput acepta actualización parcial de título", () => {
  const result = parseUpdateScheduleInput({ id: "sch-1", title: "Nuevo título" });

  assert.equal(result.id, "sch-1");
  assert.equal(result.title, "Nuevo título");
});

test("parseUpdateScheduleInput acepta actualización de horario", () => {
  const result = parseUpdateScheduleInput({
    id: "sch-1",
    startsAt: "2026-06-01T09:00:00Z",
    endsAt: "2026-06-01T10:00:00Z",
  });

  assert.ok(result.startsAt);
  assert.ok(result.endsAt);
  assert.match(result.startsAt!, /^\d{4}-\d{2}-\d{2}T/);
});

test("parseUpdateScheduleInput lanza INVALID_INPUT si id es vacío", () => {
  assert.throws(
    () => parseUpdateScheduleInput({ id: "" }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseUpdateScheduleInput lanza INVALID_INPUT si endsAt <= startsAt en actualización", () => {
  assert.throws(
    () =>
      parseUpdateScheduleInput({
        id: "sch-1",
        startsAt: "2026-06-01T11:00:00Z",
        endsAt: "2026-06-01T10:00:00Z",
      }),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});

test("parseUpdateScheduleInput lanza INVALID_INPUT si el input es null", () => {
  assert.throws(
    () => parseUpdateScheduleInput(null),
    (err) => err instanceof AuthError && err.code === "INVALID_INPUT"
  );
});
