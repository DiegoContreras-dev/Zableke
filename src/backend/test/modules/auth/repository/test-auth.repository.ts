import assert from "node:assert/strict";
import test from "node:test";

import { AuthRepository } from "@/backend/modules/auth/repository/auth.repository";

test("AuthRepository.findByEmail delegates to prisma user.findUnique", async () => {
  let capturedEmail = "";

  const prismaMock = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => {
        capturedEmail = where.email;
        return null;
      },
      create: async () => null,
    },
  } as never;

  const repository = new AuthRepository(prismaMock);
  await repository.findByEmail("tutor@ucn.cl");

  assert.equal(capturedEmail, "tutor@ucn.cl");
});

test("AuthRepository.create delegates to prisma user.create", async () => {
  let called = false;

  const prismaMock = {
    user: {
      findUnique: async () => null,
      create: async () => {
        called = true;
        return {
          id: "u1",
          email: "admin@ucn.cl",
          firstName: "Admin",
          lastName: "UCN",
          isActive: true,
          roles: [],
        };
      },
    },
  } as never;

  const repository = new AuthRepository(prismaMock);
  await repository.create({ email: "admin@ucn.cl", firstName: "Admin", lastName: "UCN" });

  assert.equal(called, true);
});
