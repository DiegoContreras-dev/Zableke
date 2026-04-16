import assert from "node:assert/strict";
import test from "node:test";

import {
  schedulesResolvers,
  schedulesTypeDefs,
} from "@/backend/modules/schedules/resolvers/schedules.resolver";

// ─── typeDefs ─────────────────────────────────────────────────────────────────

test("schedulesTypeDefs define el tipo Schedule", () => {
  assert.ok(schedulesTypeDefs.includes("type Schedule"));
  assert.ok(schedulesTypeDefs.includes("tutorId: String!"));
  assert.ok(schedulesTypeDefs.includes("title: String!"));
  assert.ok(schedulesTypeDefs.includes("startsAt: String!"));
  assert.ok(schedulesTypeDefs.includes("endsAt: String!"));
  assert.ok(schedulesTypeDefs.includes("status: String!"));
});

test("schedulesTypeDefs expone roomName en Schedule", () => {
  assert.ok(schedulesTypeDefs.includes("roomName: String"));
});

test("schedulesTypeDefs define queries mySchedules y allSchedules", () => {
  assert.ok(schedulesTypeDefs.includes("mySchedules: [Schedule!]!"));
  assert.ok(schedulesTypeDefs.includes("allSchedules: [Schedule!]!"));
  assert.ok(schedulesTypeDefs.includes("schedule(id: ID!): Schedule"));
});

test("schedulesTypeDefs define inputs CreateScheduleInput y UpdateScheduleInput", () => {
  assert.ok(schedulesTypeDefs.includes("input CreateScheduleInput"));
  assert.ok(schedulesTypeDefs.includes("input UpdateScheduleInput"));
  assert.ok(schedulesTypeDefs.includes("tutorId: String!"));
  assert.ok(schedulesTypeDefs.includes("roomId: String!"));
  assert.ok(schedulesTypeDefs.includes("title: String!"));
  assert.ok(schedulesTypeDefs.includes("startsAt: String!"));
  assert.ok(schedulesTypeDefs.includes("endsAt: String!"));
});

test("schedulesTypeDefs define mutations createSchedule, updateSchedule, cancelSchedule", () => {
  assert.ok(schedulesTypeDefs.includes("createSchedule"));
  assert.ok(schedulesTypeDefs.includes("updateSchedule"));
  assert.ok(schedulesTypeDefs.includes("cancelSchedule"));
});

// ─── resolvers: estructura ────────────────────────────────────────────────────

test("schedulesResolvers expone Query.schedule como función", () => {
  assert.equal(typeof schedulesResolvers.Query.schedule, "function");
});

test("schedulesResolvers expone Query.mySchedules como función", () => {
  assert.equal(typeof schedulesResolvers.Query.mySchedules, "function");
});

test("schedulesResolvers expone Query.allSchedules como función", () => {
  assert.equal(typeof schedulesResolvers.Query.allSchedules, "function");
});

test("schedulesResolvers expone Mutation.createSchedule como función", () => {
  assert.equal(typeof schedulesResolvers.Mutation.createSchedule, "function");
});

test("schedulesResolvers expone Mutation.updateSchedule como función", () => {
  assert.equal(typeof schedulesResolvers.Mutation.updateSchedule, "function");
});

test("schedulesResolvers expone Mutation.cancelSchedule como función", () => {
  assert.equal(typeof schedulesResolvers.Mutation.cancelSchedule, "function");
});

// ─── resolvers: autenticación ────────────────────────────────────────────────

test("schedule lanza UNAUTHORIZED si no hay usuario en contexto", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      schedulesResolvers.Query.schedule(
        {},
        { id: "sch-1" },
        { currentUser: null } as never
      ),
    (err) => err instanceof AuthError && err.code === "UNAUTHORIZED"
  );
});

test("mySchedules lanza UNAUTHORIZED si no hay usuario en contexto", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      schedulesResolvers.Query.mySchedules(
        {},
        {},
        { currentUser: null } as never
      ),
    (err) => err instanceof AuthError && err.code === "UNAUTHORIZED"
  );
});

test("mySchedules lanza FORBIDDEN si el usuario no tiene READ_OWN_SCHEDULES", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      schedulesResolvers.Query.mySchedules(
        {},
        {},
        { currentUser: { id: "u1", roles: ["STUDENT"] } } as never
      ),
    (err) => err instanceof AuthError && err.code === "FORBIDDEN"
  );
});

test("allSchedules lanza FORBIDDEN si el usuario no tiene READ_ALL_SCHEDULES", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      schedulesResolvers.Query.allSchedules(
        {},
        {},
        { currentUser: { id: "u1", roles: ["TUTOR"] } } as never
      ),
    (err) => err instanceof AuthError && err.code === "FORBIDDEN"
  );
});

test("createSchedule lanza UNAUTHORIZED si no hay usuario en contexto", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      schedulesResolvers.Mutation.createSchedule(
        {},
        { input: {} },
        { currentUser: null } as never
      ),
    (err) => err instanceof AuthError && err.code === "UNAUTHORIZED"
  );
});

test("createSchedule lanza FORBIDDEN si el usuario no tiene WRITE_OWN_SCHEDULES", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      schedulesResolvers.Mutation.createSchedule(
        {},
        { input: {} },
        { currentUser: { id: "u1", roles: ["STUDENT"] } } as never
      ),
    (err) => err instanceof AuthError && err.code === "FORBIDDEN"
  );
});

test("cancelSchedule lanza UNAUTHORIZED si no hay usuario en contexto", async () => {
  const { AuthError } = await import("@/backend/common/errors/auth.error");

  await assert.rejects(
    () =>
      schedulesResolvers.Mutation.cancelSchedule(
        {},
        { id: "sch-1" },
        { currentUser: null } as never
      ),
    (err) => err instanceof AuthError && err.code === "UNAUTHORIZED"
  );
});
