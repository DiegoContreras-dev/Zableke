import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthSession } from "@/backend/modules/auth/model/auth-session.model";

test("buildAuthSession returns ISO timestamps and user data", () => {
  const session = buildAuthSession(
    {
      id: "u1",
      email: "tutor@ucn.cl",
      firstName: "Tutor",
      lastName: "UCN",
      isActive: true,
      roles: ["TUTOR"],
    },
    "dummy.test.token",
    3600
  );

  assert.equal(session.user.email, "tutor@ucn.cl");
  assert.ok(session.issuedAt.includes("T"));
  assert.ok(session.expiresAt.includes("T"));
  assert.ok(new Date(session.expiresAt).getTime() > new Date(session.issuedAt).getTime());
});
