import assert from "node:assert/strict";
import test from "node:test";

import {
  RBAC_PERMISSIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "@/backend/modules/roles/model/rbac.model";

test("rbac model exposes expected system roles", () => {
  assert.deepEqual(SYSTEM_ROLES, ["ADMIN", "TUTOR"]);
});

test("rbac model defines expected permission matrix", () => {
  assert.ok(RBAC_PERMISSIONS.includes("READ_OWN_SCHEDULES"));
  assert.ok(ROLE_PERMISSIONS.ADMIN.includes("MANAGE_TUTORS"));
  assert.ok(ROLE_PERMISSIONS.TUTOR.includes("WRITE_OWN_SCHEDULES"));
  assert.equal(ROLE_PERMISSIONS.TUTOR.includes("MANAGE_TUTORS"), false);
});
