import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import {
  requirePermission,
  requireRole,
  requireUser,
} from "@/backend/common/guards/role.guard";

test("requireUser throws when user is missing", () => {
  assert.throws(
    () => requireUser(null),
    (error) => error instanceof AuthError && error.code === "UNAUTHORIZED"
  );
});

test("requireRole allows valid role", () => {
  const user = requireRole({ id: "u1", roles: ["TUTOR"] }, ["TUTOR"]);

  assert.equal(user.id, "u1");
});

test("requirePermission blocks user without required permission", () => {
  assert.throws(
    () => requirePermission({ id: "u1", roles: ["TUTOR"] }, "MANAGE_TUTORS"),
    (error) => error instanceof AuthError && error.code === "FORBIDDEN"
  );
});
