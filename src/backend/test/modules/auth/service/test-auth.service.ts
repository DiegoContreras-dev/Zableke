import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { AuthService } from "@/backend/modules/auth/service/auth.service";

test("AuthService authenticates and auto-creates user for valid institutional email", async () => {
  const repositoryMock = {
    findByEmail: async () => null,
    create: async (data: { email: string; firstName: string; lastName: string }) => ({
      id: "u1",
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: true,
      roles: [],
    }),
  };

  const service = new AuthService(repositoryMock as never, ["ucn.cl"], 30);
  const result = await service.authenticate({ email: "tutor@ucn.cl" });

  assert.equal(result.user.email, "tutor@ucn.cl");
  assert.equal(result.user.isActive, true);
});

test("AuthService rejects non institutional emails", async () => {
  const service = new AuthService({} as never, ["ucn.cl"], 30);

  await assert.rejects(
    async () => service.authenticate({ email: "test@gmail.com" }),
    (error) => error instanceof AuthError && error.code === "EMAIL_NOT_ALLOWED"
  );
});

test("AuthService rejects inactive users", async () => {
  const repositoryMock = {
    findByEmail: async () => ({
      id: "u2",
      email: "admin@ucn.cl",
      firstName: "Admin",
      lastName: "UCN",
      isActive: false,
      roles: [],
    }),
    create: async () => null,
  };

  const service = new AuthService(repositoryMock as never, ["ucn.cl"], 30);

  await assert.rejects(
    async () => service.authenticate({ email: "admin@ucn.cl" }),
    (error) => error instanceof AuthError && error.code === "USER_INACTIVE"
  );
});
