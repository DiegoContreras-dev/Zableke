import assert from "node:assert/strict";
import test from "node:test";

import {
  attendanceResolvers,
  attendanceTypeDefs,
} from "@/backend/modules/attendance/resolvers/attendance.resolver";

// ─── typeDefs ─────────────────────────────────────────────────────────────────

test("attendanceTypeDefs define el tipo AttendanceRecord", () => {
  assert.ok(attendanceTypeDefs.includes("type AttendanceRecord"));
  assert.ok(attendanceTypeDefs.includes("scheduleId: String!"));
  assert.ok(attendanceTypeDefs.includes("studentEmail: String!"));
  assert.ok(attendanceTypeDefs.includes("status: String!"));
  assert.ok(attendanceTypeDefs.includes("markedAt: String!"));
});

test("attendanceTypeDefs define el tipo AttendanceHistoryItem", () => {
  assert.ok(attendanceTypeDefs.includes("type AttendanceHistoryItem"));
  assert.ok(attendanceTypeDefs.includes("scheduleTitle: String!"));
  assert.ok(attendanceTypeDefs.includes("scheduleStartsAt: String!"));
  assert.ok(attendanceTypeDefs.includes("roomName: String"));
});

test("attendanceTypeDefs define la mutación recordBulkAttendance", () => {
  assert.ok(attendanceTypeDefs.includes("recordBulkAttendance"));
  assert.ok(attendanceTypeDefs.includes("BulkAttendanceInput"));
});

test("attendanceTypeDefs define el query attendancesBySchedule", () => {
  assert.ok(attendanceTypeDefs.includes("attendancesBySchedule"));
});

test("attendanceTypeDefs define el query myAttendanceHistory", () => {
  assert.ok(attendanceTypeDefs.includes("myAttendanceHistory"));
});

test("attendanceTypeDefs define input BulkAttendanceInput con scheduleId y attendances", () => {
  assert.ok(attendanceTypeDefs.includes("input BulkAttendanceInput"));
  assert.ok(attendanceTypeDefs.includes("scheduleId: String!"));
  assert.ok(attendanceTypeDefs.includes("[StudentAttendanceInput!]!"));
});

// ─── resolvers ────────────────────────────────────────────────────────────────

test("attendanceResolvers expone Query.attendancesBySchedule como función", () => {
  assert.equal(typeof attendanceResolvers.Query.attendancesBySchedule, "function");
});

test("attendanceResolvers expone Query.myAttendanceHistory como función", () => {
  assert.equal(typeof attendanceResolvers.Query.myAttendanceHistory, "function");
});

test("attendanceResolvers expone Mutation.recordBulkAttendance como función", () => {
  assert.equal(typeof attendanceResolvers.Mutation.recordBulkAttendance, "function");
});

// ─── resolver: attendancesBySchedule lanza sin sesión ────────────────────────

test("attendancesBySchedule lanza UNAUTHORIZED si no hay usuario en contexto", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      attendanceResolvers.Query.attendancesBySchedule(
        {},
        { scheduleId: "sch-1" },
        { currentUser: null } as never
      ),
    (err) => err instanceof AuthError && err.code === "UNAUTHORIZED"
  );
});

// ─── resolver: myAttendanceHistory lanza sin sesión ──────────────────────────

test("myAttendanceHistory lanza UNAUTHORIZED si no hay usuario en contexto", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      attendanceResolvers.Query.myAttendanceHistory(
        {},
        {},
        { currentUser: null } as never
      ),
    (err) => err instanceof AuthError && err.code === "UNAUTHORIZED"
  );
});

// ─── resolver: recordBulkAttendance lanza sin sesión ─────────────────────────

test("recordBulkAttendance lanza UNAUTHORIZED si no hay usuario en contexto", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      attendanceResolvers.Mutation.recordBulkAttendance(
        {},
        { input: {} },
        { currentUser: null } as never
      ),
    (err) => err instanceof AuthError && err.code === "UNAUTHORIZED"
  );
});

// ─── resolver: recordBulkAttendance lanza FORBIDDEN sin permiso ──────────────

test("recordBulkAttendance lanza FORBIDDEN si el usuario no tiene WRITE_OWN_SCHEDULES", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      attendanceResolvers.Mutation.recordBulkAttendance(
        {},
        { input: {} },
        { currentUser: { id: "u1", roles: ["STUDENT"] } } as never
      ),
    (err) => err instanceof AuthError && err.code === "FORBIDDEN"
  );
});
