import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { RolesManagementService } from "@/backend/modules/roles/service/roles-management.service";

function createUserRecord(roles: string[]) {
  return {
    id: "u1",
    email: "admin@ucn.cl",
    firstName: "Admin",
    lastName: "UCN",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: roles.map((name) => ({
      id: `ur-${name}`,
      userId: "u1",
      roleId: `r-${name}`,
      createdAt: new Date(),
      role: {
        id: `r-${name}`,
        name,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })),
  };
}

test("RolesManagementService.buildMyAccess resolves ADMIN permissions", () => {
  const service = new RolesManagementService({} as never);

  const profile = service.buildMyAccess({
    id: "u1",
    email: "admin@ucn.cl",
    roles: ["ADMIN"],
  });

  assert.ok(profile.permissions.includes("MANAGE_TUTORS"));
});

test("RolesManagementService.listUsersAccess maps users with permissions", async () => {
  const repositoryMock = {
    listUsersWithRoles: async () => [createUserRecord(["TUTOR"])],
  };

  const service = new RolesManagementService(repositoryMock as never);
  const result = await service.listUsersAccess();

  assert.equal(result.length, 1);
  assert.equal(result[0]?.roles.includes("TUTOR"), true);
  assert.equal(result[0]?.permissions.includes("MANAGE_TUTORS"), false);
});

test("RolesManagementService.assignRoleToUser rejects unsupported role", async () => {
  const service = new RolesManagementService({} as never);

  await assert.rejects(
    async () => service.assignRoleToUser("admin@ucn.cl", "GUEST"),
    (error) => error instanceof AuthError && error.code === "INVALID_INPUT"
  );
});

test("RolesManagementService.removeRoleFromUser rejects missing user", async () => {
  const repositoryMock = {
    findUserByEmail: async () => null,
  };

  const service = new RolesManagementService(repositoryMock as never);

  await assert.rejects(
    async () => service.removeRoleFromUser("missing@ucn.cl", "ADMIN"),
    (error) => error instanceof AuthError && error.code === "RESOURCE_NOT_FOUND"
  );
});
