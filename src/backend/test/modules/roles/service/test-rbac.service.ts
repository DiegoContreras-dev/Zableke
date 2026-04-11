import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { RbacService } from "@/backend/modules/roles/service/rbac.service";

const service = new RbacService();

test("RbacService.normalizeRoles filters unknown roles and deduplicates", () => {
  const roles = service.normalizeRoles(["admin", "TUTOR", "guest", "ADMIN"]);

  assert.deepEqual(roles, ["ADMIN", "TUTOR"]);
});

test("RbacService.getPermissions aggregates permissions by roles", () => {
  const permissions = service.getPermissions(["TUTOR"]);

  assert.ok(permissions.includes("READ_OWN_SCHEDULES"));
  assert.equal(permissions.includes("MANAGE_TUTORS"), false);
});

test("RbacService.assertPermission throws FORBIDDEN when role lacks permission", () => {
  assert.throws(
    () => service.assertPermission(["TUTOR"], "MANAGE_TUTORS"),
    (error) => error instanceof AuthError && error.code === "FORBIDDEN"
  );
});
