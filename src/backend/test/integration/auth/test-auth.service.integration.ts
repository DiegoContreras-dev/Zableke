import assert from "node:assert/strict";
import test from "node:test";

import { AuthService } from "@/backend/modules/auth/service/auth.service";
import { prisma } from "@/infrastructure/prisma/client";

test(
  "AuthService integration: creates and authenticates institutional user in DB",
  async (t) => {
    const unique = Date.now();
    const email = `integration.auth.${unique}@ucn.cl`;

    t.after(async () => {
      await prisma.userRole.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });
    });

    const service = new AuthService();

    const firstSession = await service.authenticate({
      email,
      firstName: "Integration",
      lastName: "Auth",
    });

    assert.equal(firstSession.user.email, email);
    assert.equal(firstSession.user.firstName, "Integration");
    assert.equal(firstSession.user.lastName, "Auth");

    const secondSession = await service.authenticate({ email });
    assert.equal(secondSession.user.email, email);

    const persistedUser = await prisma.user.findUnique({ where: { email } });
    assert.ok(persistedUser);
  }
);
