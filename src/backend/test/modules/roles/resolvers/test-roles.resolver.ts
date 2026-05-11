import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import {
  rolesResolvers,
  rolesTypeDefs,
} from "@/backend/modules/roles/resolvers/roles.resolver";

test("rolesTypeDefs includes roleAccessPreview query", () => {
  assert.ok(rolesTypeDefs.includes("roleAccessPreview"));
});

test("rolesResolver returns permission profile for ADMIN", () => {
  const result = rolesResolvers.Query.roleAccessPreview(null, { roles: ["ADMIN"] });

  assert.ok(result.roles.includes("ADMIN"));
  assert.ok(result.permissions.includes("MANAGE_TUTORS"));
});

test("rolesResolver.myAccess requires authenticated user", async () => {
  await assert.rejects(
    async () => rolesResolvers.Query.myAccess(null, {}, { currentUser: null } as never),
    (error) => error instanceof AuthError && error.code === "UNAUTHORIZED"
  );
});

test("rolesResolver.usersAccess forbids tutor role", async () => {
  await assert.rejects(
    async () =>
      rolesResolvers.Query.usersAccess(
        null,
        {},
        { currentUser: { id: "u1", email: "tutor@ucn.cl", roles: ["TUTOR"] } } as never
      ),
    (error) => error instanceof AuthError && error.code === "FORBIDDEN"
  );
});
